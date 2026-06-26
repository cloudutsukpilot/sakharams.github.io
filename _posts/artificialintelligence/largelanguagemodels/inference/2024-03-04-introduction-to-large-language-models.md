---
layout: post
title: LLM Inference and Serving
categories: [ArtificialIntelligence, LargeLanguageModel]
tags: [Artificial Intelligence(AI), Large Language Models, LLMs, Inference, Serving]
---

# LLM Inference and Serving: A Comprehensive Guide

Large Language Models (LLMs) have revolutionized artificial intelligence, powering everything from chatbots to code assistants. However, **deploying these models in production** is a fundamentally different challenge than training them. This guide covers the core concepts, techniques, and tools behind LLM inference and serving.

---

## 1. What is LLM Inference?

**LLM inference** is the process of feeding input data (a "prompt") to a trained model and generating its output (a "completion"). Unlike training, which happens once over days or weeks, inference happens millions of times per second in production systems.

### The Inference Process

LLM inference is an **iterative process**:

1. **Tokenization**: The input prompt is converted into a sequence of tokens
2. **Prefill Phase**: The model processes the entire prompt in parallel to compute initial attention states
3. **Autoregressive Generation**: The model generates one token at a time, feeding each new token back as input for the next iteration
4. **Stopping**: Generation stops when a stop token is produced or a maximum length is reached

```
Prompt: "What is the capital of California?"

Iteration 1: ["What", "is", "the", "capital", "of", "California", "?"] → "S"
Iteration 2: [..., "S"] → "a"
Iteration 3: [..., "S", "a"] → "c"
...
Iteration 10: [..., "S", "a", "c", "r", "a", "m", "e", "n", "t"] → "o"

Output: "Sacramento"
```

### Key Characteristics

- **Memory-Bound, Not Compute-Bound**: LLM inference is limited by GPU memory bandwidth, not compute power. Loading model parameters to the GPU's compute cores takes more time than the actual computation.
- **KV Cache Growth**: For each token generated, the Key-Value (KV) cache grows, consuming GPU memory. A 13B parameter model uses approximately **1MB of GPU memory per token** in a sequence.
- **Prefill vs. Decode**: The initial prompt processing (prefill) is parallel and compute-intensive, while token-by-token generation (decode) is sequential and memory-intensive.

---

## 2. Batching Strategies

Batching is critical for LLM throughput. Processing multiple requests simultaneously amortizes the cost of loading model parameters across all requests.

### Static Batching (Traditional)

In static batching, the batch size remains fixed until all sequences complete:

- **Problem**: Different sequences finish at different times, leaving GPU resources idle
- **Waste**: GPU compute is wasted waiting for the longest sequence in the batch
- **Limitation**: With a 40GB A100 GPU and a 13B model (~26GB for weights), only ~28 sequences of length 512 can fit — severely limiting throughput

### Continuous Batching (Dynamic/Iteration-Level Scheduling)

Continuous batching solves the static batching problem by allowing new requests to be injected into the batch **at every iteration**:

- When a sequence finishes, its GPU memory is freed and a new request takes its place
- Batch size is determined **per iteration**, not fixed upfront
- Achieves **8–23x throughput improvement** over static batching
- Reduces p50 latency significantly

> **Key Insight**: Continuous batching enables higher GPU utilization because the GPU never waits for slow sequences to catch up.

### PagedAttention and Memory Management

**PagedAttention**, introduced by the vLLM team (UC Berkeley), applies OS-style virtual memory paging to KV cache management:

- KV cache memory is allocated in **fixed-size pages** rather than contiguous buffers
- Memory is allocated **just-in-time** instead of ahead-of-time
- Reduces memory waste to **under 4%** (only in the last page)
- Enables **sharing** of KV cache across requests with common prefixes (e.g., system prompts)

The result: vLLM can fit **2–4x more requests** in the same GPU memory compared to traditional systems.

---

## 3. Key Optimization Techniques

### 3.1 Quantization

Reducing the precision of model weights to save memory and accelerate computation:

| Precision | GPU Memory (13B model) | Speedup | Quality Impact |
|-----------|----------------------|---------|----------------|
| FP16 (baseline) | ~26 GB | 1x | None |
| INT8 | ~13 GB | ~1.5x | Minimal |
| INT4 | ~6.5 GB | ~2-3x | Noticeable |
| FP8 | ~13 GB | ~1.8x | Minimal |

