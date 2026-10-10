---
layout: post
title: AI Infrastructure Interview Questions
categories: [mlops]
tags: [MLOps, GPU, Kubernetes, Interview Questions]
description: AI infrastructure interview questions by topic and difficulty - GPU fundamentals, GPU scheduling on Kubernetes, distributed training, inference and serving, GPU observability and cost - with answers
interview_domain: ai-infra
interview_topic: AI Infrastructure Fundamentals
interview_sections:
  AI Infrastructure Fundamentals: { topic: AI Infrastructure Fundamentals }
  "AI Infrastructure Fundamentals: Advanced": { kind: scenario }
  GPU Scheduling: { topic: GPU Scheduling }
  "GPU Scheduling: Advanced": { kind: scenario }
  Distributed Training: { topic: Distributed Training }
  "Distributed Training: Advanced": { kind: scenario }
  "Inference & Serving": { topic: Inference & Serving }
  "Inference & Serving: Advanced": { kind: scenario }
  "GPU Observability & Cost": { topic: GPU Observability & Cost }
  "GPU Observability & Cost: Intermediate":
    questions:
      2: { kind: scenario }
  "GPU Observability & Cost: Advanced": { kind: scenario }
---

## AI Infrastructure Interview Questions

Questions for platform, DevOps and MLOps interviews where the workload is AI, grouped by topic and graded by
difficulty: what changes with GPUs, scheduling and sharing them on Kubernetes, distributed training, serving
models, and keeping expensive GPUs busy and visible.

- **Beginner**: definitions and the "why"; expected of anyone starting in the area.
- **Intermediate**: how things work and the trade-offs; expected of an engineer who works with them day to day.
- **Advanced**: senior level; production scenarios across several layers.
- **Expert**: staff / lead level; design at scale, guardrails for many teams, judgment.

<!-- more -->

Pick a topic and a level to jump to its questions:

{% include interview-tiles.html %}

Other interview question banks: [DevOps](/posts/devops/interview%20questions/devops-interview-questions/),
[SRE](/posts/devops/sre/sre-interview-questions/), [Kubernetes](/posts/devops/orchestration/kuberentes/kuberentes-interview-questions/),
[Cloud](/posts/cloud/cloud-interview-questions/), [Networking](/posts/networking/networking-interview-questions/),
[AI Infrastructure](/posts/mlops/ai-infrastructure-interview-questions/), [DevSecOps](/posts/devsecops/devsecops-interview-questions/),
[Cloud Security Architect](/posts/architect/cloud%20security/cloud-security-architect-interview-questions/),
[System Design](/posts/architect/system%20design/system-design-interview-questions/), and
[all questions by domain and difficulty](/tags/interview-questions/).

## AI Infrastructure Fundamentals

### AI Infrastructure Fundamentals: Beginner

1. Why are GPUs used for AI workloads instead of CPUs, and which GPU specs matter most?

    - Training and inference are dominated by large matrix multiplications, which GPUs run on thousands of cores in parallel (plus Tensor Cores built for them)
    - CPUs have few, fast general-purpose cores; good for control flow and data preparation, slow for dense maths at this scale
    - **VRAM** (GPU memory) decides which models fit: weights, activations, optimizer state for training, KV cache for LLM inference
    - **Memory bandwidth** (HBM) often limits LLM inference more than raw compute
    - **Interconnect** (NVLink within a node, InfiniBand or RoCE between nodes) decides how well multi-GPU training scales
    - Precision support (FP16, BF16, FP8) trades accuracy for speed and memory

### AI Infrastructure Fundamentals: Intermediate

1. What changes when DevOps meets GPU infrastructure?

    - Cost of idling: a CPU node at 30% is fine; a $30/hour GPU sitting idle is a financial incident
    - Cost of restarts: a distributed training worker restart can lose the whole run
    - Scheduling: GPU type, VRAM, topology, MIG slices, node affinity, GPU Operator, locality
    - Networking: NCCL, RDMA, InfiniBand, cross-node bandwidth, collective communication
    - Observability: GPU util, VRAM, tensor-core usage, thermals, power, PCIe/NVLink, training throughput
    - FinOps: a badly scheduled GPU fleet wastes thousands before lunch

