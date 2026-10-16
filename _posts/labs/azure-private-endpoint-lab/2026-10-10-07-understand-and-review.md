---
layout: post
title: "DGX Spark to Azure Private Endpoint: Understand and Review"
date: 2026-10-10 00:07:00 +0530
categories: [labs, azure-private-endpoint-lab]
tags: [Labs, Azure Private Endpoint Lab, Azure, Private Endpoint, WireGuard, DNS, DGX Spark, Microsoft Foundry]
description: "What the six experiments proved about reaching a private Foundry account from a DGX Spark, where a fourteen-dollar WireGuard VM stops being enough, and how to tear it all down."
lab: azure-private-endpoint-lab
lab_part: 7
image:
  path: /assets/img/labs/azure-private-endpoint-lab/07-understand-and-review.webp
  alt: "DGX Spark to Azure Private Endpoint: Understand and Review - Labs hero image"
---

This part puts the six experiments back together into one path from the DGX to the Foundry account,
lists what each one proved, and is honest about where a single VM stops being the right answer. It
ends with the commands that delete everything, so the lab stops costing money.

<!-- more -->

{% include lab-nav.html %}

## The Full Signal Path
{: #the-full-signal-path }

{% include diagram.html id="labs/azure-private-endpoint-lab/architecture" %}

Every SDK call from the DGX now takes two trips through the tunnel: first the DNS question, then
the HTTPS request.

1. **Lookup.** systemd-resolved matches `<account>.openai.azure.com` against the routing domain
   `~openai.azure.com` on `wg0` and asks `10.200.0.1`.
2. **Forward.** dnsmasq on the VM asks Azure DNS (`168.63.129.16`), the only resolver that sees the
   VNet's linked private zones. The public CNAME points into `privatelink.openai.azure.com`, and the
   linked zone answers `10.60.1.5`.
3. **Connect.** The DGX routes `10.60.1.5` into `wg0`, because `10.60.0.0/16` is in `AllowedIPs`.
   The VM forwards the packet and MASQUERADE makes the source `10.60.2.4`.
4. **Allow.** The packet reaches the account through its private endpoint, so the account's
   `publicNetworkAccess: Disabled` doesn't apply, and the call returns `200`.

The probe watched the same path from the outside: DNS answer, TCP connect, TLS handshake and HTTP
status, every 10 seconds, as metrics, logs and traces.

## What the Experiments Showed
{: #what-the-experiments-showed }

| Experiment | What changed | What it proved |
|---|---|---|
| [1. Over the internet](/posts/labs/azure-private-endpoint-lab/06-experiments/#exp-baseline) | Nothing; the starting point | A private-only account answers `403 Public access is disabled` at the HTTP level. DNS and TCP both work. The public name already CNAMEs into `privatelink` |
| [2. Tunnel only](/posts/labs/azure-private-endpoint-lab/06-experiments/#exp-tunnel-up) | `wg-quick up wg0` | Routing to the endpoint's IP works, and changes nothing for the SDK, because the name still resolves public |
| [3. Split DNS](/posts/labs/azure-private-endpoint-lab/06-experiments/#exp-split-dns) | `resolvectl` routing domains on `wg0` | The cognitiveservices name went private (`200`). Names whose `privatelink` zone was missing didn't. A private call cost 3 TLS round trips at about 211 ms each |
| [4. Missing zones](/posts/labs/azure-private-endpoint-lab/06-experiments/#exp-openai-zone) | `privatelink.openai` and `privatelink.services.ai` zones | A Foundry endpoint needs three zones. Caches held the old public answer for about 13 minutes after the fix |
| [5. VM off](/posts/labs/azure-private-endpoint-lab/06-experiments/#exp-vm-deallocate) | `az vm deallocate` | The names fail closed: DNS timeouts, never a fallback to public |
| [6. VM on](/posts/labs/azure-private-endpoint-lab/06-experiments/#exp-vm-start) | `az vm start` | Full recovery about 75 seconds after the start command, with nothing touched on the DGX (once a systemd ordering cycle was fixed) |

Three things surprised me while building it, and each is now part of the lab:

- **An AIServices private endpoint has three private IPs**, one per public name. Scripts that read
  `customDnsConfigs[0]` get the wrong one for `cognitiveservices`.
- **DNS caches outlive your fix.** Azure DNS was right within a minute, and the DGX was wrong for
  13 more minutes.
- **The first boot can hide boot-order bugs.** cloud-init started the services by hand, so the
  ordering cycle appeared only on the second boot.

## Limits of This Setup
{: #limits-of-this-setup }

- **One VM, one zone, no redundancy.** If `vm-wg-pe-lab` or its zone goes down, the DGX loses the
  private path (experiment 5). That's fine for one developer machine, not for anything others rely on.
- **You patch the VM.** It's a public-facing Ubuntu host. The NSG limits it to your IP, but OS
  updates, WireGuard key rotation and SSH hardening are on you. A VPN Gateway hands that to Azure.
- **Your home IP is in the NSG.** If your ISP changes it, the tunnel stops until you re-run
  `make azure-up`. Under CGNAT you may not have a stable IPv4 address at all.
- **API key authentication.** The probe uses the account key for simplicity. Real code should use
  Microsoft Entra ID (`DefaultAzureCredential`) and the account should ideally have local auth
  disabled. Entra token requests go to `login.microsoftonline.com` over the internet, which is fine:
  only the data plane is private.
- **One client.** `AllowedIPs = 10.200.0.2/32` on the VM means exactly one peer. More machines need a
  peer block each, with its own key.
- **The Grafana stack is a lab tool.** Anonymous admin on port 3012 is fine on the DGX and nowhere else.

## Taking It to Production
{: #taking-it-to-production }

Recommendations, roughly in the order I'd do them:

1. **Cap the DNS caches you own.** Add `max-cache-ttl=30` and `max-ttl=30` to the VM's dnsmasq
   config. The first limits dnsmasq's own cache. The second limits the TTL it gives the DGX, so
   resolved re-asks within 30 seconds too. A zone change then reaches clients in under a minute
   instead of 15, for a few more lookups through the tunnel.
2. **Link every zone the service needs from the start.** For Foundry that's `privatelink.cognitiveservices.azure.com`,
   `privatelink.openai.azure.com` and `privatelink.services.ai.azure.com`, all in the endpoint's
   zone group. In a hub-and-spoke network, keep the zones central and link them to the hub, where the
   DNS forwarder lives.
3. **Use Entra ID and disable local auth** on the account.
4. **Keep the VM patched** with unattended upgrades, and remove the SSH rule from the NSG when you're
   not using it (or use Azure Bastion).
5. **Move to managed pieces when several people depend on it:** a VPN Gateway (point-to-site,
   `VpnGw1AZ` at about $157 a month) for the tunnel, and a DNS Private Resolver inbound endpoint
   ($180 a month) in place of dnsmasq. That's about $340 a month against about $14, so it's worth it
   for a team, not for one DGX.
6. **Or use Tailscale** as a subnet router on the same VM: no inbound port and no NSG rule for your
   home IP, and its split DNS can send the three domains to `168.63.129.16` from the VM. The VM still
   needs outbound internet access (its public IP or a NAT Gateway).

## Tear Down
{: #tear-down }

On the DGX first, because it needs sudo and the Azure resources are what cost money:

```sh
make dgx-down                      # wg0 down and disabled at boot; the split DNS goes with the link
sudo rm /etc/wireguard/wg0.conf
make down                          # stop Grafana and the probe, delete rg-pe-lab, purge the account
```

`make down` runs `docker compose down -v` (which deletes the telemetry), then `az group delete -n
rg-pe-lab`, which removes the VM, disk, public IP, NSG, VNet, private endpoint, all three zones and
the Foundry account. A deleted AIServices account stays soft-deleted for 48 hours and keeps its name,
so `down.sh` purges it as well. The WireGuard and SSH keys stay in `.state/`. Delete that folder too
if you're done for good.

If you only want to stop paying for compute, `make vm-stop` deallocates the VM and leaves the rest:
about $6 a month for the IP and the disk, and `make vm-start` brings it back as in experiment 6.

## Go Further
{: #go-further }

- **Same pattern, other private endpoints.** Add the domain to the `resolvectl domain` list and the
  zone to the VNet: Key Vault (`~vaultcore.azure.net`), Storage (`~blob.core.windows.net`), Azure AI
  Search (`~search.windows.net`). Each has its own `privatelink` zone.
- **Call a model.** Deploy a model in the account and point the OpenAI SDK at
  `https://<account>.openai.azure.com`. Watch the probe's latency panel next to your own request times.
- **Try the fallback policy.** Set `--resolution-policy NxDomainRedirect` on a zone's VNet link and
  repeat the zone reset from experiment 4. Names missing from the zone should then fall back to public
  answers instead of failing.
- **Compare with the clouds next door.** The same two halves (a route in, a private answer) apply to
  AWS PrivateLink with Route 53 private hosted zones and to GCP Private Service Connect.
- Background reading on this blog: [Azure - Private Endpoints](/posts/cloud/azure/networking/private-endpoints/),
  [Azure - Virtual Private Network (VPN)](/posts/cloud/azure/networking/virtual-private-network/).

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>A colleague says "the private endpoint works, I tested it from a VM in the VNet". Your SDK on the DGX still gets 403. Name two reasons.</summary>

First, the DGX may not be sending that domain to the VNet's DNS at all (no routing domain, or the
tunnel is down), so it resolves the public chain. Second, the colleague may have tested the
cognitiveservices name while your SDK calls `<account>.openai.azure.com`, whose `privatelink` zone
is missing. A third possibility is a cache still holding the old public answer.

</details>

<details markdown="1">
<summary>What does this setup cost per month if you deallocate the VM every night for 12 hours?</summary>

Compute is billed only while the VM runs: about 365 hours × $0.0104 ≈ $3.80. The static IP ($3.65)
and the disk ($2.40) are billed all month, so the total is about $9.85 for the connectivity, plus the
private endpoint and zones if they're yours to pay for.

</details>

<details markdown="1">
<summary>Why is the VM's NSG rule for UDP 51820 tied to your home IP, and what does that cost you?</summary>

It keeps the WireGuard port invisible to the rest of the internet, which is cheap defence in depth
on top of WireGuard's own key checks. The cost is that a change of home IP silently stops the tunnel
until you update the rule (`make azure-up`).

</details>

<details markdown="1">
<summary>When would you replace dnsmasq with a DNS Private Resolver?</summary>

When more than one network or several people depend on resolving private zones from outside Azure,
and you want a managed, zone-redundant service instead of a process on one VM. At $180 a month for
the inbound endpoint, it's a team decision, not a single-developer one.

</details>

{% include lab-nav.html %}
