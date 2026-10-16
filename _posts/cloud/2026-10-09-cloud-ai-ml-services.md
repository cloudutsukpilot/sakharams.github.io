---
layout: post
title: "Cloud AI and Machine Learning Services: AWS vs Azure vs Google Cloud"
date: 2026-10-09 00:36:00 +0530
categories: [cloud]
tags: [Cloud, AWS, Azure, GCP, AI, Machine Learning]
image: /assets/img/cloud/cloud-ai-ml-services.webp
description: "ML platforms, foundation models, prebuilt AI APIs and conversational search: what each AI service is for and how Bedrock, Foundry, Vertex AI and SageMaker compare."
---

Two years ago, "AI on the cloud" mostly meant data scientists training models on GPU clusters. Today, most teams
start somewhere else entirely: calling a foundation model through an API, grounding it in their own documents, and
wrapping it in an agent. The cloud AI catalogue has grown to cover both worlds, and the names change almost every
quarter. This post untangles the four layers of cloud AI services, explains when you'd use each, and compares what
AWS, Azure and Google Cloud offer.

<!-- more -->

## The four layers of cloud AI

It helps to think of AI services as layers, from "do everything yourself" to "call an API":

| Layer | You bring | Use it when |
|---|---|---|
| ML platform | Data, training code, models | You're building or fine-tuning your own models |
| Foundation models | Prompts, your data for grounding | You want generative AI: chat, summarisation, code, agents |
| Prebuilt AI APIs | Images, audio, documents, text | A standard task (OCR, transcription, translation) is good enough |
| Conversational and search | Content and conversation design | You're building bots, copilots or enterprise search |

Most real projects mix layers. A typical support assistant uses a foundation model, a search service for retrieval,
a prebuilt API to extract text from PDFs, and occasionally a custom classifier trained on the ML platform.

## Machine learning platforms

ML platforms cover the classic lifecycle: prepare data, experiment in notebooks, train (often distributed, on GPUs or
TPUs), track experiments, register models, deploy to endpoints, and monitor for drift. MLOps features (pipelines,
model registries, CI/CD for models) are what separate a platform from a notebook with a GPU attached.

All three platforms are mature. Your choice usually follows where your data and team already are. Vertex AI has the
advantage of TPUs and tight BigQuery integration. SageMaker AI has the deepest set of training and hosting options.
Azure Machine Learning fits naturally with Microsoft's broader data and identity stack.

{% include cloud-topic-tabs.html cat="ai-ml" topic="platform" %}

## Foundation models and generative AI

This is where most new AI work happens now. Instead of training a model, you call a hosted large language model and
shape its behaviour with prompts, retrieval-augmented generation (RAG) over your data, tool calling and, occasionally,
fine-tuning. Increasingly, you also deploy **agents**: models that plan, call tools and APIs, and act over several
steps.

The services differ mainly in **which models they host** and the **enterprise wrapping** around them: private
networking, data residency, content filters and guardrails, evaluation, and agent runtimes. All three now offer models
from several vendors. Bedrock and Microsoft Foundry both host Anthropic's Claude alongside others, Foundry is the home
of OpenAI's models on Azure, and Vertex AI is the home of Gemini.

{% include cloud-topic-tabs.html cat="ai-ml" topic="genai" %}

> Model names, versions and regional availability change constantly, and models get retired on a schedule. Pin model
> versions in production, track the provider's deprecation dates, and keep an evaluation set so you can test a
> replacement before you're forced to switch.
{: .prompt-warning }

## Prebuilt AI APIs

Before generative AI, cloud providers built task-specific APIs: OCR, image labelling, face detection, speech-to-text,
text-to-speech, translation, sentiment, document extraction. They're still very useful. They're cheaper and faster
than an LLM for well-defined tasks, more predictable, and easy to scale.

Document extraction in particular (Textract, Document Intelligence, Document AI) remains one of the highest-value
uses of cloud AI: invoices, receipts, IDs and forms turned into structured data.

{% include cloud-topic-tabs.html cat="ai-ml" topic="apis" %}

## Conversational AI and search

Bots and enterprise search are the most common user-facing AI applications. In the generative era, they've merged:
a modern assistant is an LLM plus a **retriever** that finds the right passages from your content, plus a channel
layer (web, Teams, Slack, phone).

The retriever matters more than people expect. Answer quality depends mostly on whether the right chunk of the right
document reaches the model. Hybrid search (keyword plus vector) with semantic re-ranking beats pure vector search in
most real-world tests.

{% include cloud-topic-tabs.html cat="ai-ml" topic="conversational" %}

## Comparing the providers

- **Microsoft Azure** has exclusive first-party hosting of OpenAI's models and a strong enterprise wrapper
  (Foundry, Entra ID, private networking), plus the Copilot ecosystem across Microsoft 365.
- **AWS** offers the broadest model choice through Bedrock, mature agent infrastructure (AgentCore), and the most
  extensive training and hosting options in SageMaker AI, plus its own Trainium and Inferentia chips.
- **Google Cloud** builds its own frontier models (Gemini) and hardware (TPUs), with strong multimodal capabilities
  and tight integration with BigQuery and Search grounding.

Plenty of organisations use more than one. That's fine for model access, but keep your evaluation, prompts and
retrieval layer portable.

## Common pitfalls

- **Skipping evaluation.** "It looked good in the demo" isn't a test. Build a set of real questions with expected
  answers and run it on every prompt or model change.
- **Treating RAG as plug-and-play.** Chunking, metadata, access control on retrieved documents and re-ranking
  make or break quality. Budget time for them.
- **Ignoring quotas and capacity.** Popular models have per-region token-per-minute limits. Request quota early
  and design for throttling with retries and fallbacks.
- **Leaking data through prompts.** Respect document permissions in retrieval, filter sensitive data, and log
  prompts and responses securely for audit.
- **Runaway token costs.** Long contexts and agent loops add up quickly. Cache prompts where supported, choose
  smaller models for simple steps, and set budgets per application.

## Conclusion

Start at the highest layer that solves your problem. Use a prebuilt API for standard tasks, a foundation model with
RAG for language and reasoning, and the ML platform only when you need a custom model. Choose a cloud based on where
your data lives and which models you need, then invest in evaluation and retrieval, because that's where quality comes
from. A concrete next step: pick one internal document set and build a small RAG prototype on your cloud's model
service, with a 20-question evaluation set from day one. For everything side by side, see the
[AI & Machine Learning comparison](/cloud/#ai-ml), and for more on agents, the
[agentic AI post](/posts/agenticai/agentic-ai/).

## References

- [Amazon SageMaker AI documentation](https://docs.aws.amazon.com/sagemaker/)
- [Amazon Bedrock documentation](https://docs.aws.amazon.com/bedrock/)
- [Microsoft Foundry documentation](https://learn.microsoft.com/azure/ai-foundry/)
- [Azure Machine Learning documentation](https://learn.microsoft.com/azure/machine-learning/)
- [Azure AI Search documentation](https://learn.microsoft.com/azure/search/)
- [Vertex AI documentation](https://cloud.google.com/vertex-ai/docs)
- [Dialogflow CX documentation](https://cloud.google.com/dialogflow/cx/docs)
