---
layout: post
title: "My Homelab in 3D: Inside the DGX Spark and the Homelab PC"
date: 2026-10-26 15:00:00 +0530
categories: [homelab]
tags: [HomeLab, DGXSpark, Hardware, Networking, Tailscale, Ollama]
image:
  path: /assets/img/homelab/homelab-setup-3d-dgx-spark-home-pc.webp
  alt: "Cover: My Homelab in 3D, inside the DGX Spark and the homelab PC"
description: "An interactive 3D tour of my desk, an exploded DGX Spark and an i9 + RTX 5070 Ti homelab PC, plus how the two machines split the work and reach the internet."
---

What actually runs the Cloudutsuk Platform? Two boxes on and under one desk: an NVIDIA DGX Spark the size of a paperback stack, and an Intel tower with an RTX card and pink fans. Instead of another spec list, I've built this post around interactive 3D models you can spin, zoom and take apart, with every part clickable for its real specs. At the end there's a network map showing how the two machines reach each other and the internet without a single open port on my router.

<!-- more -->

## The desk

Start with the whole setup. Drag to orbit, hold Ctrl and scroll (or pinch) to zoom, and click anything. Turn on **Cables** to see which machine feeds which monitor; the dots show the direction of the signal.

{% include scene3d.html id="homelab/homelab-desk" %}

A few things the model makes obvious that a photo doesn't:

- **Two machines share two monitors.** The LG HDR WQHD (3440×1440) and the LG UltraWide (2560×1080) each have two inputs in use. The Spark reaches both through a Targus DisplayLink dock, and the PC reaches them directly: the WQHD from the motherboard's DisplayPort, the UltraWide from the RTX card's HDMI. Switching machines is an input button on the monitor, not a cable swap.
- **The Spark sits on the desk, the PC sits under it.** The Spark is 150 mm square and lives under the main monitor. The tower stands on a wooden caddy with castors, next to an older Cooler Master case that isn't part of the setup.
- **One keyboard and mouse drive both machines.** The Spark's keyboard and Sharkoon vertical mouse are shared with the PC over an encrypted Input Leap link, so the pointer just slides from one screen to the next. The PC's own Logi Bolt receiver and Sharkoon keyboard are still plugged in too. The setup is in [A Virtual KVM for Two Servers with Input Leap](/posts/homelab/virtual-kvm-two-servers-input-leap/).

If you're wondering how the DisplayLink dock works on an ARM box at all, that was its own afternoon: [Getting a Targus DisplayLink Dock Working on the NVIDIA DGX Spark](/posts/homelab/targus-displaylink-dock-dgx-spark/).

## Who does what

Here's the rule I settled on, and it shapes everything else in this post:

> **The DGX Spark runs anything that has to be up 24x7**: the local LLMs and the platform tools (identity, secrets, GitOps, monitoring). **The homelab PC takes the time-bound work**: projects like Shorts Studio and Job Hunter that run for a while, then get torn down.
{: .prompt-info }