Popular quantization formats: **GPTQ**, **AWQ**, **GGUF**, **MXFP8/MXFP4**

### 3.2 FlashAttention

FlashAttention reorganizes attention computation to minimize off-chip memory access:

- Uses **tiled computation** with recomputation instead of storing intermediate attention matrices
- Achieves **2–4x speedup** over standard attention
- Memory complexity drops from O(n²) to O(n)

### 3.3 Tensor Parallelism

Splitting model layers across multiple GPUs for models too large for a single GPU:

- Each transformer block is partitioned across GPUs
- Requires high-speed interconnects (NVLink) between GPUs
- Enables serving models with **hundreds of billions of parameters**

### 3.4 Speculative Decoding

Using a small "draft" model to propose tokens, which a large model then verifies:

- The draft model generates N tokens in parallel
- The large model verifies all N tokens in a single forward pass
- Can achieve **2x speedup** with minimal quality loss

### 3.5 Prefix Caching

Caching and reusing KV cache for common prompt prefixes:

- System prompts, document context, or conversation history can be cached
- Eliminates redundant computation for repeated prefixes
- Particularly effective for RAG (Retrieval-Augmented Generation) workloads

---

## 4. Major LLM Inference Frameworks

### vLLM

**The most popular open-source LLM inference engine.**

- **Key Innovation**: PagedAttention + continuous batching
- **Throughput**: 2–23x faster than traditional systems
- **Model Support**: 200+ architectures on Hugging Face (Llama, Qwen, Gemma, Mixtral, DeepSeek, etc.)
- **Features**:
  - Tensor, pipeline, data, and context parallelism
  - Quantization: FP8, INT8, INT4, GPTQ, AWQ, GGUF
  - Speculative decoding (n-gram, EAGLE, DFlash)
  - Multi-LoRA support for multi-tenant serving
  - OpenAI-compatible API server
  - Streaming outputs
  - Structured output generation
- **Hardware**: NVIDIA GPUs, AMD GPUs, Intel Gaudi, Google TPUs, Apple Silicon

```bash
# Quick start with vLLM
vllm serve meta-llama/Llama-3.1-8B --tensor-parallel-size 4
```

### Hugging Face Text Generation Inference (TGI)

**Production-ready inference server from Hugging Face.**

> **Note**: TGI is now in maintenance mode. The Hugging Face team recommends vLLM, SGLang, or llama.cpp for new deployments.

- **Features**: Tensor parallelism, token streaming (SSE), continuous batching
- **Quantization**: bitsandbytes, GPT-Q
- **Monitoring**: OpenTelemetry tracing, Prometheus metrics
- **Use Case**: Powers Hugging Chat and OpenAssistant

### NVIDIA Triton Inference Server

**General-purpose inference serving platform.**

- Supports TensorFlow, PyTorch, ONNX Runtime, and more
- Dynamic batching and concurrent model execution
- Optimized for production deployment at scale
- Strong enterprise support

### SGLang

**A emerging inference framework focused on structured generation.**

- Specialized in tool calling, reasoning, and constrained decoding
- Fast execution with optimized kernels
- Growing community adoption

### llama.cpp

**Optimized for CPU and Apple Silicon inference.**

- Runs LLMs on consumer hardware without GPUs
- GGUF format for efficient quantized models
- Popular for local/offline inference

---

## 5. Cloud LLM Serving Options

### Managed Services

| Provider | Service | Key Features |
|----------|---------|-------------|
| **AWS** | Bedrock, SageMaker JumpStart | Multi-model access, serverless, custom deployment |
| **Azure** | AI Studio, OpenAI Service | Enterprise integration, hybrid deployment |
| **GCP** | Vertex AI, Palm Studio | AutoML integration, global edge deployment |
| **Google Cloud** | Cloud Run AI Endpoints | Container-based, autoscaling |

### Self-Hosted on Cloud

Deploying open-source models on cloud infrastructure:

1. **Provision GPU instances** (AWS p4/p5, Azure ND H100, GCP A100)
2. **Deploy vLLM/TGI** via Docker or Kubernetes
3. **Load balance** across instances with auto-scaling
4. **Monitor** with Prometheus/Grafana or cloud-native tools

### Cost Considerations

