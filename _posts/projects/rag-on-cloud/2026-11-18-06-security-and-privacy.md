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

All authentication is Entra ID; all authorization is Azure RBAC. The target is the narrowest scope that works (the
service, not the resource group). Today the roles sit on the lab's resource group, because the platform's
role-assignment module can't scope to a Search service or a Foundry account yet; the group holds nothing but this
lab, so the difference is small, and it's on the list for the module. The full table of callers, identities and roles is in
[Technical Architecture](/posts/projects/rag-on-cloud/05-technical-architecture/#identity-and-access-architecture).

For the API itself, Container Apps' built-in authentication validates the Entra token before the request reaches
the code, and the app checks one app role (`RagLab.Ask`) so that a signed-in account from the tenant isn't
enough on its own.

**The API stays owner-only** (decided 2026-11-23). Readers of the blog get the published results, the comparison
tables and the ADRs, not a live endpoint. An open endpoint in front of pay-per-token models needs rate limits, abuse
handling and a hard cost cap, and building those isn't what this lab is about. If that changes, the design is sign-in
for readers through Container Apps authentication with Entra External ID, a per-user daily question quota in the API,
and the budget scaling the app to zero when it's hit.

## Secrets and key management
{: #secrets-and-key-management }

There are no application secrets to manage, which is the point of ADR 0004:

- Foundry, Search and Application Insights: local authentication disabled (`local_auth_enabled = false`,
  `local_authentication_enabled = false`), so there are no API keys to leak or rotate.
- Storage: shared-key access off and OAuth the default, so no connection strings or SAS tokens.
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
| 0–4 | Public endpoints, every call authenticated with Entra ID. No IP firewall: my home address changes, and a default-deny rule would block local runs |
| 5 | Private endpoints for Foundry, Search and Storage; shared private links for the indexer; Container Apps inside a VNet; public access off; private DNS zones. All of it new in the lab's own subscription: the platform's network and DNS zones are in another tenant (ADR 0012) |

The public endpoints aren't an oversight, and the scanners know it. Trivy flags the storage account's network rules
(AZU-0012), and the platform accepts that finding for its whole GitHub organisation, with the reason, in one file in
the shared module rather than per stack. More in
[Vulnerability and dependency management](#vulnerability-and-dependency-management).

**Testing the private API in Phase 5** (decided 2026-11-23): a Container Apps job in the same VNet runs the
smoke test and the eval against the private endpoints, started from my machine with `az containerapp job start`. It
costs nothing between runs, unlike a point-to-site VPN gateway or Bastion, which bill every hour. A route from the
homelab is out: the stack lives in a separate tenant, and a site-to-site VPN to it would be more infrastructure than
the lab it serves. For the rare interactive session, a small VM in the subnet goes in and out through a PR, the same
way the Search service does.

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
an eval run before merge, not just tests.

Terraform goes through the platform's gates on every plan, locally and in CI: Trivy for misconfigurations and OPA for
policy (tags, regions, SKUs). For this stack, three Trivy findings on the storage account are accepted rather than
fixed, each with a reason, in the platform's per-organisation exceptions file:

| Finding | What Trivy wants | Why it's accepted |
|---|---|---|
| AZU-0012 | Network rules default to deny | Public endpoint with Entra ID only, until Phase 5 (ADR 0005) |
| AZU-0057 | Storage analytics logging | Diagnostics off by the organisation's cost preference; turned on per resource when debugging |
| AZU-0061 | Infrastructure (double) encryption | Platform-managed encryption at rest is on; a second layer isn't needed for public posts |

One OPA policy exists because of this lab. The tenant it runs in denies `GlobalStandard` model deployments with an
Azure Policy, and that rule only fires at apply, after the rest of the stack has been created. The platform now
repeats the rule as a mandatory OPA policy for that tenant, so a plan fails before anything is created
([lesson L002](/posts/projects/rag-on-cloud/lessons-learned/#lesson-l002)).

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
| Search resource logs | Queries and indexing operations | Log Analytics, once a diagnostic setting is added |
| Storage logs | Blob reads and writes | Log Analytics, once a diagnostic setting is added |
| Application Insights | Each request, its mode and the caller's object ID | Log Analytics `dv-log-rag-01` |

Retention is 30 days in both the workspace and Application Insights, with a 1 GB daily cap on ingestion. Eval results
are what I want to keep for months, and they live in the lab repo, not in logs. The resource logs aren't flowing yet:
diagnostics stay off until there's something to debug, because ingestion is the part of Log Analytics that costs.

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
- [x] Budget alert live before the first agentic run (100 a month, applied 2026-11-23)
- [ ] Phase 5 test access path decided

{% include project-nav.html %}
