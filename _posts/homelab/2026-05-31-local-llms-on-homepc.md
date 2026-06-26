---
layout: post
title: Setting Up Local LLMs on My Home PC — What Actually Works for Coding
categories: [homelab]
tags: [HomeLab, Local LLMs]
pin: true
image: /assets/img/homelab/homelab-posts.png
description: Local LLMs for Coding
---


# Setting Up Local LLMs on My Home PC — What Actually Works for Coding

*Posted in: AI, Local Development, Tools*

---

I've been meaning to write this up for a while. Over the past few weeks I've been experimenting with running large language models locally on my home machine, mainly to use as a coding assistant without having to pipe everything through the cloud. No API keys, no usage limits, no sending proprietary code to a third-party server. Just me, my PC, and a model running in my living room.

Here's what I found.

---

## Why Bother Running Locally?

Before I get into the hardware and models, let me explain why I even went down this path.

I use LLMs heavily for coding — autocomplete, refactoring suggestions, explaining unfamiliar codebases, writing tests. Cloud-based tools like Copilot and GPT-4 are genuinely great, but I kept running into friction:

- **Privacy.** I work on personal projects where I'd rather not send code to external APIs.
- **Latency.** Round-trips to cloud endpoints add up, especially during long sessions.
- **Cost.** API usage bills are unpredictable when you're hitting a model hundreds of times a day.
- **Curiosity.** I'm an AI engineer. I wanted to actually understand what's happening under the hood.

So I decided to set up a proper local inference stack.

---

## My Hardware

Let me be upfront about what I'm working with, because hardware is everything when it comes to running local LLMs.

| Component | Spec |
|-----------|------|
| CPU | Intel Core i9-14900KS (24 cores / 32 threads, up to 6.2 GHz) |
| RAM | 96 GiB |
| GPU | NVIDIA GeForce RTX 5070 Ti (16 GB VRAM) |
| Storage | SSD with plenty of headroom |

This is a fairly high-end consumer setup — not a data centre, but not a budget gaming rig either. The key constraints here are:

1. **VRAM is the ceiling.** 16 GB sounds like a lot, but a quantized 32B model can easily hit 18–22 GB. This means the GPU alone can't hold the full model.
2. **RAM is the saving grace.** With 91 GB of system RAM, Ollama can split the model across GPU and CPU memory — a technique called **layer offloading**. The GPU handles as many layers as it can fit in VRAM, and the rest get processed by the CPU.
3. **The i9-14900KS is actually important here.** A lot of people overlook CPU performance in local LLM setups. When you're doing partial CPU offload, a weak CPU becomes your bottleneck. The 14900KS's combination of high core count and extremely high single-core clock speed (6.2 GHz boost) means the CPU-handled layers don't cripple throughput the way they would on, say, a laptop CPU.

---

## Getting Started with Ollama