2. What should a DevOps engineer learn for the next 2–3 years of AI infra?

    - Kubernetes GPU scheduling, NVIDIA GPU Operator, CUDA fundamentals
    - NCCL, DCGM, Prometheus/Grafana GPU metrics
    - KServe / vLLM, Ray, inference architecture
    - GPU FinOps

### AI Infrastructure Fundamentals: Advanced

1. How would you handle CUDA driver upgrades without disrupting thousands of running AI pods?

    - Driver on the node, CUDA runtime in the image; newer drivers support older CUDA, so upgrade drivers first
    - Rolling: cordon → drain (respect PDBs) → upgrade → validate (`nvidia-smi`, test job) → uncordon; GPU Operator automates this with `maxUnavailable`
    - Or immutable: new node pool with the new driver, migrate, retire the old one
    - Don't drain mid-training: wait for checkpoint/completion, use maintenance windows
    - Canary pool first; check the compatibility matrix

### AI Infrastructure Fundamentals: Expert

1. Your company needs 512 GPUs for the next two years. How do you decide between a hyperscaler, a GPU cloud and buying hardware?

    - Start from the workload profile: steady training versus spiky inference, model sizes, interconnect needs, data location and compliance
    - **Hyperscaler** (AWS, Azure, GCP): integrated with your existing cloud, managed services, but scarce high-end capacity and high on-demand prices; capacity reservations and commitments help
    - **GPU clouds** (CoreWeave, Lambda and similar): often cheaper and faster to get large clusters with InfiniBand, but another vendor, network egress and integration work
    - **On-prem**: lowest cost per GPU-hour at high, steady utilisation; needs capital, power and cooling (often liquid), lead times, and a team to run it
    - Compare total cost per *useful* GPU-hour at realistic utilisation, not list prices
    - Many end up hybrid: owned or reserved capacity for the steady baseline, cloud for bursts and experiments, with portable tooling (Kubernetes, Slurm, containers) so work can move

## GPU Scheduling

### GPU Scheduling: Beginner

1. How does Kubernetes schedule a pod onto a GPU?

    - GPUs are exposed as an extended resource by the NVIDIA **device plugin** running on each GPU node, e.g. `nvidia.com/gpu: 8`
    - A pod requests whole GPUs in `resources.limits` (`nvidia.com/gpu: 1`); the scheduler only places it on a node with that many free
    - GPUs aren't overcommitted or shared by default: one GPU belongs to one container
    - The **NVIDIA GPU Operator** installs and manages the driver, container toolkit, device plugin, DCGM exporter and MIG manager on the nodes
    - Node labels (GPU model, memory) and taints keep GPU nodes for GPU workloads and let pods target a specific GPU type

### GPU Scheduling: Intermediate

1. How do you configure Kubernetes taints and tolerations for GPU workloads?

    - Taint GPU nodes so CPU pods stay off: `kubectl taint nodes <node> nvidia.com/gpu=present:NoSchedule`
    - GPU pods: matching toleration + `resources.limits: nvidia.com/gpu: 1`
    - `ExtendedResourceToleration` admission plugin can add tolerations automatically
    - Node affinity on GPU Feature Discovery labels (`nvidia.com/gpu.product`) for specific models
    - DaemonSets (device plugin, DCGM exporter) need tolerations too

### GPU Scheduling: Advanced

1. How would you auto-scale GPU nodes for training without wasting GPU hours on idle pods?

    - Gang scheduling and queueing (Kueue/Volcano): provision only when the whole job fits
    - Dedicated, tainted GPU NodePools with fast scale-down of empty nodes
    - Reap allocated-but-idle GPUs (DCGM util ≈ 0 for N minutes, e.g. forgotten notebooks)
    - Team quotas, priority/preemption, low-priority jobs filling the gaps
    - Spot GPUs with checkpointing; MIG/time-slicing for small jobs

