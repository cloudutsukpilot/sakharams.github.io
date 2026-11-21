---
layout: post
title: "Choosing an artifact manager for my homelab: Zot, Nexus Community Edition or Harbor"
date: 2026-11-21 09:00:00 +0530
categories: [artifacts]
tags: [Artifacts, Zot, Nexus, Harbor, ORAS, GitHub Actions, CI/CD, HomeLab]
description: "GitHub's free artifact storage ran out mid-month and broke my CI. The criteria, numbers and limits I looked at before choosing Zot for CI uploads and Nexus Community Edition as the package proxy, and the plan to change the pipelines."
---

In November my GitHub organisation ran out of Actions artifact storage halfway through the month, and from
then on every `actions/upload-artifact` step failed. That broke more than I expected, so I took it as the push
to move CI artifacts off GitHub and to put a proper package proxy in front of PyPI and npm. This post is the
decision record: what ran out, what I compared, the numbers behind it, and what I'm changing.

## What ran out

GitHub Free includes 500 MB of Actions storage, metered in **GB-hours**: the size of every artifact times how
long it is kept. The allowance is monthly, so deleting artifacts doesn't give it back. My organisation used
about 372 GB-hours against roughly 360 included, and uploads failed until the 1st of the next month.

Two things broke:

- **Image builds stopped deploying.** The security-report upload failed, the job failed, and the step that
  commits the new image digest to GitOps never ran. I made the upload `continue-on-error` and cut retention from
  3 days to 1, which only shrinks the problem.
- **My Terraform drift agent went blind.** It reads each stack's plan file from the scan run's artifacts. With
  no artifact, it recorded the stack as "failed to plan".

## Step 1: which pipelines upload anything

Before choosing a tool I searched every repository's workflows and composite actions for `upload-artifact`,
`download-artifact`, `upload-pages-artifact` and `actions/cache`, and checked who reads each artifact and which
runner the job uses.

| What is uploaded | Kept | Who reads it | Share of the usage |
|---|---|---|---|
| Security gate reports from the image build workflows (Trivy, Grype, Semgrep, SBOM) | 1 day | People reading a failure | Almost all of it |
| Terraform plan files, one per stack | 7 days | The apply job, the summary report, the drift analysis and the drift agent | Small |
| An "apply completed" marker | 7 days | The next plan job | Tiny |
| Coverage XML | 7 days | Nobody | Tiny |
| A Playwright report from a GitHub-hosted runner | 7 days | People reading a failed e2e run | Small |

GitHub Pages uploads stay where they are (Pages needs them), and `actions/cache` has its own limit that isn't
billed as artifact storage. Every job that uploads runs on my self-hosted runners, so whatever replaces GitHub
only needs to be reachable from inside the homelab.

One finding deserves its own follow-up: **Terraform plan files contain secrets in clear text**. Whatever stores
them has to be at least as private as a private repository's artifacts.

## The options

I already run **Zot**, an OCI-only registry, for every container image, with signatures, SBOM attestations and
Keycloak sign-in. The question was whether to use it for CI files too, or bring in a universal artifact manager.
I looked at the two open-source tools people usually suggest:

| | Zot (already running) | Sonatype Nexus Repository Community Edition | Harbor |
|---|---|---|---|
| Formats | OCI only; any file through ORAS | Universal: raw files, PyPI, npm, Maven, NuGet, Helm, Docker/OCI, Go, … | OCI only (images, Helm charts, ORAS artifacts) |
| Proxy caches for public registries | Mirrors other registries | Per format, so one download from the internet, then local | Container registries only |
| Signatures and referrers | Yes, my admission policies depend on it | Stores cosign signatures as referrers in OCI repositories | Yes, and can refuse unsigned images |
| Vulnerability scanning | No (done in CI and Dependency-Track) | No (paid add-ons) | Built in (Trivy) |
| Sign-in with Keycloak | Yes | **No**: SAML/OIDC is in the paid Pro tier | Yes (OIDC) |
| Free-tier limits | None | **40,000 components and 100,000 requests a day** | None |
| Weight | One Go process | One JVM (about 4 GB RAM) plus a database | Seven-plus services, PostgreSQL, Redis |

**Harbor** was out quickly. It is OCI-only, like Zot, so it doesn't handle files or packages any better. Its
extras (scanning, "signed images only") I already get from CI scans and Kyverno, and adopting it would mean
moving every image and signature.

**Nexus** is the universal option. It adds plain files with a URL and a browse page, a real Python package
index, and, the part I care about most, **proxy caches for PyPI and npm**, so `uv sync` and `yarn install` stop
going to the internet on every build.

## The catch: "open source" Nexus has limits now

I first assumed the free Nexus was the old open-source edition. It isn't any more:

- Sonatype retired **Nexus Repository OSS at version 3.77** and renamed the free edition **Community Edition**,
  which is free but has usage limits. The current tier table says 40,000 components and 100,000 requests a day;
  older documentation says 100,000 and 200,000, so check the current page.
- The last OSS release, **3.76**, has no limits but gets no more fixes.
- The core source code is still published under the Eclipse Public License, but without ready-made binaries, and
  it lacks some features of the free edition. Building and maintaining my own image wasn't worth it.
- There is **no free cloud-hosted Nexus**. Nexus Repository Cloud is billed on storage plus egress, with 25 GB a
  month included and about $1.10 per GB after that.

