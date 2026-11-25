---
layout: page
title: AI & ML
icon: fas fa-cloud
order: 7
---

{% comment %}
  Topic cards come from _data/ai_topics.yml (groups, categories, items), rendered by
  _includes/topic-grid.html with the Cloud tab's styles. Items without a post show a "Soon" badge.
{% endcomment %}

## Introduction

Artificial intelligence (AI) is the field of building systems that do tasks which normally need human
intelligence: understanding language, recognising images, making predictions and decisions. Machine learning
(ML) is the part of AI where systems learn those skills from data instead of being programmed rule by rule,
and deep learning is the part of ML that uses neural networks with many layers. Large language models, the
engines behind chat assistants and AI agents, are deep learning models trained on huge amounts of text.

Read more in the [Introduction to Artificial Intelligence]({% post_url artificialintelligence/2024-04-05-introduction-to-artificial-intelligence %}).

## Topics

{% include topic-grid.html data="ai_topics" %}

## AI in brief

### Types of AI

| Type | What it means |
|---|---|
| Narrow AI | Built for one task or a few related tasks: voice assistants, recommendations, image recognition. Every AI system in use today is narrow AI. |
| General AI (AGI) | A system that can learn and do any intellectual task a person can. It does not exist yet. |
| Superintelligent AI | A system that would outperform people at almost every cognitive task. Still hypothetical. |
| Hybrid AI | Combines techniques, such as machine learning with rules or expert systems, for better accuracy and control. |

### Machine learning and deep learning

- **Machine learning** finds patterns and relationships in data with statistical methods, without being
  explicitly programmed. Common algorithms are linear regression, decision trees, support vector machines
  and random forests.
- **Deep learning** uses artificial neural networks with many layers, loosely inspired by the brain.
  Convolutional networks (CNNs) work well on images, recurrent networks (RNNs) on sequences, and
  transformers power today's language models. Deep learning leads in image and speech recognition, language
  processing and autonomous driving.

### Where AI is used

| Industry | Examples |
|---|---|
| Healthcare | Diagnostics, personalised treatment plans, drug discovery |
| Finance | Fraud detection, algorithmic trading, risk assessment |
| Transportation | Autonomous vehicles, traffic management, logistics |
| Customer service | Chatbots and virtual assistants |
| Manufacturing | Quality control, predictive maintenance, process optimisation |
| Education | Personalised learning, tutoring systems, content generation |
| Agriculture | Crop monitoring, yield prediction, precision farming |
| Cybersecurity | Threat detection, anomaly detection, network security |

### Ethics and responsible AI

- **Bias and fairness:** models inherit bias from their training data, so data and outcomes need checking.
- **Privacy:** AI often relies on personal data, which needs consent, protection and minimal use.
- **Transparency:** people should be able to understand, and challenge, what a system decided and why.
- **Accountability:** it must be clear who is responsible when an AI system causes harm.
- **Jobs and the economy:** automation displaces work, so retraining and support matter.
- **Security and misuse:** AI systems can be attacked or misused and need the same protection as any other system.
