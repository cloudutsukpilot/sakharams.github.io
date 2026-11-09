---
layout: post
title: "Platform Wardens: Security and Privacy"
date: 2026-11-09 00:06:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Security, Privacy]
description: "How Platform Wardens keeps agents inside their grants: OWASP agentic threats, an identity per agent, guardrails in code, redaction and a hash-chained audit."
project: platform-wardens
project_step: 6
---

An agent that reads plans, logs and commit messages is an agent that reads attacker-controlled text all
day. Platform Wardens' security starts from that: the model is assumed to be fooled sooner or later, so
nothing the model says can widen what the agent is allowed to do. Grants live in the manifest and the
identity's permissions, and the checks are code at four points, never a line in a prompt.

<!-- more -->

{% include project-nav.html %}

## Threat modeling
{: #threat-modeling }

The threat model is the OWASP Top 10 for Agentic Applications, with a framework control for each risk.
Each agent repeats the table in its own `docs/threat-model.md` with a "holds for this agent?" column,
and a later decision ([ADR-0024](/posts/projects/platform-wardens/architecture-decision-records/#adr-0024))
adds the OWASP LLM Top 10 and STRIDE to the baseline.

| Risk | Control in the framework |
|---|---|
| Goal hijack | Tool output, logs and other agents' artifacts are quoted as untrusted data; prompts are versioned files under review; a deterministic goal-drift check before any action |
| Tool misuse | Action catalog in code and permissions; schemas reject undeclared parameters; read and act tools separate; act tools never model-callable |
| Identity and privilege abuse | One identity per agent; read and act credentials separate; no credential passed in a handoff |
| Supply chain | A reviewed MCP server list, tool definitions pinned by hash, dependencies pinned in `uv.lock` |
| Unexpected code execution | No code-execution tools, no shell, parameterised queries only |
| Memory poisoning | No persistent memory unless specified, with provenance, expiry and review |
| Insecure inter-agent communication | Temporal as the only transport, schema validation on receipt, the bus only at the edges |
| Cascading failures | Timeouts, iteration limits, circuit breakers, hop and cost budgets |
| Human-agent trust exploitation | The approver sees full parameters; no auto-approval; approvers named per action |
| Rogue agents | Registry quarantine, a kill switch within 60 seconds, ownerless agents disabled |

Agent-specific threats go in the same file: for drift, plan output and resource tags; for incident
triage, alert payloads and log lines.

## Authentication and authorization
{: #authentication-and-authorization }

**Agents** authenticate as themselves. The Kubernetes service account is the root identity, federated
to the agent's own Entra app for Azure (no stored secret) and paired with the agent's own GitHub App for
GitHub. Every MCP server re-authorises the calling agent on each call.

**People** sign in through Keycloak: an oauth2-proxy sidecar in front of the console admits platform
admins only and passes the user's email, which becomes the requester. The console answers 401 without
it and refuses a person requester other than the signed-in user. From outside the home network,
Cloudflare Access sits in front of Keycloak for the same groups.

**Authorization** is the four guardrail points:

| Point | Checks |
|---|---|
| 1. Task submission | The capability is the agent's, the level is within its grant, the cost within its ceiling, the agent isn't quarantined |
| 2. Every tool call | The tool is declared, a model never calls an act tool, arguments are declared and within bounds |
| 3. Policy gates | The agent's own `policies/` in code; a model may tighten them, never loosen |
| 4. Action | In the action catalog, on a system the agent's domain owns, level 1 output only, level 2 behind an approval bound to the action's idempotency key |

## Secrets and key management
{: #secrets-and-key-management }

Secrets live only in OpenBao under `kv/wardens/*`; External Secrets turns them into the Secrets each pod
reads (LiteLLM keys, GitHub App keys, Slack webhook URLs, database passwords). Gitops holds
`ExternalSecret` objects only. GitHub installation tokens are minted by the worker and refreshed before
they expire. Each agent has two LiteLLM keys, one for models and an MCP-only one, so a leaked key can't
be used for the other.

The rules that matter more than the store:

- A secret or a sensitive attribute value never goes into a prompt, a report or a PR (in drift's
  `neverDoes`).
- Stack Author blocks a PR on a value that looks like a secret.
- At L2 and above, write credentials will be just-in-time: issued for one approved action and expiring
  with it.

## Encryption requirements
{: #encryption-requirements }

Every ingress in the `wardens` cluster serves a Let's Encrypt certificate issued by cert-manager with a
DNS-01 challenge through Cloudflare; TLS ends at Traefik. From the internet, the GitHub webhook and the
public console name arrive through the Cloudflare tunnel, which carries its own TLS from Cloudflare's
edge to the host. Calls between clusters (LiteLLM in `ai`, telemetry to `mon`) are HTTPS.

Inside the cluster, hops are plaintext behind NetworkPolicies; every arrow's certificate, or the reason
it has none, is in the [system diagram](/posts/projects/platform-wardens/05-technical-architecture/#system-context-and-component-architecture).

> **TODO:** Temporal's frontend inside `wardens` runs without mTLS today. Is that accepted for the
> homelab, and does the Azure target need Temporal mTLS? The phase plan lists it as an open decision
> for the end of phase 0.
{: .prompt-warning }

## Network security
{: #network-security }

- **One namespace and NetworkPolicy per agent**, with egress only to what the agent needs (Temporal, the
  state store, LiteLLM, the OTLP collector, the APIs it reads).
- **Nothing is exposed directly.** The console and Temporal UI are behind Keycloak on internal names;
  public access is through the Cloudflare tunnel behind Access.
- **One exception, deliberately narrow:** `hooks.cloudutsuk.com/github` bypasses Access because GitHub
  can't sign in. The HMAC signature is the authentication, checked before the body is parsed; a request
  over 1 MB is refused, and only the repository, run id, job name, conclusion and branch are read.
- **The alert webhook** takes a bearer token and reads only allowlisted labels, never annotations.

## Input validation and secure coding
{: #input-validation-and-secure-coding }

- **Contracts first.** Every record validates against a JSON Schema with `additionalProperties: false`;
  a field nobody declared is refused.
- **The model's output is validated** as a typed Pydantic model. In drift, the deterministic stages
  decide the recommendation kind; the model writes only the rationale and classification, and a failed
  validation falls back to "unknown".
- **Retrieved content is data.** Plans, commit messages and YAML values are quoted as untrusted, and the
  `synthetic-injection-*` eval scenarios check that an instruction hidden in them changes nothing.
- **Deterministic workflow code.** `workflow.py` has no I/O, clock, randomness or model calls, which
  keeps the security-relevant decisions replayable.
- **Unsafe inputs refused at the tool.** Drift's artifact download caps size at 50 MB and refuses unsafe
  zip paths; the web-search server refuses private URLs.

## Vulnerability and dependency management
{: #vulnerability-and-dependency-management }

Images go through the platform's reusable build: Gitleaks, Semgrep, Trivy, Checkov, Hadolint, an SBOM
and a Cosign signature, and Kyverno only admits images pinned by digest. The gates have bitten more
than once: a CVE in `apt` needed a newer package, then the Checkov gate needed an `apt-get upgrade` in
the image, and Gitleaks flagged the published development key of Azurite, the storage emulator behind
the local Event Hubs stack. Python dependencies are pinned in one `uv.lock`, and CI runs `uv sync --frozen`.

MCP servers are a supply chain of their own: only reviewed servers are used, each tool definition is
pinned by its SHA-256 when it's loaded and on every listing, and nothing is installed from a public
registry at runtime.

## Privacy and data-protection requirements
{: #privacy-and-data-protection-requirements }

Each manifest declares the most sensitive data the agent may touch, how it's handled, and whether it
may reach a model. Redaction runs twice: before the model (statement text reduced to its shape,
literals removed, secrets always) and before telemetry, where prompts and responses are logged only at
debug level and redacted. Run records hold references to inputs rather than copies, and redacted
parameters for actions. Run records are kept 180 days, or 30 for confidential data.

On the homelab, the agents read infrastructure metadata (Azure resources, plans, CI logs, cluster
state), not personal data, and the models are local.

## Audit logging
{: #audit-logging }

Three records, linked by the correlation id, each with a job:

| Record | Job | Mutability |
|---|---|---|
| Audit log | Who did what, when, under whose authority | Append-only, hash-chained |
| Run record | A readable account of one run: evidence, decisions, cost | Written once |
| Traces | Debugging and performance | Sampled, retention-limited |

Audit events cover task submitted, rejected and state changes, handoff decisions, every act-tool call
with redacted parameters, every refused tool call, approvals, actions, level changes, quarantine and the
kill switch. An action doesn't run unless its pre-action audit event is persisted. On the homelab the
audit log is an insert-only table in `wardens-state-db`, and the chain's daily head is kept in `mon`
so a rewrite would show.

Temporal's workflow history is replay, not audit: it can be pruned and it isn't meant for people.

## Security testing and incident response
{: #security-testing-and-incident-response }

**Testing.** Every denial test has an allowed twin, names the exact denial, and must fail when the
control is removed ([ADR-0024](/posts/projects/platform-wardens/architecture-decision-records/#adr-0024)):
a test that passes with the guardrail deleted proves nothing. The target plan requires a red-team
exercise before the first L2 action and a security review before any L3.

**Response.** An agent misbehaving is contained in three ways, fastest first: the kill switch (fails
closed, within 60 seconds, engaged by an operator from the console), quarantine in the registry (the
agent stops being routable), and identity revocation. A guardrail denial at the tool point is a P1
alert in Slack with its runbook.

> **TODO:** Who runs the red-team exercise before the first L2 action, and in what format? The repo
> lists it as open.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Every agent's threat model is filled in row by row and signed by its reviewer
- [ ] Every agent has its own service account, Entra app or GitHub App, and NetworkPolicy
- [ ] No secret is in gitops; every one comes from OpenBao
- [ ] The injection scenarios are in every agent's eval set that reads untrusted text
- [ ] Every guardrail test has its allowed twin
- [ ] The kill switch has been engaged from the console and stopped a run within 60 seconds
- [ ] The Temporal mTLS decision is recorded
- [ ] The red-team exercise is planned before any L2 action

{% include project-nav.html %}
