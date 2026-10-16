---
layout: post
title: "DevSecOps Security Testing Explained: SAST, SCA, DAST, IAST and More (with a Tool Comparison)"
date: 2026-10-10 01:00:00 +0530
categories: [devsecops]
tags: [DevSecOps, SAST, SCA, DAST, Security Tools]
image: /assets/img/devsecops/devsecops-security-testing-types-and-tools.webp
description: SAST, SCA, secrets, IaC, container, DAST, IAST, CSPM and more, each shown on the same Python Flask API, plus a feature comparison of 24 paid and open-source security tools.
mermaid: true
---

Your security team asks whether you "do SAST and SCA", the vendor deck says the platform covers "CNAPP, ASPM and
shift-left", and you're left wondering which of these acronyms would actually have caught the bug that matters.
They aren't interchangeable. Each technique looks at a different layer, at a different moment in the pipeline, and
misses things the others catch. In this post I take **one small application**, a Python Flask "orders" API
running in a container on AWS, and show what each kind of security testing finds in it. After that comes a
comparison of 24 popular paid and open-source tools, with what each one covers.

<!-- more -->

## The example application

Everything below uses the same project, so you can see how each technique looks at a different part of it:

```text
orders-api/
├── app/
│   ├── __init__.py
│   ├── routes.py          # Flask endpoints: /orders, /orders/<id>, /search
│   └── db.py              # database access
├── requirements.txt       # Flask, PyYAML, requests ...
├── Dockerfile             # container image
├── infra/
│   └── main.tf            # Terraform: EC2, security group, S3 bucket
└── tests/
```

And here's where each technique sits in the delivery pipeline:

```mermaid
%%{init: {"themeVariables": {"fontSize": "14px"}, "flowchart": {"useMaxWidth": false, "nodeSpacing": 30, "rankSpacing": 40, "padding": 8, "wrappingWidth": 150}}}%%
flowchart TB
  subgraph CODE["Code and commit"]
    direction LR
    A[SAST] --> B[Secrets<br/>scanning] --> C[SCA and<br/>licences]
  end
  subgraph BUILD["Build"]
    direction LR
    D[SBOM] --> E[Container<br/>scanning] --> F[IaC scanning] --> G[Signing and<br/>provenance]
  end
  subgraph TEST["Test"]
    direction LR
    H[DAST] --> I[IAST] --> J[API testing] --> K[Fuzzing]
  end
  subgraph RUN["Run"]
    direction LR
    L[CSPM] --> M[Runtime / CWPP<br/>and RASP] --> N[Vulnerability<br/>scanning] --> O[Pen testing]
  end
  CODE --> BUILD --> TEST --> RUN
```

## Code and commit stage

### SAST: Static Application Security Testing

SAST reads your **source code without running it** and looks for insecure patterns: injection, unsafe
deserialisation, weak crypto, path traversal. Most tools trace tainted data from inputs (request parameters) to
dangerous sinks (SQL queries, shell commands). It runs in the IDE, on pull requests and in CI, and it's the
cheapest place to catch a bug, because it points at the exact line.

**In orders-api**, the search endpoint builds SQL with an f-string:

```python
# app/routes.py
@bp.get("/search")
def search():
    term = request.args.get("q", "")
    rows = db.execute(f"SELECT id, item FROM orders WHERE item LIKE '%{term}%'")   # SQL injection
    return jsonify([dict(r) for r in rows])
```

```text
$ bandit -r app/
>> Issue: [B608:hardcoded_sql_expressions] Possible SQL injection vector through string-based query construction.
   Severity: Medium   Confidence: Medium
   CWE: CWE-89 (https://cwe.mitre.org/data/definitions/89.html)
   Location: app/routes.py:12
```

The fix is a parameterised query: `db.execute("SELECT id, item FROM orders WHERE item LIKE ?", (f"%{term}%",))`.