2. A GPU pod requests 16 GB VRAM but only gets 12 GB due to fragmentation. How do you detect and fix it in real time?

    - Kubernetes doesn't allocate VRAM; the device plugin gives whole GPUs or MIG slices
    - Time-slicing shares a GPU with no memory isolation, so neighbours eat VRAM
    - Detect: per-process memory in `nvidia-smi`, DCGM FB used/free, OOM errors
    - Causes: noisy neighbours, zombie processes holding memory, PyTorch caching-allocator fragmentation
    - Fix: MIG profiles with fixed memory, schedule by memory (labels / DRA), kill zombies, `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`, reschedule onto a full GPU

### GPU Scheduling: Expert

1. How would you share a GPU cluster fairly between 15 ML teams with very different workloads?

    - Split GPUs to match workloads: **MIG** (hardware partitions on A100/H100) for isolated small jobs, **time-slicing** or **MPS** for light inference and notebooks, whole GPUs or nodes for training
    - A queueing layer for batch work: Kueue or Volcano with cluster queues per team, nominal quotas, borrowing of idle capacity and preemption when the owner needs it back
    - Gang scheduling so distributed jobs start all their pods together or not at all, and topology-aware placement so they land on well-connected nodes
    - Priority classes: production inference above training, training above notebooks
    - Show usage and cost per team, and reclaim idle allocations (notebooks holding GPUs overnight)
    - Publish the policy and review quotas regularly against actual demand

## Distributed Training

### Distributed Training: Beginner

1. What are data parallelism, model (tensor) parallelism and pipeline parallelism?

    - **Data parallelism**: every GPU holds a full copy of the model and trains on a different slice of each batch; gradients are averaged with all-reduce. Simple, works while the model fits on one GPU
    - **Tensor (model) parallelism**: single layers are split across GPUs; needs very fast links (NVLink), used within a node
    - **Pipeline parallelism**: groups of layers live on different GPUs and micro-batches flow through them like an assembly line
    - **Sharded data parallelism** (ZeRO, FSDP) splits optimizer state, gradients and weights across GPUs to fit bigger models with data-parallel simplicity
    - Large models combine all of these (3D parallelism)

### Distributed Training: Intermediate

1. What are NCCL logs, and why are they important in distributed training?

    - NCCL: NVIDIA's collective comms library (all-reduce, all-gather across GPUs/nodes)
    - `NCCL_DEBUG=INFO` shows topology and the transport chosen (NVLink, P2P, SHM, IB/RDMA, sockets)
    - Catches silent fallback to TCP sockets, wrong interface (`NCCL_SOCKET_IFNAME`), and which rank hung
    - One stuck rank stalls every rank; NCCL timeouts kill the job

### Distributed Training: Advanced

1. A multi-cluster AI training job fails halfway because one cluster runs out of GPU memory. How do you rebalance?

    - You usually can't live-migrate GPU state; you resume from a checkpoint
    - Frequent async checkpoints to shared storage; restart where capacity exists; elastic training (torchrun elastic, Ray Train)
    - Prevent with admission (Kueue/MultiKueue) checking capacity before start
    - Fix the OOM: smaller micro-batch + gradient accumulation, activation checkpointing, mixed precision, FSDP/ZeRO
    - Keep a single job within one cluster/fabric; cross-region bandwidth kills collectives

2. Persistent storage for AI datasets shows 200 ms+ latency. Is it the storage backend, the network, or the GPU node?

    - All nodes slow → backend or network; one node → that node
    - Node: `iostat`, iowait, NIC saturation, data-loader workers starved for CPU (looks like I/O)
    - Network: throughput, retransmits, MTU (jumbo frames) mismatch, NIC shared with NCCL traffic
    - Backend: IOPS/throughput limits, metadata load from millions of small files, throttling
    - `fio` from the pod vs from another node
    - Fix: sharded large files (WebDataset/TFRecord), local NVMe cache, prefetching

