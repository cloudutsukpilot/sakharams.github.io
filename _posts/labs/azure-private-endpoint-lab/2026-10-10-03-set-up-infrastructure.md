---
layout: post
title: "DGX Spark to Azure Private Endpoint: Set Up the Infrastructure"
date: 2026-10-10 00:03:00 +0530
categories: [labs, azure-private-endpoint-lab]
tags: [Labs, Azure Private Endpoint Lab, Azure, Private Endpoint, WireGuard, DNS, DGX Spark, Microsoft Foundry]
description: "Every az CLI command that builds the VNet, the private Foundry account, its private endpoint and DNS zone, and the WireGuard VM, plus the VM's cloud-init and the DGX's wg0.conf."
lab: azure-private-endpoint-lab
lab_part: 3
image:
  path: /assets/img/labs/azure-private-endpoint-lab/03-set-up-infrastructure.webp
  alt: "DGX Spark to Azure Private Endpoint: Set Up the Infrastructure - Labs hero image"
---

This part goes through every `az` command the lab runs, in order, and the two config files that turn
a stock Ubuntu VM and your DGX into the two ends of a tunnel. There's no Kubernetes here. The "cluster"
is an Azure VNet and the "manifests" are a cloud-init file and a `wg0.conf`. By the end of it you'll
know what each resource is for and which settings the experiments depend on.

<!-- more -->

{% include lab-nav.html %}