SAST's weakness is false positives, plus blindness to anything that only exists at runtime (configuration,
authentication flows, the deployed environment). Tune the rules, and fail builds only on high-confidence findings.

### Secrets scanning

Secrets scanning looks for **credentials committed to code or history**: API keys, tokens, private keys,
connection strings. The best setups block the push before the secret ever reaches the remote ("push protection"),
because once a secret is in git history, deleting the line doesn't help. You have to rotate it.

**In orders-api**, someone hard-coded an AWS key in `db.py` "just for testing":

```python
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"     # AWS's documented example key
```

```text
$ gitleaks git -v .
Finding:     AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
RuleID:      aws-access-token
File:        app/db.py
Commit:      3f2a9c1
```

The fix: rotate the key, load credentials from the environment or an IAM role, and add a pre-commit hook so it
can't happen again.

### SCA: Software Composition Analysis

SCA inventories your **third-party dependencies**, including transitive ones, and matches them against
vulnerability databases (NVD, GitHub Advisory, OSV). Most of your application is code you didn't write, so this is
often where the most serious known issues are. Good SCA tools also check **licences** (a GPL dependency in a
proprietary product is a legal problem) and **reachability**, meaning whether your code actually calls the
vulnerable function.

**In orders-api**, `requirements.txt` pins an old PyYAML:

```text
Flask==3.0.3
PyYAML==5.3
requests==2.32.3
```

```text
$ trivy fs --scanners vuln .
requirements.txt (pip)
┌─────────┬────────────────┬──────────┬───────────────────┬───────────────┐
│ Library │ Vulnerability  │ Severity │ Installed Version │ Fixed Version │
├─────────┼────────────────┼──────────┼───────────────────┼───────────────┤
│ PyYAML  │ CVE-2020-14343 │ CRITICAL │ 5.3               │ 5.4           │
└─────────┴────────────────┴──────────┴───────────────────┴───────────────┘
```

CVE-2020-14343 allows arbitrary code execution when untrusted YAML is loaded with `full_load`. Upgrade the
dependency, and use `yaml.safe_load` regardless. Automate the upgrades with Dependabot or Renovate, or you'll be
fixing the same class of finding forever.

> SCA vs vulnerability scanning: SCA looks at the libraries **your application** pulls in. Vulnerability scanning
> (covered later) looks at the **host or image** your application runs on. You need both.
{: .prompt-info }

## Build stage

### SBOM: Software Bill of Materials

An SBOM is a **machine-readable inventory** of every component in your software: name, version, supplier,
licence and hashes, in a standard format (CycloneDX or SPDX). It isn't a scan in itself. It's the artifact that
makes scanning and incident response fast. When the next Log4Shell-style vulnerability drops, teams with SBOMs
answer "are we affected?" with a query instead of a week of grepping.

**For orders-api**, generate one at build time and store it with the image:

```bash
syft dir:. -o cyclonedx-json > sbom.cdx.json
# or, with Trivy
trivy fs --format cyclonedx --output sbom.cdx.json .
```

Regulations increasingly expect SBOMs for software sold to governments and regulated industries, so it's worth
producing them now even if nobody has asked yet.

### Container image scanning

Container scanning checks the **image you ship**: OS packages in the base image (Debian, Alpine), language
packages inside it, and Dockerfile misconfigurations such as running as root or copying secrets in. Scan in CI
before pushing, and again in the registry, because new CVEs appear for images that haven't changed.

**In orders-api**, the Dockerfile uses an end-of-life Python base image and runs as root:

```dockerfile
FROM python:3.8
COPY . /app
RUN pip install -r /app/requirements.txt
CMD ["python", "/app/run.py"]
```

```bash
trivy image --severity HIGH,CRITICAL orders-api:1.0   # vulnerable OS and Python packages
trivy config Dockerfile                               # misconfigurations, e.g. running as root
```