I went with [Ollama](https://ollama.com) as my inference runtime. It's by far the simplest way to get models running locally — one command to pull a model, one command to run it. It handles quantization selection, layer offloading, and model management automatically.

```bash
# Install Ollama (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull and run a model
ollama run qwen3:32b
```

That's genuinely it. Ollama detects your GPU, figures out how many layers fit in VRAM, and offloads the rest to RAM.

To see what's actually happening with your GPU while a model is running:

```bash
# In one terminal, run the model
OLLAMA_DEBUG=1 ollama run qwen3:32b

# In another terminal, watch GPU utilisation live
watch -n 1 nvidia-smi
```

If you see VRAM climbing toward 15–16 GB while the model is loading, Ollama is doing exactly what you want — filling up the GPU before falling back to RAM.

---

## Which Models Did I Actually Try?

Here's where it gets interesting. I didn't just pull one model and call it done — I went through several iterations based on what I needed the model to *do*.

### Starting Point: Qwen3 8B

I started small. Before committing to pulling down a 20 GB model file, I wanted to make sure my setup was working correctly.

```bash
ollama run qwen3:8b
```

Qwen3 8B fits entirely within 16 GB of VRAM at 4-bit quantization (~5–6 GB), so it runs fully on the GPU with no CPU offload needed. The responses are fast — noticeably faster than anything cloud-based in terms of *time to first token* — and for simple coding tasks like writing boilerplate or explaining a function, it's surprisingly capable.

**But** — and this is important — for anything requiring reasoning across a larger context (debugging a complex call stack, refactoring a whole module), I felt the model hitting its limits. It would lose track of context, hallucinate method names, or give answers that were plausible but subtly wrong in ways that cost me more time to debug than if I'd just written the code myself.

For small, self-contained tasks: great. For real coding assistant work: I needed something bigger.

### The Sweet Spot: Qwen3 32B

This is the model I've settled on for daily use, and I want to explain *why* in detail because I think a lot of people underestimate 32B class models.

```bash
ollama run qwen3:32b
```

A Q4-quantized Qwen3 32B model sits at around 18–22 GB. On my machine, roughly 14–15 GB loads into VRAM and the remainder lives in system RAM. The i9-14900KS handles the offloaded layers without choking.

**Why Qwen3 specifically?**

Qwen3 is trained by Alibaba's research team and — at the 32B scale — punches well above its weight on coding benchmarks. A few things that matter specifically for a coding assistant:

- Strong instruction following. When I say "refactor this function to use dependency injection and add type hints", it does exactly that rather than rewriting everything its own way.
- Good at staying in context. With a large enough context window, it tracks variables, function signatures, and file-level structure reliably.
- Supports a thinking/non-thinking mode toggle. For quick autocomplete-style tasks I can tell it not to think; for architectural questions I let it reason through the problem. This flexibility is genuinely useful.

The tradeoff is speed. It's not as fast as the 8B model — but for the quality of output I'm getting, it's worth it.

### For Reasoning-Heavy Tasks: DeepSeek-R1 Distill 32B

Sometimes I need a model to *think*, not just pattern-match. Debugging a race condition, understanding why an algorithm is producing incorrect output at edge cases, that kind of thing.

```bash
ollama run deepseek-r1:32b
```

DeepSeek-R1 is a reasoning-first model — it produces a visible chain of thought before answering. This makes its responses slower to arrive, but the quality for complex multi-step problems is noticeably better.

I don't use this as my everyday driver because the thinking overhead is overkill for most tasks. But when I'm genuinely stuck on something, this is the model I reach for.

### Pushing the Limit: Qwen3 72B

Out of curiosity I pulled the 72B model to see what happens.

```bash
ollama run qwen3:72b
```

It runs. That's the honest answer. A Q4 72B model is around 40–45 GB, which is well beyond my VRAM. Almost everything ends up in system RAM with only a fraction on the GPU. The CPU is doing serious work here.

Speed is much slower — we're talking a fraction of what the 32B gives you. For a chat session where you're typing a question and waiting for a response, it's usable. For anything interactive or iterative, it feels sluggish.

I don't use it regularly. But it's genuinely impressive that my home PC can run a 72B parameter model at all.

---

## Measuring Token Speed (Work in Progress)

I'll be honest — I'm still figuring out the cleanest way to benchmark tokens per second on my setup. Ollama outputs some timing information at the end of each response in verbose mode:

```bash
ollama run qwen3:32b --verbose
```

This gives you `eval rate` which is tokens per second during generation. I've been collecting these informally across different prompt types and model sizes. I'll do a proper write-up with actual numbers once I have a more systematic benchmark setup — I want to compare cold start vs warm, short context vs long context, and CPU-heavy vs GPU-heavy prompts.

If you have a good benchmarking setup for Ollama already, I'd genuinely love to hear about it.

---

## Hooking It Up as a Coding Assistant

Running models in a terminal is interesting but not the point. I wanted this integrated into my editor.

Ollama exposes a local REST API at `http://localhost:11434`, which is compatible with the OpenAI API format. This means anything that supports a custom OpenAI endpoint just works.

For VS Code, I use **Continue** ([continue.dev](https://continue.dev)):

```json
// .continue/config.json
{
  "models": [
    {
      "title": "Qwen3 32B (Local)",
      "provider": "ollama",
      "model": "qwen3:32b"
    }
  ]
}
```

Tab completion, inline suggestions, chat panel — all running entirely locally. It feels identical to a cloud-backed setup, just with different latency characteristics.

---

## Lessons Learned

A few things I wish someone had told me at the start:

**VRAM isn't the hard limit people think it is.** Thanks to Ollama's layer offloading, having 91 GB of RAM effectively extends your "usable model memory" well beyond 16 GB. You lose some speed, but you gain access to a much larger class of models.

**Model size matters more than model architecture for coding.** I tested several 7B/8B models from different families. None of them consistently matched the 32B models on real coding tasks. The jump in quality from 8B to 32B is much larger than the jump from one 8B architecture to another.

**Quantization is a free lunch up to a point.** Q4 quantization gives you a big reduction in model size with surprisingly small quality loss. Q2 and below starts to hurt noticeably on reasoning tasks. I stick to Q4 or Q5 for everything.

**Your CPU matters more than you'd expect.** If you're doing any CPU offload, clock speed and memory bandwidth become real factors. The 14900KS has been a genuine asset here.

---

## What's Next

I want to explore:
- Setting up a proper token/sec benchmark suite across models and prompt types
- Testing Qwen3-Coder variants specifically tuned for code
- Trying [llama.cpp](https://github.com/ggerganov/llama.cpp) directly for more control over layer assignment
- Exposing my local Ollama instance on my home network so other machines can use it

If you're sitting on a machine with a modern GPU and 32+ GB of RAM and you haven't tried local LLMs yet, I'd genuinely encourage you to spend an afternoon on it. The barrier to entry is lower than you might think, and having a capable coding assistant that runs entirely on your own hardware is a different experience than relying on cloud APIs.

More updates coming as I dig deeper.

---

*Have questions or want to share your own local LLM setup? Drop a comment below.*