### Distributed Training: Expert

1. A training run on 1,000 GPUs will last three weeks. How do you make it survive hardware failures?

    - At this scale failures are certain (GPU, NIC and node faults several times a day), so design for restart, not for no failures
    - Frequent, fast checkpoints: asynchronous and sharded checkpointing to a high-throughput store, with the interval set by checkpoint cost versus expected lost work
    - Automatic detection: health checks for GPU errors (DCGM, XID errors), NCCL timeouts, stragglers; remove bad nodes from the pool automatically
    - Automatic restart from the latest checkpoint with spare nodes on standby, so a failure costs minutes, not hours
    - Validate before the run: burn-in tests, NCCL bandwidth tests across the fabric, and storage throughput tests
    - Track "goodput" (useful training time as a share of wall-clock time) as the key metric for the run

## Inference & Serving

### Inference & Serving: Beginner

1. What is the difference between batch and real-time inference, and which latency metrics matter for LLM serving?

    - **Batch inference** scores large datasets offline (nightly recommendations); throughput and cost matter, latency doesn't
    - **Real-time inference** answers requests as they come (chat, fraud checks); latency and availability matter
    - For LLMs: **time to first token (TTFT)** is how quickly the answer starts, **inter-token latency / tokens per second** is how fast it streams, and end-to-end latency depends on output length
    - Throughput is measured in tokens per second per GPU, which drives cost per request

### Inference & Serving: Intermediate

1. How do LLM serving engines such as vLLM or TensorRT-LLM get more throughput from the same GPUs?

    - **Continuous batching**: new requests join the running batch at every generation step instead of waiting for the whole batch to finish
    - **KV cache management**: attention keys and values are cached per request; PagedAttention stores them in pages to avoid memory fragmentation, so more requests fit
    - **Quantization** (FP8, INT8, INT4) shrinks weights and KV cache, raising throughput and fitting bigger models, with some accuracy cost
    - **Prefix caching** reuses work for shared prompts (system prompts, RAG context); **speculative decoding** uses a small draft model to propose tokens
    - **Tensor parallelism** splits a model too big for one GPU across several in a node

### Inference & Serving: Advanced

1. HPA can now scale to zero. Would you scale a GPU inference workload to zero?

    - 0 → 1 can't use CPU (no pods, so no metrics); it needs Object/External metrics (queue depth, request rate) behind the `HPAScaleToZero` feature gate. Check its maturity for your Kubernetes version; KEDA and Knative are the common alternatives
    - Trade-off: cost vs cold start. GPU node provisioning + large image pull + model load into VRAM + warm-up can take minutes
    - Yes for dev, internal tools, batch, event-driven and off-hours workloads
    - No (or keep a minimum warm replica) for latency-SLO production inference
    - Mitigations: pre-pulled images, model cache on local NVMe, request queueing during wake-up

2. How would you pre-warm GPU nodes for massive inference traffic with zero cold-start penalty?

    - Break down cold start: node provision → driver ready → image pull (tens of GB) → model download → load into VRAM → warm-up/compile
    - Warm pool: min replicas, low-priority placeholder pods on GPU nodes
    - Shrink each step: images baked into the AMI, weights on local NVMe/node cache, streaming model loaders
    - Predictive scaling on forecast; scale on queue depth/concurrency, not GPU util
    - Queue requests at the gateway during scale-up; spill to other regions

### Inference & Serving: Expert