Python 3.8 reached end of life in October 2024, so its base images stop getting fixes. The fix: move to a
supported slim base image (`python:3.12-slim`), add a non-root `USER`, and use a multi-stage build so compilers and
build tools don't ship to production.

### IaC scanning

Infrastructure-as-code scanning checks **Terraform, CloudFormation, Bicep, Kubernetes manifests and Helm charts**
for insecure configuration before it's deployed: open security groups, public buckets, missing encryption,
privileged pods. It's SAST for infrastructure, and it prevents the misconfigurations that CSPM would otherwise
find in production.

**In orders-api**, `infra/main.tf` opens SSH to the world:

```hcl
resource "aws_security_group" "orders" {
  name = "orders-api"
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

```text
$ checkov -d infra/
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
        FAILED for resource: aws_security_group.orders
        File: /main.tf:1-10
```

The fix: restrict the CIDR to your VPN range, or better, drop SSH and use AWS Systems Manager Session Manager.
(If you've used tfsec, note that it has been folded into Trivy, which now covers IaC scanning too. See the older
[tfsec post](/posts/devsecops/tfsec/tfsec/) for context.)

### Software supply chain: signing and provenance

Scanning tells you what's in an artifact. **Signing and provenance** tell you where it came from and that nobody
tampered with it on the way. Sign images in CI (Sigstore's `cosign`), attach build provenance (the SLSA
framework), and verify signatures at deploy time with an admission controller, so only images built by your
pipeline can run.

**For orders-api:**

```bash
cosign sign --yes registry.example.com/orders-api@sha256:4f1c...e9a2
cosign verify registry.example.com/orders-api@sha256:4f1c...e9a2 \
  --certificate-identity-regexp 'https://github.com/acme/orders-api/.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

## Test stage

### DAST: Dynamic Application Security Testing

DAST attacks the **running application from the outside**, like an attacker would. It knows nothing about the
code. It crawls pages and endpoints, sends malicious inputs, and looks at the responses for XSS, injection,
missing security headers, insecure cookies and server misconfiguration. Because it tests the deployed system, it
finds problems that only appear at runtime: a proxy that strips headers, a debug mode left on, a misconfigured TLS
setup.

**Against orders-api** running in a test environment:

```bash
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://staging.orders.internal:5000
```

```text
WARN-NEW: Content Security Policy (CSP) Header Not Set [10038] x 3
WARN-NEW: Missing Anti-clickjacking Header [10020] x 3
FAIL-NEW: Cross Site Scripting (Reflected) [40012] x 1   -> /search?q=
```

The baseline scan is passive and safe to run against shared environments. Full active scans send real attack
payloads, so run them against a dedicated test environment. DAST tells you **what** is exploitable, but not
**which line of code** to fix, which is where IAST comes in. There's more on ZAP in the
[OWASP ZAP post](/posts/devsecops/owaspzap/owaspzap/).

### IAST: Interactive Application Security Testing

IAST puts an **agent inside the running application** (for Python, an instrumented module loaded at startup)
while your functional tests or DAST scan exercise it. Because it sees both the incoming HTTP request and the code
executing underneath, it can confirm that a request parameter really reaches a SQL query unsanitised, and report
the exact line, with far fewer false positives than SAST.

**In orders-api**, running the integration test suite with an IAST agent enabled would report something like:
"SQL injection: untrusted data from `request.args['q']` reaches `db.execute()` at `app/routes.py:12` via
`/search`." That's the same bug SAST flagged, but now confirmed as exploitable. The trade-offs: an agent per
language runtime, some performance overhead, and coverage limited to the code your tests actually execute.
Commercial examples include Contrast Assess and Black Duck Seeker.

### API security testing

Modern applications are mostly APIs, and the most common API flaws are about **authorisation logic**, which
generic scanners miss. The OWASP API Security Top 10 is led by Broken Object Level Authorization (BOLA): user A
can read user B's data just by changing an ID. API testing tools import your OpenAPI spec, then test every
endpoint with different users, tokens and payloads.