## The Cluster
{: #the-cluster }

In this lab the role of the cluster is played by one resource group, `rg-pe-lab`, holding one VNet.
Everything is created by `infra/up.sh` with the names and address ranges from `infra/lib.sh`:

```bash
LOCATION="${LOCATION:-eastus}"
RG="${RG:-rg-pe-lab}"
VNET="${VNET:-vnet-pe-lab}"
VNET_CIDR="${VNET_CIDR:-10.60.0.0/16}"
PE_SUBNET="${PE_SUBNET:-snet-pe}"
PE_SUBNET_CIDR="${PE_SUBNET_CIDR:-10.60.1.0/24}"
VPN_SUBNET="${VPN_SUBNET:-snet-vpn}"
VPN_SUBNET_CIDR="${VPN_SUBNET_CIDR:-10.60.2.0/28}"
```

Pick a VNet range that doesn't overlap your home network or anything else the DGX routes. `wg-quick`
will add a route for the whole `/16`. On my DGX the only private routes were `192.168.1.0/24` (home)
and Docker's `172.17-19.0.0/16`, so `10.60.0.0/16` was free (`ip route` shows yours).

**1. Resource group and VNet.**

```bash
az group create -n "$RG" -l "$LOCATION" -o none
az network vnet create -g "$RG" -n "$VNET" --address-prefixes "$VNET_CIDR" \
  --subnet-name "$PE_SUBNET" --subnet-prefixes "$PE_SUBNET_CIDR" -o none
```

**2. The Foundry account, then public access off.**

```bash
az cognitiveservices account show -g "$RG" -n "$ACCOUNT" -o none 2>/dev/null ||
  az cognitiveservices account create -g "$RG" -n "$ACCOUNT" -l "$LOCATION" \
    --kind AIServices --sku S0 --custom-domain "$ACCOUNT" --yes -o none
ACCOUNT_ID=$(az cognitiveservices account show -g "$RG" -n "$ACCOUNT" --query id -o tsv)
az resource update --ids "$ACCOUNT_ID" --set properties.publicNetworkAccess=Disabled -o none
```

`--custom-domain` gives the account its own names (`<account>.cognitiveservices.azure.com` and the
other two), which private endpoints require. The name gets a random suffix (`pelab-3d07e659` in my
run) because it must be globally unique. The `show ||` guard is there because running `create`
again on an account whose public access is already disabled fails with `PublicNetworkAccess is
required for this resouce` (sic). I hit that on my second run.

**3. The private endpoint and one DNS zone.**

```bash
az network private-endpoint create -g "$RG" -n "$PE" \
  --vnet-name "$VNET" --subnet "$PE_SUBNET" \
  --private-connection-resource-id "$ACCOUNT_ID" --group-id account \
  --connection-name "$PE-conn" -o none
ZONE=privatelink.cognitiveservices.azure.com
ensure_zone "$ZONE"
az network private-endpoint dns-zone-group create -g "$RG" --endpoint-name "$PE" -n default \
  --private-dns-zone "$ZONE" --zone-name cognitiveservices -o none
```

`ensure_zone` (in `lib.sh`) creates the zone and **links it to the VNet**:

```bash
ensure_zone() {
  az network private-dns zone show -g "$RG" -n "$1" -o none 2>/dev/null ||
    az network private-dns zone create -g "$RG" -n "$1" -o none
  az network private-dns link vnet show -g "$RG" -z "$1" -n "link-$VNET" -o none 2>/dev/null ||
    az network private-dns link vnet create -g "$RG" -z "$1" -n "link-$VNET" \
      -v "$VNET" --registration-enabled false -o none
}
```

Two things here are easy to get wrong, and the second one is left wrong on purpose:

- **The VNet link.** A private DNS zone with no virtual network links is invisible to everything.
  Azure DNS (`168.63.129.16`) consults a private zone only for queries coming from a VNet linked to
  it. If your zones show `virtual_network_links: []`, no forwarder in that VNet can ever return a
  private answer.
- **One zone is not enough for Foundry.** The `account` sub-resource of an `AIServices` account
  serves three names, and the endpoint gets **one private IP per name**. In my run:

  ```text
  $ az network nic show --ids $PE_NIC --query "ipConfigurations[].{ip:privateIPAddress, fqdns:join(',',privateLinkConnectionProperties.fqdns), member:privateLinkConnectionProperties.requiredMemberName}" -o table
  Ip         Fqdns                                       Member
  ---------  ------------------------------------------  ---------
  10.60.1.4  pelab-3d07e659.cognitiveservices.azure.com  default
  10.60.1.5  pelab-3d07e659.openai.azure.com             secondary
  10.60.1.6  pelab-3d07e659.services.ai.azure.com        third
  ```

  `up.sh` puts only the cognitiveservices zone in the zone group, which is how I found many real
  setups (mine included). The OpenAI SDK calls `<account>.openai.azure.com`, which then still
  resolves to the public IP. [Experiment 4](/posts/labs/azure-private-endpoint-lab/06-experiments/#exp-openai-zone)
  fixes it with `infra/fix-zones.sh`.

{% include flow-anim.html id="labs/azure-private-endpoint-lab/dns-resolution" %}

The **zone group** is what writes the A record into the zone and keeps it right if the endpoint's IP
ever changes. Without it you'd add `pelab-3d07e659 A 10.60.1.4` by hand.

**4. NSG, public IP and the VM.**

```bash
az network nsg rule create -g "$RG" --nsg-name "$NSG" -n allow-wireguard --priority 100 \
  --direction Inbound --access Allow --protocol Udp \
  --source-address-prefixes "$MYIP/32" --destination-port-ranges "$WG_PORT" -o none
az network nsg rule create -g "$RG" --nsg-name "$NSG" -n allow-ssh --priority 110 \
  --direction Inbound --access Allow --protocol Tcp \
  --source-address-prefixes "$MYIP/32" --destination-port-ranges 22 -o none
az network vnet subnet create -g "$RG" --vnet-name "$VNET" -n "$VPN_SUBNET" \
  --address-prefixes "$VPN_SUBNET_CIDR" --nsg "$NSG" -o none
az network public-ip create -g "$RG" -n "$PIP" --sku Standard --allocation-method Static -o none
```

`$MYIP` is your public IPv4 from `api.ipify.org`. My DGX's default route to the internet is IPv6,
which is why the lookup forces `curl -4`: WireGuard connects to the VM's IPv4 address, so the NSG
sees your IPv4 address as the source. If your ISP changes it, re-run `make azure-up` to update the
rules.

```bash
  az vm create -g "$RG" -n "$VM" --image "$VM_IMAGE" --size "$VM_SIZE" \
    --vnet-name "$VNET" --subnet "$VPN_SUBNET" --private-ip-address "$VM_PRIVATE_IP" \
    --public-ip-address "$PIP" --nsg "" \
    --storage-sku StandardSSD_LRS --os-disk-size-gb 32 \
    --admin-username azureuser --ssh-key-values "$STATE/ssh.pub" \
    --custom-data "$STATE/cloud-init.yaml" -o none
```

`--nsg ""` stops `az vm create` from making a second NSG on the NIC; the subnet's one is enough.
The **Standard static** public IP matters for [Experiment 6](/posts/labs/azure-private-endpoint-lab/06-experiments/#exp-vm-start):
it keeps its address when the VM is deallocated, so the DGX's `Endpoint =` line stays valid.

The size is `Standard_B1s` because that's the B-series family my subscription had quota for.
My first `az vm create` with `Standard_B2pts_v2` failed with `QuotaExceeded ... standardBpsv2Family
Cores quota ... Current Limit: 0`. If you hit an unreadable `RuntimeError: The content for this
response was already consumed` from `az vm create`, add `--validate --debug` and look for the inner
`QuotaExceeded`.

**No IP forwarding on the NIC.** The brief I started from enabled IP forwarding on the VM's NIC. With
MASQUERADE you don't need it: every packet the VM sends into the VNet has the VM's own address as
its source, and every reply comes back to that address. Azure's NIC setting is needed only when a VM
sends or receives packets for addresses that aren't its own, for example if you dropped the NAT
and used a route table pointing `10.200.0.0/24` at the VM. The lab never enables it, and the probe
gets its `200`s anyway.

## Application Manifests
{: #application-manifests }

Two files configure the two ends of the tunnel.

### The VM: `infra/cloud-init.yaml`

`up.sh` fills in the keys and addresses and passes the file as custom data, so the VM is configured
on first boot without anyone logging in:

```yaml
packages:
  - wireguard-tools
  - dnsmasq
  - iptables

write_files:
  # Route traffic arriving from the tunnel on to the VNet.
  - path: /etc/sysctl.d/99-wg-forward.conf
    content: |
      net.ipv4.ip_forward = 1

  - path: /etc/wireguard/wg0.conf
    permissions: "0600"
    content: |
      [Interface]
      Address    = __WG_VM_IP__/24
      ListenPort = __WG_PORT__
      PrivateKey = __VM_PRIVATE_KEY__
      PostUp     = iptables -t nat -A POSTROUTING -s __WG_NET__ -o eth0 -j MASQUERADE
      PostDown   = iptables -t nat -D POSTROUTING -s __WG_NET__ -o eth0 -j MASQUERADE

      [Peer]
      # the DGX Spark
      PublicKey  = __DGX_PUBLIC_KEY__
      AllowedIPs = __WG_DGX_IP__/32

  - path: /etc/dnsmasq.d/pe-lab.conf
    content: |
      listen-address=__WG_VM_IP__
      bind-dynamic
      except-interface=lo
      no-resolv
      server=168.63.129.16
      log-queries
      log-facility=/var/log/dnsmasq.log
```

| Setting | Why |
|---|---|
| `net.ipv4.ip_forward = 1` | Lets the kernel pass packets from `wg0` out of `eth0` |
| `MASQUERADE` for `10.200.0.0/24` out of `eth0` | The private endpoint sees `10.60.2.4` as the source, so replies need no route back to the tunnel network. Tying it to `PostUp`/`PostDown` keeps the rule in step with the tunnel |
| `AllowedIPs = 10.200.0.2/32` on the VM | The VM accepts packets from the DGX only if they come from its tunnel address |
| `listen-address` + `bind-dynamic` + `except-interface=lo` | dnsmasq answers only on the tunnel address and leaves `127.0.0.53` to the VM's own systemd-resolved (Ubuntu's default would make the two fight over port 53) |
| `no-resolv` + `server=168.63.129.16` | One upstream, Azure DNS, the only resolver that sees the linked zones |

`runcmd` enables `wg-quick@wg0` and restarts dnsmasq. There's deliberately no ordering between the
two units: `bind-dynamic` makes dnsmasq bind `10.200.0.1` whenever `wg0` appears. My first version
added `After=wg-quick@wg0.service` to dnsmasq, which creates an ordering cycle through
`nss-lookup.target`, and systemd silently skipped WireGuard on every boot after the first
([Experiment 6](/posts/labs/azure-private-endpoint-lab/06-experiments/#exp-vm-start)). The WireGuard keys come from `infra/keys.sh`, which makes both pairs on the DGX
with Python's `cryptography` (the same Curve25519 keys `wg genkey` makes) before `wireguard-tools`
is installed anywhere.

You can check the result over SSH (`make vm-ssh`). From my run:

```text
$ sudo iptables -t nat -S POSTROUTING
-P POSTROUTING ACCEPT
-A POSTROUTING -s 10.200.0.0/24 -o eth0 -j MASQUERADE
$ sudo ss -lunp | grep ':53 '
UNCONN 0      0          10.200.0.1:53         0.0.0.0:*    users:(("dnsmasq",pid=2686,fd=4))
UNCONN 0      0          127.0.0.54:53         0.0.0.0:*    users:(("systemd-resolve",pid=487,fd=16))
UNCONN 0      0       127.0.0.53%lo:53         0.0.0.0:*    users:(("systemd-resolve",pid=487,fd=14))
```

### The DGX: `wg0.conf`

`dgx/render.sh` writes `.state/wg0.conf` from `lab.env`. The tunnel-only version, used in experiment 2:

```ini
[Interface]
PrivateKey = <dgx private key>
Address    = 10.200.0.2/32

[Peer]
PublicKey  = OWcvAw0eW83wZR08sN8GT7F2ZAGdSqTnOqGApKFzimE=
Endpoint   = 20.102.50.119:51820
AllowedIPs = 10.200.0.1/32, 10.60.0.0/16
PersistentKeepalive = 25
```

`AllowedIPs` lists only the VM's tunnel address and the VNet, so `wg-quick` adds two routes and
everything else stays on your home connection. `PersistentKeepalive = 25` sends a packet every 25
seconds, which keeps your home router's NAT entry open so the VM can always reach the DGX.

There's no `DNS =` line on purpose. With one, `wg-quick` would make the VM the DNS server for
*every* name. `render.sh --dns` (used by `make dgx-persist`) adds split DNS instead:

```ini
PostUp     = resolvectl dns %i 10.200.0.1; resolvectl domain %i ~cognitiveservices.azure.com ~openai.azure.com ~services.ai.azure.com; resolvectl default-route %i false
```

`resolvectl` settings belong to the link, so they vanish whenever `wg0` goes away. Running them in
`PostUp` reapplies them every time the tunnel comes up, including at boot with
`systemctl enable wg-quick@wg0`. `default-route false` says explicitly that `wg0` is not a
place to send names that match no routing domain.

This is the setup to keep once the experiments are done. From my run, after `make dgx-persist`:

```text
$ make dgx-persist
bash dgx/render.sh --dns
sudo install -m 600 -D .state/wg0.conf /etc/wireguard/wg0.conf
sudo wg-quick down wg0 2>/dev/null || true
sudo systemctl enable --now wg-quick@wg0
Created symlink /etc/systemd/system/multi-user.target.wants/wg-quick@wg0.service → /usr/lib/systemd/system/wg-quick@.service.
resolvectl status wg0
Link 116 (wg0)
    Current Scopes: DNS
         Protocols: -DefaultRoute -LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
       DNS Servers: 10.200.0.1
        DNS Domain: ~cognitiveservices.azure.com ~openai.azure.com ~services.ai.azure.com
$ make dgx-status
pelab-3d07e659.cognitiveservices.azure.com       10.60.1.4
pelab-3d07e659.openai.azure.com                  10.60.1.5
pelab-3d07e659.services.ai.azure.com             10.60.1.6
```

`-DefaultRoute` and the three routing domains came from `PostUp`, not from a manual `resolvectl`.
With the tunnel up, all three names returned `200` from their private IPs, while `github.com` still
resolved through the home router to its public address.

## Observability Stack
{: #observability-stack }

There's no OpenTelemetry Collector in this lab. The probe pushes OTLP straight into
`grafana/otel-lgtm` 0.35.0, whose built-in collector fans it out to Prometheus, Loki and Tempo:

```yaml
  lgtm:
    image: grafana/otel-lgtm:0.35.0
    ports:
      - "3012:3000"     # Grafana (anonymous admin)
      - "14318:4318"    # OTLP/HTTP in, for the probe on the host network
    volumes:
      # Mounted as a directory so Grafana's file provider picks up edits without a restart.
      - ./dashboards:/otel-lgtm/lab-dashboards:ro
      - ./dashboard-provider.yaml:/otel-lgtm/grafana/conf/provisioning/dashboards/lab-dashboard.yaml:ro
```

The OTLP port is published on the host as `14318`, not `4318`, so it can't collide with another
collector on the DGX. The probe, on the host network, sends to `http://localhost:14318`. The dashboard
(`uid: azure-pe-lab`) is provisioned from a file into the **Labs** folder and reloaded every 10 seconds.

The stat panels in the top row use **instant** queries. My first capture used range queries, and
the "after" screenshots showed the old value: a probe value that flipped five seconds before the
screenshot fell just outside the last 15-second step. Instant queries are evaluated at the exact
moment the dashboard asks.

The two timeline panels (**Where each name resolves**, **HTTP status over time**) use a fixed colour
mode, so each value mapping supplies its own colour and label. With the default threshold colouring,
Grafana's state timeline labelled every bar with its threshold range ("-∞+"), drew it grey and ignored
the mappings. That ruined my first timelapse of experiment 4.

## Ports and Endpoints
{: #ports-and-endpoints }

| What | Address | Exposed how |
|---|---|---|
| Grafana | <http://localhost:3012/d/azure-pe-lab/> | Docker port 3012 → 3000, anonymous admin, DGX only |
| OTLP/HTTP into LGTM | `localhost:14318` | Docker port 14318 → 4318 |
| WireGuard on the VM | `<VM public IP>:51820/udp` | Standard static public IP, NSG allows your IPv4 only |
| SSH to the VM | `<VM public IP>:22` | Same NSG; key in `.state/ssh` (`make vm-ssh`) |
| dnsmasq | `10.200.0.1:53` | Tunnel address only |
| Azure DNS | `168.63.129.16:53` | From inside the VNet only |
| Private endpoint | `10.60.1.4` / `.5` / `.6` `:443` | Through the tunnel, NATed by the VM |
| Foundry data plane | `https://<account>.{cognitiveservices,openai,services.ai}.azure.com` | Public names, private answers |

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>You see your zone in the portal with the right A record, but nothing in the VNet resolves it privately. What do you check first?</summary>

The zone's virtual network links. Azure DNS answers from a private zone only for VNets linked to it,
and a zone with no links is never consulted, however correct its records are.

</details>

<details markdown="1">
<summary>Why doesn't the lab need a route table (UDR) in the VNet?</summary>

MASQUERADE rewrites the source of everything from the tunnel to the VM's own `10.60.2.4`. The
private endpoint replies to `10.60.2.4`, which the VNet already knows. Without NAT, the replies
would go to `10.200.0.2`, which the VNet has no route for. You'd then need a UDR pointing
`10.200.0.0/24` at the VM, and IP forwarding enabled on its NIC.

</details>

<details markdown="1">
<summary>What breaks if you put DNS = 10.200.0.1 in the DGX's wg0.conf?</summary>

`wg-quick` would make the VM the resolver for every name the DGX looks up. All your DNS would cross
the tunnel, slower than your router and dead whenever the VM is off. Routing domains (`~domain`)
send only the three Azure AI suffixes there.

</details>

<details markdown="1">
<summary>Why is the public IP Standard and static rather than dynamic?</summary>

A dynamic IP is released when the VM is deallocated and usually comes back different, which would
break the `Endpoint =` line on the DGX after every stop and start. Basic SKU public IPs are also
retired, so Standard is the only choice for a new one anyway.

</details>

{% include lab-nav.html %}