- **GPU costs**: An A100 (40GB) costs ~$3–5/hour; H100 (80GB) costs ~$4–8/hour
- **Throughput matters**: A framework that delivers 10x throughput can reduce costs by 90%
- **Idle time**: Serverless options (AWS Bedrock, Azure AI) eliminate idle GPU costs
- **Multi-tenancy**: LoRA adapters allow serving multiple fine-tuned models on one GPU

---

## 6. Benchmarking LLM Inference

When evaluating inference frameworks, measure:

### Throughput Metrics
- **Tokens per second**: Overall system throughput
- **Requests per second**: How many concurrent requests are handled
- **Time-to-first-token (TTFT)**: Latency until the first token appears (critical for UX)

### Latency Metrics
- **p50 latency**: Median generation time
- **p95/p99 latency**: Tail latency (important for SLA guarantees)
- **Time-per-output-token**: Average time between consecutive tokens

### Efficiency Metrics
- **GPU memory utilization**: How much of the GPU's capacity is used
- **Batch size**: Maximum concurrent requests at target latency
- **Cost per million tokens**: Total cost divided by tokens generated

### Benchmark Results (A100 40GB, OPT-13B)

| Framework | Throughput (tokens/s) | Relative Speed |
|-----------|----------------------|----------------|
| Naive Static Batching | ~81 | 1x (baseline) |
| FasterTransformer | ~320 | ~4x |
| vLLM (continuous batching) | ~1,900 | ~23x |

---

## 7. Best Practices for LLM Serving

1. **Use continuous batching** — It's the single biggest throughput win
2. **Quantize when possible** — INT8/INT4 can halve memory usage with minimal quality loss
3. **Enable prefix caching** — Essential for RAG and chat applications
4. **Monitor KV cache usage** — Fragmentation is the silent throughput killer
5. **Right-size your GPUs** — Match model size to GPU memory to avoid unnecessary tensor parallelism
6. **Use streaming responses** — Server-Sent Events (SSE) for better user experience
7. **Implement rate limiting** — Protect against traffic spikes and OOM errors
8. **Plan for autoscaling** — LLM workloads are bursty; scale GPU instances dynamically
9. **Consider multi-LoRA** — Serve multiple fine-tuned models on one GPU for cost efficiency
10. **Benchmark before production** — Test with realistic traffic patterns, not synthetic benchmarks

---

## 8. The Future of LLM Inference

The field is evolving rapidly:

- **Disaggregated Serving**: Separating prefill and decode phases across different GPU pools for optimal resource utilization
- **MoE (Mixture of Experts)**: Activating only a subset of model parameters per token for massive efficiency gains
- **Edge Inference**: Running smaller models on phones, laptops, and IoT devices
- **Neuromorphic & Specialized Hardware**: New chips designed specifically for transformer inference
- **Automated Kernel Tuning**: torch.compile and auto-tuning for optimal performance on any hardware

---

## Conclusion

LLM inference and serving is a complex but solvable engineering challenge. The key takeaways:

- **Continuous batching** and **PagedAttention** are the foundational innovations enabling high-throughput LLM serving
- **vLLM** has emerged as the leading open-source inference engine, delivering 2–23x throughput improvements
- **Quantization**, **FlashAttention**, and **prefix caching** are essential optimization techniques
- **Cloud managed services** offer convenience, while **self-hosted frameworks** offer control and cost efficiency
- **Benchmarking** with realistic workloads is critical before production deployment

As LLMs grow larger and more capable, efficient inference will remain the bottleneck that determines who can afford to deploy them — making these optimization techniques more important than ever.

---

## References

1. Kwon, W. et al. "Efficient Memory Management for Large Language Model Serving with PagedAttention." *SOSP 2023*. [arXiv:2309.06180](https://arxiv.org/abs/2309.06180)
2. Daniel, C. et al. "How continuous batching enables 23x throughput in LLM inference." *Anyscale Blog, 2023*. [Link](https://www.anyscale.com/blog/continuous-batching-llm-inference)
3. vLLM Documentation. [docs.vllm.ai](https://docs.vllm.ai)
4. Hugging Face Text Generation Inference. [huggingface.co/docs/text-generation-inference](https://huggingface.co/docs/text-generation-inference)
5. Liu, Y. et al. "Orca: A Distributed Serving System for Transformer-Based Generative Models." *OSDI 2022*.