**In orders-api**, logged in as customer 42:

```bash
curl -H "Authorization: Bearer $TOKEN_FOR_CUSTOMER_42" https://staging.orders.internal/orders/1337
# 200 OK  {"id": 1337, "customer_id": 77, "item": "laptop", "address": "..."}   <- someone else's order
```

The fix belongs in the code: check `order.customer_id == current_user.id` on every object lookup, ideally in one
shared helper. Tools include ZAP's API scan, Burp Suite, 42Crunch, StackHawk and the API testing in GitLab,
Checkmarx and Snyk.

### Fuzzing

Fuzzing feeds **huge numbers of random or mutated inputs** into a function or endpoint and watches for crashes,
hangs and unhandled exceptions. It's excellent at finding the edge cases nobody thought to write a test for: parsers,
file formats, protocol handlers. Coverage-guided fuzzers mutate inputs that reach new code paths, so they get
deeper over time.

**In orders-api**, fuzz the order parser with Atheris, Google's Python fuzzer:

```python
# fuzz_parse_order.py
import sys
import atheris

with atheris.instrument_imports():
    from app.orders import parse_order

def test_one_input(data: bytes) -> None:
    fdp = atheris.FuzzedDataProvider(data)
    try:
        parse_order(fdp.ConsumeUnicodeNoSurrogates(512))
    except ValueError:
        pass   # expected for invalid input; anything else is a bug

atheris.Setup(sys.argv, test_one_input)
atheris.Fuzz()
```

A typical finding: a payload like `{"quantity": []}` raises `TypeError` deep inside, which becomes a 500 error,
and in other codebases sometimes a denial of service.

## Run stage

### CSPM: Cloud Security Posture Management

CSPM continuously checks your **live cloud accounts** against security best practices and compliance frameworks
(CIS, PCI DSS, ISO 27001): public storage, disabled logging, overly permissive IAM, unencrypted databases, root
accounts without MFA. IaC scanning catches problems before deployment. CSPM catches everything that was clicked
together in the console, drifted, or was never in code at all.

**For orders-api's AWS account:**

```bash
prowler aws --services s3 cloudtrail iam
```

```text
FAIL  s3_bucket_public_access     orders-invoices bucket allows public read
FAIL  cloudtrail_multi_region     CloudTrail is not enabled in all regions
FAIL  iam_root_mfa_enabled        Root account has no MFA
```

CIEM (Cloud Infrastructure Entitlement Management) is a close relative. It focuses on **identities and
permissions**: unused admin roles, keys that never rotate, and roles that can escalate to admin.

### Runtime protection: CWPP and RASP

Scanning finds weaknesses. Runtime protection watches for **attacks in progress**.

- **CWPP** (Cloud Workload Protection Platform) watches hosts, containers and serverless functions at runtime, usually with an eBPF sensor or agent: unexpected processes, shells in containers, crypto-miners, privilege escalation, drift from the original image.
- **RASP** (Runtime Application Self-Protection) runs inside the application, like IAST, but in production, and **blocks** attacks such as a SQL injection payload reaching the database driver.

**For orders-api**, a Falco rule alerts if anyone gets a shell inside the container, which is a classic sign of
compromise:

```yaml
- rule: Shell in orders-api container
  desc: Detect a shell spawned inside the orders-api container
  condition: spawned_process and container and container.image.repository endswith "orders-api" and proc.name in (bash, sh)
  output: Shell spawned in orders-api (user=%user.name cmd=%proc.cmdline container=%container.name)
  priority: WARNING
```

### CNAPP and ASPM: the umbrellas

Two more acronyms describe **platforms** rather than techniques:

- **CNAPP** (Cloud-Native Application Protection Platform) bundles CSPM, CWPP, CIEM, container scanning and IaC scanning into one product with a shared view of risk. Wiz, Prisma Cloud (now Cortex Cloud), Aqua and Microsoft Defender for Cloud are CNAPPs.
- **ASPM** (Application Security Posture Management) pulls findings from all your scanners (SAST, SCA, DAST, secrets and so on), deduplicates them, maps them to owners and services, and prioritises by real risk, such as "internet-facing, handles payment data, exploitable". If you have five scanners and 40,000 findings, ASPM is what stops the security team drowning.

### Vulnerability scanning (hosts and infrastructure)

Classic vulnerability scanning probes **servers, VMs, network devices and their operating systems** for known
CVEs, missing patches and weak services, either over the network or with an agent. It's the oldest technique on
this list and still essential, because your application is only as safe as the box it runs on.

**For orders-api's EC2 host**, an agent-based scan (Amazon Inspector, Qualys, Tenable Nessus or the open-source
OpenVAS) might report:

```text
CRITICAL  CVE-2024-6387  OpenSSH 9.2p1  "regreSSHion" remote code execution  -> upgrade openssh-server
HIGH      Kernel 6.1.0-18 has 3 known privilege escalation CVEs               -> apply OS updates and reboot
```

### Penetration testing

A penetration test is **humans attacking your system** with permission, chaining small weaknesses into real
impact, the way an attacker would. No tool on this list would combine "verbose error reveals internal hostnames",
"BOLA on /orders" and "SSRF in the invoice PDF generator" into "read every customer's address". A good tester
will. Do it before major launches and at least yearly, and treat findings as input for which automated checks to
add.

## Summary: which technique finds what

| Technique | Looks at | When | Finds in orders-api | Misses |
|---|---|---|---|---|
| SAST | Your source code | IDE, PR, CI | SQL injection in `/search` | Runtime config, auth logic |
| Secrets scanning | Code and git history | Pre-commit, push, CI | Hard-coded AWS key | Secrets in running systems |
| SCA | Third-party dependencies | PR, CI, continuously | PyYAML CVE-2020-14343 | Bugs in your own code |
| SBOM | Component inventory | Build | (Enables fast impact analysis) | Not a test by itself |
| Container scanning | The image | CI, registry | EOL base image, root user | App logic bugs |
| IaC scanning | Terraform and manifests | PR, CI | SSH open to 0.0.0.0/0 | Console changes, drift |
| DAST | Running app, from outside | Test or staging | Reflected XSS, missing headers | Exact code location |
| IAST | Running app, from inside | During tests | Confirms SQLi with line number | Untested code paths |
| API testing | API endpoints and auth | Test or staging | BOLA on `/orders/<id>` | Non-API surfaces |
| Fuzzing | Functions and parsers | CI, nightly | Crash on malformed input | Logic and auth flaws |
| CSPM | Live cloud accounts | Continuously | Public S3 bucket, no CloudTrail | App vulnerabilities |
| CWPP / RASP | Running workloads | Production | Shell in container, live SQLi | Pre-production issues |
| Vulnerability scanning | Hosts and OS | Continuously | OpenSSH CVE on the EC2 host | App-level flaws |
| Pen testing | Everything, by humans | Before launches, yearly | Chained attack paths | Continuous coverage |

## Tool comparison: paid and open source

The landscape consolidates fast. Vendors acquire each other, rename products and add modules every year. The
table below reflects the products' documented capabilities as I researched them. ✓ means the capability is
built in, ◐ means partial (an add-on, preview, limited scope, or via integration), and — means it isn't offered.
Check current packaging with the vendor before buying, because modules are often licensed separately.

### Commercial platforms