1. Design a platform that serves 40 different models (LLMs and smaller models) for many internal teams.

    - A standard serving layer (KServe, Triton, vLLM, or a managed endpoint service) behind one API gateway with authentication, quotas and per-team usage tracking
    - Place models by size and traffic: large LLMs on dedicated multi-GPU replicas, small models packed onto shared GPUs (MIG, time-slicing, multi-model servers)
    - Autoscale on the right signals: queue depth, in-flight requests or tokens per second, not GPU utilisation; keep warm minimums for latency-sensitive models
    - Fast cold starts: models cached on node-local NVMe or a shared high-speed store, images pre-pulled
    - Safe rollouts: canary and shadow traffic for new model versions, with quality checks as well as latency and errors
    - Cost control: route requests to the smallest model that meets the quality bar, batch where latency allows, and show cost per team

## GPU Observability & Cost

### GPU Observability & Cost: Beginner

1. Which GPU metrics would you monitor, and where do they come from?

    - **GPU utilisation**: the share of time a kernel was running; a coarse signal, 100% can still mean poorly used hardware
    - **SM activity / occupancy** and **Tensor Core activity**: how much of the chip is actually busy
    - **Memory used** (VRAM) and memory bandwidth utilisation
    - **Power, temperature and clock throttling**, and **XID / ECC errors** that signal hardware problems
    - **NVLink and PCIe throughput** for multi-GPU jobs
    - On Kubernetes: the NVIDIA **DCGM exporter** exposes these to Prometheus per GPU and per pod

### GPU Observability & Cost: Intermediate

1. How would you monitor GPU utilization in real time in a Kubernetes cluster?

    - DCGM exporter (via GPU Operator) → Prometheus → Grafana
    - `DCGM_FI_DEV_GPU_UTIL` only means "a kernel ran"; also use `DCGM_FI_PROF_SM_ACTIVE`, tensor-core activity, framebuffer used, power, temp, XID errors, NVLink/PCIe
    - Pod/namespace labels for chargeback
    - Alerts: idle-but-allocated GPUs, thermal throttling, XID errors
    - Ad hoc: `nvidia-smi`, `nvidia-smi dmon`, `dcgmi`

2. How would you check whether a GPU pod is actually using the GPU assigned to it?

    - `kubectl exec <pod> -- nvidia-smi`: only the assigned device(s) should show
    - Check `NVIDIA_VISIBLE_DEVICES` / `CUDA_VISIBLE_DEVICES`
    - Host `nvidia-smi` PIDs mapped back to the container
    - DCGM metrics per pod show real utilisation
    - In-app: `torch.cuda.is_available()`; silent fallback to CPU is a common failure

### GPU Observability & Cost: Advanced

1. GPU pipeline cost doubled in 24 hours with no infra change. Profiling shows a silent GPU resource leak. How do you hunt it down?

    - Compare allocated GPUs vs active GPUs per pod; allocated-but-idle is the leak
    - Orphaned Jobs, forgotten notebooks, stuck Terminating pods, zombie processes holding VRAM
    - Nodes not scaling down (pods blocking eviction), GPU instances outside Kubernetes, untagged resources
    - Cost Explorer by instance type
    - Fix: `ttlSecondsAfterFinished`, idle reaper, quotas, per-team chargeback, idle-allocation alerts

2. GPU utilization drops 92% → 24%. No deployment. VRAM remains allocated. What do you investigate?

    - Allocated VRAM ≠ work; the process is alive but starved or stalled
    - Input pipeline: data loader, storage or network slowdown
    - Distributed: a straggler rank, NCCL hang, fallback to a slower transport
    - Hardware: thermal/power throttling, clock drop, XID/ECC errors, degraded PCIe link
    - Inference: upstream traffic drop or batching change
    - Check DCGM clocks and throttle reasons, `nvidia-smi -q`, NCCL logs, data-loader timings

### GPU Observability & Cost: Expert

1. How do you justify idle GPU pre-warming to leadership when each hour costs $30–$40 per GPU?

    - Compare with the cost of cold starts: lost requests/conversions, SLO penalties, churn
    - Quantify: cold-start minutes × spike traffic × value per request
    - Right-size the warm pool to forecast; warm only around peaks
    - Fill warm GPUs with preemptible batch/eval jobs so they aren't truly idle
    - Present it as insurance with a known, measurable premium
