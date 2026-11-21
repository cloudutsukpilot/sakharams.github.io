---
layout: post
title: "RAG on Cloud: Security and Privacy"
date: 2026-11-18 00:06:00 +0530
categories: [projects, rag-on-cloud]
tags: [Projects, RAG on Cloud, Security]
description: "Keyless by design: Entra ID, managed identities and RBAC for the Azure RAG lab, plus prompt injection, tool risk and the path to private endpoints."
project: rag-on-cloud
project_step: 6
image:
  path: /assets/img/projects/rag-on-cloud/06-security-and-privacy.webp
  alt: "RAG on Cloud: Security and Privacy - Projects hero image"
---

The corpus is public, so the data has nothing to steal. What's left to protect is the spend, the identities, and
the answers themselves: a RAG system that can be talked into ignoring its sources, or an agent that calls tools
it shouldn't, is a security problem even when every document is public.

<!-- more -->

{% include project-nav.html %}

## Threat modeling
{: #threat-modeling }

STRIDE over the [system diagram](/posts/projects/rag-on-cloud/05-technical-architecture/#system-context-and-component-architecture):

| Threat | Where | Mitigation |
|---|---|---|
| Spoofing: someone calls the API | rag-api | Entra sign-in on Container Apps; anonymous gets 401 |
| Tampering: a poisoned chunk instructs the model | Index, from a post | Only my own posts are synced; the system prompt treats retrieved text as data, never instructions |
| Repudiation: who ran what | Every service | Activity log and resource logs to Log Analytics |
| Information disclosure: keys leak | Config, CI | No keys exist; local auth off everywhere |
| Denial of wallet: a loop of expensive calls | Agentic modes | Iteration and time limits on agents, a budget alert, API reachable only to signed-in callers |
| Elevation: the agent's tool does more than search | Agent Framework tool, MCP connection | The tool only searches; its identity only has Search Index Data Reader |

The denial-of-wallet row is the realistic one for a lab, which is why the budget alert is in Phase 0 rather than
later.

## Authentication and authorization
{: #authentication-and-authorization }

All authentication is Entra ID; all authorization is Azure RBAC on the narrowest scope that works (the service,
not the resource group). The full table of callers, identities and roles is in
[Technical Architecture](/posts/projects/rag-on-cloud/05-technical-architecture/#identity-and-access-architecture).

For the API itself, Container Apps' built-in authentication validates the Entra token before the request reaches
the code, and the app checks one app role (`RagLab.Ask`) so that a signed-in account from the tenant isn't
enough on its own.

> **TODO:** If the API becomes a public demo (an open question in
> [Vision](/posts/projects/rag-on-cloud/01-vision-and-business-context/#target-users-and-personas)), this section
> needs a different model: anonymous access with rate limits and a cost cap, or sign-in for readers.
{: .prompt-warning }

## Secrets and key management
{: #secrets-and-key-management }

There are no application secrets to manage, which is the point of ADR 0004:

- Foundry and Search: `local_auth_enabled = false` / local authentication disabled.
- Storage: shared-key access off, so no connection strings.
- GitHub Actions: federated credentials (OIDC) for Azure; no client secret.
- Container registry: admin user off; pulls by managed identity.

Configuration that isn't secret (endpoints, deployment names, index name) lives in Container Apps environment
variables set by Terraform. If a secret ever becomes unavoidable, it goes into Key Vault referenced by the app,
never into a variable.

## Encryption requirements
{: #encryption-requirements }

Platform defaults are enough here: TLS 1.2 or later on every endpoint, and Microsoft-managed keys at rest for
Storage, Search and Foundry. Customer-managed keys would add a Key Vault and key rotation for no benefit on public
data.

## Network security
{: #network-security }

Two stages (ADR 0005):

| Phases | Posture |
|---|---|
| 0–4 | Public endpoints, every call authenticated with Entra ID. Search's IP firewall limited to my egress address where it doesn't block the managed-identity paths |
| 5 | Private endpoints for Foundry, Search and Storage; shared private links for the indexer; Container Apps inside the dev network; public access off; private DNS zones beside the existing AI zones |

> **TODO:** In Phase 5, how will I reach the private API for testing: a jump host, a point-to-site VPN, or a
> route from the homelab?
{: .prompt-warning }

## Input validation and secure coding
{: #input-validation-and-secure-coding }

- Request models in Pydantic: question length capped, `mode` an enum, `top_k` bounded.
- Search filters built from typed parameters, never from raw strings, so a question can't become an OData
  injection.
- Prompt injection: retrieved chunks are wrapped and labelled as sources; the system prompt says to ignore
  instructions found in sources. A handful of golden questions try injection on purpose.
- Agent tools validate their arguments and return only text, titles and URLs; no credentials in tool output.

## Vulnerability and dependency management
{: #vulnerability-and-dependency-management }

Dependencies are pinned with `uv` lock files; Dependabot raises updates; the container image is scanned in CI
before it's pushed. Agent Framework and the Azure AI SDKs move fast and include preview packages, so upgrades get
an eval run before merge, not just tests. Terraform goes through the platform's existing scanners on every plan.

## Privacy and data-protection requirements
{: #privacy-and-data-protection-requirements }

The corpus is public posts (ADR 0002). Two privacy edges remain:

- **Questions are data.** Whatever someone types is logged in traces. With an owner-only API that's my own data;
  a public demo would need a notice and a retention limit.
- **Unpublished posts.** The sync skips drafts and the blog's private folder, which never leave my machine.

## Audit logging
{: #audit-logging }

| Source | What it records | Retention |
|---|---|---|
| Activity log | Control-plane changes (who created or deleted Search) | Azure default |
| Search resource logs | Queries and indexing operations | Log Analytics |
| Storage logs | Blob reads and writes | Log Analytics |
| Application Insights | Each request, its mode and the caller's object ID | Log Analytics |

> **TODO:** Log Analytics retention for the lab: the default, or longer to keep months of eval traces?
{: .prompt-warning }

## Security testing and incident response
{: #security-testing-and-incident-response }

Tests that run, rather than a pen test:

- Anonymous and wrong-role calls to the API return 401/403.
- A call to Search with a key fails; a blob read with a shared key fails.
- Prompt-injection questions in the golden set don't change the answer format or leak the system prompt.

Incident response is short because the blast radius is small: if spend spikes or a credential looks misused,
remove the Search service and scale the app to zero through a PR, then look at the logs.

## Checklist
{: #checklist }

- [ ] Local auth off on Foundry and Search; shared key off on Storage
- [ ] Every identity has only the roles in the identity table
- [ ] API rejects anonymous and wrong-role calls
- [ ] Agent iteration and time limits configured
- [ ] Prompt-injection questions in the golden set
- [ ] Budget alert live before the first agentic run
- [ ] Phase 5 test access path decided

{% include project-nav.html %}