| Tool | SAST | SCA | Secrets | IaC | Container | DAST | CSPM | Runtime | SBOM |
|---|---|---|---|---|---|---|---|---|---|
| GitHub Advanced Security (Code Security + Secret Protection) | ✓ CodeQL | ✓ Dependabot | ✓ push protection | ◐ via SARIF | ◐ | — | — | — | ✓ |
| GitLab Ultimate | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Snyk | ✓ Code | ✓ Open Source | ? | ✓ | ✓ | ✓ API & Web | ◐ | — | ✓ |
| SonarQube (Server / Cloud) | ✓ | ◐ Advanced Security add-on | ✓ | ✓ | ◐ Dockerfile rules | — | — | — | ◐ add-on |
| Checkmarx One | ✓ | ✓ | ✓ | ✓ KICS | ✓ | ✓ | — | — | ✓ |
| Veracode | ✓ | ✓ | ◐ | ✓ | ✓ | ✓ | — | — | ✓ |
| OpenText Fortify | ✓ | ✓ Debricked | ◐ | ◐ | ◐ | ✓ WebInspect | — | — | ✓ |
| Black Duck (Coverity, Black Duck SCA) | ✓ Coverity | ✓ | ◐ | ◐ | ✓ | ✓ | — | — | ✓ |
| Mend.io | ✓ | ✓ | ◐ | — | ✓ | ? | — | — | ✓ |
| Wiz (Wiz Code, Wiz Cloud, Wiz Defend) | ◐ preview | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ | ✓ |
| Prisma Cloud / Cortex Cloud | — | ✓ | ✓ | ✓ Checkov | ✓ | — | ✓ | ✓ | ✓ |
| Aqua Security | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Microsoft Defender for Cloud | ◐ via DevOps integrations | ◐ | ◐ | ◐ | ✓ | — | ✓ | ✓ | — |

`?` means I couldn't confirm the capability in the vendor's current documentation when researching this post.

### Open-source tools

| Tool | SAST | SCA | Secrets | IaC | Container | DAST | CSPM | Runtime | SBOM |
|---|---|---|---|---|---|---|---|---|---|
| Trivy | — | ✓ | ✓ | ✓ | ✓ | — | ◐ Kubernetes | — | ✓ |
| Semgrep Community Edition | ✓ | — | — | ◐ rules | — | — | — | — | — |
| Bandit (Python only) | ✓ | — | ◐ hard-coded passwords | — | — | — | — | — | — |
| OWASP Dependency-Check | — | ✓ | — | — | — | — | — | — | — |
| OSV-Scanner | — | ✓ | — | — | ✓ | — | — | — | ◐ reads SBOMs |
| Grype + Syft (Anchore) | — | ✓ Grype | — | — | ✓ | — | — | — | ✓ Syft |
| Checkov | — | ◐ | ✓ | ✓ | ◐ Dockerfile | — | — | — | — |
| Gitleaks | — | — | ✓ | — | — | — | — | — | — |
| TruffleHog | — | — | ✓ verifies live keys | — | — | — | — | — | — |
| OWASP ZAP | — | — | — | — | — | ✓ | — | — | — |
| Prowler | — | — | — | — | — | — | ✓ | — | — |
| Falco | — | — | — | — | — | — | — | ✓ | — |

Several open-source tools have commercial big siblings: Semgrep's paid platform adds supply-chain (SCA) and
secrets scanning, Trivy comes from Aqua, Checkov from Palo Alto (Bridgecrew), Grype and Syft from Anchore, and ZAP
is now maintained with Checkmarx's backing. Starting with the open-source version and upgrading when you need
central management, dashboards and support is a perfectly good strategy.

### A free baseline for the orders-api pipeline

If you're starting from nothing, this combination covers most techniques at zero licence cost:

| Stage | Tool | Covers |
|---|---|---|
| Pre-commit and CI | Gitleaks | Secrets |
| CI | Semgrep CE + Bandit | SAST |
| CI | Trivy | SCA, container, IaC, SBOM |
| CI | Checkov | Extra IaC policies |
| Staging | ZAP baseline scan | DAST |
| Cloud account | Prowler | CSPM |
| Kubernetes | Falco | Runtime |
| Repo hygiene | Dependabot or Renovate | Automated dependency updates |

