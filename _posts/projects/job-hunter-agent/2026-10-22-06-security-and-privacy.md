---
layout: post
title: "Job Hunter Agent: Security and Privacy"
date: 2026-10-22 00:06:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Security, Privacy]
description: "Securing an agent that holds a signed-in LinkedIn session and my resume: threat model, Keycloak, OpenBao, a read-only tool allow-list and deterministic claim checks."
project: job-hunter-agent
project_step: 6
image:
  path: /assets/img/projects/job-hunter-agent/06-security-and-privacy.webp
  alt: "Job Hunter Agent: Security and Privacy - Projects hero image"
---

Job Hunter Agent holds three things worth stealing: my LinkedIn session (a full browser login), my resume,
and the power to make me look dishonest to a recruiter. The security design is mostly about those three,
and about one unusual threat: the agent itself, writing claims I can't back up.

<!-- more -->

{% include project-nav.html %}

## Threat modeling
{: #threat-modeling }

STRIDE, applied to what's actually here:

| Threat | Example | Control |
|---|---|---|
| Spoofing | Someone on the tailnet opens the app | Keycloak sign-in, `platform-admins` checked in the app as well |
| Tampering | A posting's text tells the model to "add Kubernetes certification" | Truthfulness checks flag any term the resume doesn't have; approval is manual |
| Repudiation | "Did I approve that letter?" | Status changes carry timestamps (`approved_at`, `applied_at`) and review notes |
| Information disclosure | The LinkedIn session or Supabase key leaks | Session only on the pod's volume; keys in OpenBao; no Service port on the sidecar |
| Denial of service | LinkedIn rate-limits or restricts the account | Low volume, profiles hours apart, read-only tools |
| Elevation of privilege | The model calls a LinkedIn tool that sends a message | MCP client allows only an explicit read-only tool list |

The prompt-injection row is the interesting one. Job postings are untrusted text fed straight to an LLM.
I don't try to sanitize them; I make sure the model's output can't do anything without passing
deterministic checks and me.

## Authentication and authorization
{: #authentication-and-authorization }

- **Users:** OIDC authorization code flow with PKCE against Keycloak (realm `homelab`, confidential client
  `job-hunter`). Authlib validates the ID token (JWKS signature, issuer, audience, nonce).
- **Authorization:** one rule, membership of `platform-admins`. Keycloak's browser flow enforces it and the
  app checks the `groups` claim again on callback.
- **Session:** a signed cookie (`jh_session`), 8 hours, `Secure`, `SameSite=Lax`. Every route except the
  probes and `/auth/*` needs it; API calls without it get 401, browsers get redirected to sign in.
- **Redirect safety:** the `next` parameter accepts only same-site relative paths.

## Secrets and key management
{: #secrets-and-key-management }

| Secret | Stored | Reaches the app as |
|---|---|---|
| Keycloak client secret | OpenBao `kv/core/keycloak`, copied to `kv/platform/job-hunter` | `OIDC_CLIENT_SECRET` |
| Session signing key | OpenBao, random | `SESSION_SECRET` |
| LiteLLM virtual key (one model only) | OpenBao | `LLM_API_KEY` |
| Supabase URL and service-role key | OpenBao, typed in, never echoed | `SUPABASE_*` |
| Slack webhook URL | OpenBao, copied from the alerts config | `SLACK_WEBHOOK_URL` |
| LinkedIn session | The pod's PVC (browser profile, cookies) | Never an env var |

A script in infra-local fills OpenBao and prints nothing; External Secrets syncs the Kubernetes Secret.
Locally, a gitignored `.env` holds a separate LiteLLM key.

## Encryption requirements
{: #encryption-requirements }

In transit: TLS everywhere off the pod (Let's Encrypt on the ingress, HTTPS to LiteLLM, Supabase,
Wikidata, Google News, Slack and LinkedIn). The only plaintext hop is app → sidecar over loopback inside
the pod. At rest: Supabase encrypts its storage, and the homelab host's disk is encrypted, which covers the volumes
holding the browser profile and the nightly data exports. Their Velero copies off the host are encrypted
again by Kopia before upload.

## Network security
{: #network-security }

- The NetworkPolicy admits only Traefik, and only to port 8000.
- The sidecar listens on `127.0.0.1:8080` and has no Service port: it has no authentication, so nothing
  outside the pod may reach it.
- The UI is served on the tailnet; `*.platform.home.cloudutsuk.com` resolves through the homelab's internal DNS.
- Egress isn't restricted. That's a gap: the app needs LinkedIn, Supabase, Wikidata, Google News and
  Slack, and an egress policy listing them would make an exfiltration harder.

## Input validation and secure coding
{: #input-validation-and-secure-coding }

- Every request body is a Pydantic model; profile names must be unique, schedules must parse as cron,
  resume IDs must exist.
- Uploads are capped in size and parsed by type (PDF, DOCX including tables, text, Markdown).
- The UI builds every element with `textContent`, never `innerHTML`, so posting text can't inject markup.
- RSS from Google News is parsed with `defusedxml` (Bandit flags the standard library parser).
- LLM output is validated against the agent's schema; contact links are taken only from the scraped page
  and placeholders like "[Name]" in notes are rejected.

## Vulnerability and dependency management
{: #vulnerability-and-dependency-management }

The platform's build workflow gates every image: Gitleaks, Semgrep, Bandit, Trivy, Checkov, Conftest and
Hadolint. Base images are pinned by digest; GitHub Actions by commit SHA; Python dependencies by
`uv.lock`. Two Gitleaks false positives are suppressed by fingerprint in `.gitleaksignore`, not by
turning the rule off.

Dependabot covers the rest: alerts and security-fix PRs are on, and `.github/dependabot.yml` opens weekly
PRs for Python packages (through `uv.lock`), GitHub Actions and the two base images. Minor and patch
updates come grouped per ecosystem. A 14-day cooldown skips releases younger than the homelab's rule for new
images, and Python itself stays on 3.12 until I move it on purpose. Every PR runs the full CI (unit tests,
real Supabase, Docker build), and nothing merges by itself.

## Privacy and data-protection requirements
{: #privacy-and-data-protection-requirements }

My resume is the main personal data, and it goes only to the local model. Postings are public. Contact
suggestions store names, titles and public profile links of real people; they're shown only to me,
used only to decide who I might contact myself, and never messaged by the app. The blog posts about this
project leave out my employers, the Supabase project and the Slack channel.

## Audit logging
{: #audit-logging }

- `agent_results`: every agent run with its input summary, output, success and error.
- `applications`: status, `approved_at`, `applied_at` and review notes. Approving despite warnings needs
  an explicit flag, but the flag itself isn't stored: a gap worth closing.
- `runs`: every manual or scheduled run with trigger, profiles, counts and errors.
- Keycloak's own event log for sign-ins.

There's no tamper-proofing; it's an audit trail for me, not for a regulator.

## Security testing and incident response
{: #security-testing-and-incident-response }

Tests cover the auth gate (401 without a session, redirect for browsers, group refusal, safe `next`
redirects) and the truthfulness checks. The scanners above run on every image build.

If something goes wrong, the playbook is short:

1. LinkedIn session leaked or account flagged: sign out of all LinkedIn sessions, delete the PVC's
   profile, sign in again through the in-cluster login.
2. A key leaked: rotate it in OpenBao (or LiteLLM / Supabase / Slack), force the ExternalSecret to
   refresh, restart the pod.
3. An approved application contained a false claim: withdraw it with the employer, and add the missed
   pattern to the truthfulness tests.

## Checklist
{: #checklist }

- [ ] Group check in the app tested after any Keycloak change
- [ ] Read-only tool allow-list re-checked on every MCP server upgrade
- [ ] Egress NetworkPolicy listing the five outside services
- [x] Host disk encryption confirmed for the browser profile
- [x] Dependency update automation enabled (Dependabot)
- [ ] Key rotation done once end to end, so the steps are proven
- [ ] Prompt-injection test: a posting that asks for a fake certification gets flagged

{% include project-nav.html %}