What happens at the limit matters more than the limit itself:

1. The first time usage goes over, a **grace period** starts (Sonatype's guides say 45 days, other sources 30).
2. After it, Nexus **blocks writes but keeps serving reads**, for as long as usage is over a limit.
3. Every HTTP request to a repository counts, metadata lookups included, and the request figure is the
   **busiest day of the last 30**. One spike can count against you for a month.

So a busy CI day could, after the grace period, stop uploads to Nexus. For Terraform plan files that would mean
applies and drift scans stop. That decided where uploads go.

## Would package installs hit the limit?

I estimated it from my own data: one request per locked package (a lower bound), and no cache on the runners,
because my ephemeral runners start empty and `setup-uv` turns its cache off on self-hosted runners.

| Lockfile | Requests per install |
|---|---|
| Backstage portal (yarn 4) | 5,965 |
| A Next.js app (npm) | 921 |
| Two small React apps (npm) | about 450 |
| Python services and agents (uv) | 88 to 165 |

| Week | CI runs, all repositories |
|---|---|
| Late October | 449 |
| Early November | 1,320 |
| Mid November | 1,123 |
| The week I split a monorepo into one repository per agent | 3,601 (1,489 in one repository on the busiest day) |

That works out to roughly **10,000 to 55,000 requests on a normal day**, and **100,000 to 400,000** on a day like
the monorepo split. I don't expect that kind of spike often, but a cache that blocks writes after one bad day
needs guard rails.

## The decision

- **CI uploads go to Zot**, pushed and pulled with ORAS under a separate `ci/` namespace with its own 7-day
  retention and no anonymous read. Zot has no limits, already holds my images, and is backed up with the rest of
  the host data. The drift agent gets a read-only account and reads plan files from Zot instead of GitHub.
- **Nexus Community Edition runs as the PyPI and npm proxy.** If it ever goes over its limits, it still serves
  what it has cached, so installs degrade instead of stopping. It runs on my `platform` cluster rather than next
  to Zot, because the `core` cluster's node doesn't have the memory headroom for a JVM.
- **Every install authenticates.** CI reads with a token from OpenBao; there is no anonymous access. Docker
  builds get it as a BuildKit secret, never a build argument, so it doesn't end up in the image history.
- **The UI is public behind Cloudflare Access**, like my other tools, because Community Edition has no Keycloak
  sign-in of its own. Access also keeps API clients off the public name.

## The plan to change the pipelines

Uploads first, because they are what broke:

1. Two composite actions, `artifact-push` and `artifact-pull`, wrap ORAS and the Zot login, and the runner images
   get the ORAS CLI.
2. The image build workflows push their reports to Zot.
3. The Terraform workflows push plan files and the apply marker to Zot, and the apply, summary and drift jobs pull
   them back by run ID. The drift agent gets a second plan source and later loses the GitHub one.
4. The coverage upload goes; the Playwright report uploads only on failure.
5. The GitHub upload stays as a fallback for one release, then goes too.

Then the package proxy, one tool at a time:

| Tool | Change |
|---|---|
| uv | The lockfile pins pypi.org URLs, so an environment variable alone doesn't redirect a frozen install. Each repository adds a default index pointing at Nexus and re-locks once; credentials come from `UV_INDEX_<NAME>_USERNAME` and `_PASSWORD` |
| yarn 4 | `npmRegistryServer` in `.yarnrc.yml`. Yarn 4's lockfile stores versions, not URLs, so no re-lock |
| npm | `registry=` in `.npmrc`. npm rewrites the lockfile's registry URLs by default, so no re-lock. Jobs on GitHub-hosted runners can't reach Nexus and keep the public registry |
| pip | `PIP_INDEX_URL` in the runner environment and as a build argument |
| Docker builds | The URLs as build arguments, the token as a BuildKit secret |

Two guard rails finish it off:

- **A shared uv and yarn cache on the runners.** A cached install makes no requests at all, which is the best way
  to stay well under 100,000 a day. Nexus's usage metrics go into Mimir with an alert at 70% of each limit.
- **Block the public registries for the runners.** Once nothing has gone around Nexus for a week, a network policy
  denies the runner and BuildKit pods access to pypi.org and the npm registry. A repository I missed then fails
  loudly instead of quietly downloading from the internet.

I'll come back to this post with how the rollout went, and with what I find about why the plan files hold
secrets.

## Sources

- [Nexus Repository editions and feature availability](https://help.sonatype.com/en/nexus-repository-tiers-and-feature-availability.html)
- [Nexus usage metrics](https://help.sonatype.com/en/usage-metrics.html)
- [How to restore Nexus Repository usage (Sonatype)](https://www.sonatype.com/hubfs/How-to-restore-Nexus-Repository-usage.pdf)
- [Nexus Repository OSS is now Community Edition (Sonatype community)](https://community.sonatype.com/t/sonatype-nexus-repository-oss-is-now-community-edition/14324)
- [Changes to the Nexus Repository Core codebase (Sonatype community)](https://community.sonatype.com/t/changes-to-nexus-repository-core-codebase/14341)
- [Sonatype pricing](https://www.sonatype.com/products/pricing)
- [OCI CLI usage with Nexus (cosign and ORAS)](https://help.sonatype.com/en/oci-cli-usage.html)
- [Sigstore registry support](https://docs.sigstore.dev/cosign/system_config/registry_support/)