## How I'd choose

There's no single best tool, but there are sensible defaults:

- **Already on GitHub or GitLab?** Start with what the platform includes: GitHub Code Security and Secret Protection, or GitLab Ultimate's scanners. Native integration into pull requests matters more than a few extra rules.
- **Code quality and security together?** SonarQube is the familiar choice. See the [SonarQube post](/posts/devsecops/sonarqube/sonarqube/).
- **Heavy open-source dependency use and a developer-first workflow?** Snyk or Mend, both strong on SCA with automated fix PRs.
- **Regulated enterprise with many languages and audit needs?** Checkmarx One, Veracode, Fortify or Black Duck, which offer broad language coverage, compliance reporting and DAST in one contract.
- **Cloud-first and container-heavy?** A CNAPP (Wiz, Cortex Cloud, Aqua or Defender for Cloud), paired with a code-focused tool for SAST.
- **Tight budget?** The free baseline above, and grow from there.

Whatever you pick, two things matter more than the logo: findings must show up **where developers already work**
(pull requests, the IDE), and someone must **own triage**. A scanner nobody looks at is just an expensive cron job.

## Common pitfalls

- **Failing every build on every finding.** Developers will route around it. Block on new, high-severity, high-confidence issues, and track the rest.
- **Scanning only at release time.** Shift left. A SAST finding on a pull request costs minutes, and the same finding a week before release costs a sprint.
- **Treating SCA alerts as optional.** Known vulnerable dependencies are the easiest thing for attackers to exploit, because the exploit is often public.
- **Rotating nothing after a secret leak.** Removing the line from git doesn't revoke the key. Rotate first, then clean up.
- **Scanning images once.** New CVEs are published daily. Rescan images in your registry and running clusters continuously.
- **Buying a platform, skipping the process.** Tools find issues. Ownership, SLAs and a triage routine fix them.

## Conclusion

Each technique looks at a different layer of the same application. SAST, secrets scanning and SCA look at your
code and what it pulls in. Container and IaC scanning look at what you build. DAST, IAST, API testing and fuzzing
look at how it behaves. CSPM, runtime protection, vulnerability scanning and pen testing look at where it runs. No
single tool covers all of it, so map the gaps in your current pipeline against the summary table above, close the
cheapest ones first (secrets, SCA, IaC), and add the rest as your risk demands. For the broader picture, see the
[DevSecOps overview](/posts/devsecops/devsecops/) and the
[DevSecOps interview questions](/posts/devsecops/devsecops-interview-questions/).

## References

- [OWASP: Source Code Analysis Tools](https://owasp.org/www-community/Source_Code_Analysis_Tools)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [GitHub: Introducing GitHub Secret Protection and GitHub Code Security](https://github.blog/changelog/2025-03-04-introducing-github-secret-protection-and-github-code-security/)
- [SonarQube Advanced Security](https://docs.sonarsource.com/sonarqube-server/latest/advanced-security/introduction)
- [Introducing Wiz SAST](https://www.wiz.io/blog/introducing-wiz-sast-where-code-risk-meets-cloud-context)
- [Palo Alto Networks: Cortex Cloud](https://www.paloaltonetworks.com/blog/cloud-security/cortex-cloud-third-wave-cnapp-innovation)
- [Trivy documentation](https://trivy.dev/latest/docs/)
- [Checkov documentation](https://www.checkov.io/)
- [ZAP baseline scan](https://www.zaproxy.org/docs/docker/baseline-scan/)
- [Atheris: a coverage-guided Python fuzzer](https://github.com/google/atheris)
- [Sigstore cosign](https://docs.sigstore.dev/cosign/signing/overview/)
- [SLSA framework](https://slsa.dev/)
- [Falco rules](https://falco.org/docs/concepts/rules/)
- [Prowler](https://docs.prowler.com/)