The reasoning is mostly about blast radius. The Spark's clusters are the foundation: Keycloak, OpenBao, Argo CD, Grafana. If a project experiment eats all the memory or wedges Docker, I don't want my sign-in, my secrets and my dashboards going down with it. Today the project apps still live in the `platform` cluster on the Spark (you'll see `job-hunter` and `shorts-studio` namespaces there), and moving them to the PC is the next step.

There's a hardware argument too. The Spark's 128 GB of unified memory is the scarce, valuable thing: it's what lets a single box hold models that would never fit on a 16 GB gaming card. Spending it on a Postgres for a side project is a waste. The PC has 96 GB of ordinary DDR5 and 24 fast x86 cores, which is exactly what build-heavy, short-lived workloads want.

| | DGX Spark | Homelab PC |
|---|---|---|
| Role | 24x7: LLMs and platform tools | Time-bound projects, Ollama |
| CPU | 20 Arm cores (10× X925 + 10× A725) | i9-14900KS, 24C / 32T, 6.2 GHz |
| Memory | 128 GB LPDDR5X unified, 273 GB/s | 96 GB DDR5 (2× 48 GB) |
| GPU | Blackwell (GB10), shares system memory | RTX 5070 Ti, 16 GB GDDR7 |
| Storage | 4 TB NVMe (653 GB used) | 2 TB NVMe (244 GB used) |
| OS | DGX OS (Ubuntu 24.04.4) | Ubuntu 26.04 LTS |
| Network | Wi-Fi 7, 192.168.1.19 | Wi-Fi 6, 192.168.1.10 |
| Architecture | `aarch64` | `x86_64` |

That last row matters more than it looks. Anything I build on the Spark is an ARM image; anything on the PC is x86. Multi-arch builds stop being a nice-to-have once you have both.

## Inside the DGX Spark

Pull the **Explode** slider to lift the lid, cooler and superchip off the board. The internal layout is a simplified schematic (I haven't opened mine), but the outer size, the ports and every spec in the side panel are real: NVIDIA's published numbers, cross-checked against `lscpu`, `free` and `nvidia-smi` on the machine.

{% include scene3d.html id="homelab/dgx-spark-exploded" %}

The part worth clicking is the **GB10**. CPU and GPU sit on one package and share one 128 GB pool of LPDDR5X. In practice that means:

- **Capacity is generous, bandwidth is not.** 273 GB/s is a fraction of what a discrete GPU's GDDR7 delivers. Big dense models fit, but tokens per second are bounded by memory bandwidth. Mixture-of-experts models and smaller dense models feel much better than their parameter count suggests.
- **`nvidia-smi` shows no GPU memory total.** You'll see `[N/A]` for memory, because there's no separate VRAM. Linux sees 121 GiB, and the GPU borrows from the same pool. That's why idle model servers on the `ai` cluster scale to zero with KEDA instead of holding memory nobody is using.
- **It idles at about 7 W on the GPU.** That's the real reason it gets the 24x7 jobs.

Check the **Rear I/O** too. The Spark has a 10 GbE port and a ConnectX-7 with two QSFP cages, and right now none of them is connected. Everything goes over Wi-Fi. That's fine for one box talking to the internet. It gets less fine once the two machines start talking to each other a lot (more on that below).

## Inside the homelab PC

Same controls. The case, CPU cooler and PSU are generic shapes because I haven't recorded their models; everything else came straight off the machine over SSH.

{% include scene3d.html id="homelab/homelab-pc-exploded" %}

The board is the interesting choice: an **ASUS Pro WS W680-ACE IPMI**, a workstation board with an IPMI card and ECC support. For a PC that's going to host clusters, out-of-band management is a genuinely useful extra: you can power-cycle a hung box without walking over to it.

Two details I only noticed while building this model:

1. **The RAM runs at 4800 MT/s, not 5200.** The kit is G.Skill F5-5200J4040A48G (DDR5-5200 CL40), but `udevadm` reports 4800. Two of the four slots are free, so the board can still go to 192 GB.
2. **The RTX doesn't drive the main monitor.** The LG HDR WQHD hangs off the motherboard's DisplayPort, which is the Intel UHD 770 inside the i9. Only the UltraWide is on the RTX's HDMI.

The RTX 5070 Ti runs [Ollama](/posts/homelab/local-llms-on-homepc/) with qwen3-coder 30b, qwen3 32b, deepseek-r1 32b and the gemma4 models. The 30B-class models are 17 to 20 GB, more than the card's 16 GB, so Ollama splits them between VRAM and system RAM. That's where the 96 GB and the fast i9 earn their keep. Ollama only listens on `127.0.0.1:11434`, so it's local to the PC for now.

You can check all of this on your own Linux box without root:

```bash
lscpu | grep -E 'Model name|^CPU\(s\)|max MHz'
cat /sys/class/dmi/id/board_vendor /sys/class/dmi/id/board_name
# RAM kit and speed per slot, readable without sudo on recent systemd
udevadm info -e | grep -E 'MEMORY_DEVICE_[0-9]+_(LOCATOR|SIZE|SPEED_MTS|PART_NUMBER)='
nvidia-smi --query-gpu=name,memory.total,power.limit --format=csv
lsblk -d -o NAME,SIZE,MODEL,TRAN
# which GPU drives which display output
for c in /sys/class/drm/card[0-9]; do echo "$(basename $c) $(basename $(readlink $c/device/driver))"; done
```

## How it's all connected

The 3D models show hardware; this map shows traffic. Click a machine to open it, click an arrow for the protocol, port and certificate on that hop, or pick a use case on the left and press play.

{% include diagram.html id="homelab/homelab-network" %}

The key design choice is that **nothing on the internet connects in**. The router has no port forwards. Two outbound paths do all the work:

- **Tailscale for me.** My phone and laptop join a tailnet, and `tailscaled` on the Spark advertises the cluster bridge `172.30.0.0/24` as a subnet route. Internal names like `grafana.mon.home.cloudutsuk.com` resolve to those private addresses and travel inside WireGuard.
- **A Cloudflare Tunnel for anything public.** `cloudflared` runs on the Spark's host, not inside a cluster, and holds a QUIC connection open to Cloudflare's Mumbai edges. Public names like `auth.cloudutsuk.com` come back down that tunnel, after Cloudflare Access has checked who's asking. The reasons it sits on the host are in [ADR 0058](/posts/projects/cloudutsuk-platform/architecture-decision-records/).

The PC's side of the map is mostly amber, meaning planned. The project clusters will be deployed by the Spark's Argo CD and send telemetry to the Spark's `mon` cluster, exactly like the lab clusters do today. The step list is in the [product planning post](/posts/projects/cloudutsuk-platform/03-product-planning/).

## Things that bit me while documenting this

Writing this post was supposed to be a quick inventory. A few things turned up anyway:

- **Tailscale remembered a machine that no longer exists.** The tailnet still listed `homepc` as a Windows node, offline for 151 days. The PC had been reinstalled with Ubuntu since then and never rejoined. A stale node is harmless until you try to SSH to it by name and wonder why it times out. The CLI can't delete another node, so it has to go from the [admin console](https://login.tailscale.com/admin/machines).
- **`known_hosts` was full of ghosts.** Hashed entries (`|1|…`) don't tell you which host they belong to. `ssh-keygen -F <host>` does, so check each candidate name before deleting anything.
- **OpenSSH quietly rewrote my `known_hosts`.** I tested the new entries with `-o HostKeyAlgorithms=ssh-ed25519`, and OpenSSH's `UpdateHostKeys` (on by default) pruned the RSA and ECDSA keys it hadn't been offered. If you're verifying host keys, connect normally afterwards and check that all three are still there:

```bash
ssh-keygen -F 192.168.1.10 -l      # list what's pinned for a host
ssh-keyscan 192.168.1.10 2>/dev/null | ssh-keygen -l -f -   # what the host offers now
```

- **The wired ports are all dark.** Both machines are on Wi-Fi, while the Spark has 10 GbE and the PC has two 2.5 GbE ports doing nothing. For internet traffic that's fine. Once Argo CD on the Spark deploys to clusters on the PC and the PC ships telemetry back, a short cable between them is the cheapest upgrade on this desk.

## What's next

1. **Move Shorts Studio and Job Hunter to the PC.** That's the whole point of the split above.
2. **Add the PC as extra model capacity.** The platform plan already allows a second machine as one more LiteLLM route, so callers could reach the RTX models through the same endpoint as the Spark's vLLM models.
3. **Consider wiring the two machines together.** A direct cable or a small 2.5 GbE switch would keep Spark ↔ PC traffic off the Wi-Fi.

## Conclusion

Two machines, one rule: the Spark keeps the lights on, the PC does the work that comes and goes. If you're planning a similar setup, decide which machine is your always-on foundation before you deploy anything to it. Moving the foundation later is far harder than moving a project.

The 3D viewer behind this post is reusable. Each scene is a YAML file of parts and specs, so if you'd like your own rig modelled the same way, the data format is documented at the top of the include.

## References

- [NVIDIA DGX Spark specifications](https://www.nvidia.com/en-us/products/workstations/dgx-spark/)
- [ASUS Pro WS W680-ACE IPMI tech specs](https://www.asus.com/motherboards-components/motherboards/workstation/pro-ws-w680-ace-ipmi/techspec/)
- [Tailscale subnet routers](https://tailscale.com/kb/1019/subnets)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [three.js](https://threejs.org/), which renders the 3D scenes
