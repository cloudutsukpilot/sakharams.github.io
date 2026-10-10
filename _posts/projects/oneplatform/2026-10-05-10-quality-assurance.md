---
layout: post
title: "OnePlatform: Quality Assurance"
date: 2026-10-05 00:10:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, QA, Testing]
description: "Testing OnePlatform: 2,693 unit, 356 Testcontainers integration and 30 Playwright tests, ~1,850 .NET tests, a SonarQube gate and a pre-upgrade compatibility run."
project: oneplatform
project_step: 10
image:
  path: /assets/img/projects/oneplatform/10-quality-assurance.webp
  alt: "OnePlatform: Quality Assurance - Projects hero image"
---

The scariest change on OnePlatform isn't a new feature. It's the monthly Backstage upgrade, which touches every one of 45 custom plugins at once. That shaped our testing: four separate lanes, each owning a different kind of risk, and a compatibility run that exercises all of them before an upgrade merges. This post goes through each lane and the gaps we still have.

<!-- more -->

{% include project-nav.html %}

## Unit testing
{: #unit-testing }

The portal's unit lane is everything that doesn't need a real database, a running app or a browser: pure logic, React component tests, plugin registration tests and composition tests with dependencies virtualized in process. At one recorded green run it held **2,693 tests in 221 suites across 27 Jest projects**, with no snapshots.

```bash
CI=true yarn test                               # full unit lane
CI=true yarn workspace backend backstage-cli package test \
  --testPathPatterns='healthcheck\.test\.ts$' --runInBand
yarn test:leaks                                 # --detectOpenHandles for timers and listeners
```

Representative tests: the real frontend feature graph (`App.composition.test.ts`), backend health behaviour, each plugin's registration, and component state rendering. The file suffix is the contract: `.test.ts` runs here and `.integration.test.ts` never does.

The middleware has about **1,850 xUnit test methods**, mostly unit tests with hand-rolled fakes rather than a mocking library, and coverage badges regenerated on main.

## Integration testing
{: #integration-testing }

Integration tests prove the boundaries unit tests fake: PostgreSQL migrations and queries, backend HTTP routes, API-client request contracts, React pages backed by real clients, and startup and shutdown behaviour. They run against **PostgreSQL 16 in Testcontainers**. One recorded green run: **356 tests in 62 suites**, covering owned migrations, persistence and concurrency, routes, production API clients, page state matrices, catalog processing, scaffolder task execution, schedulers, readiness and shutdown cleanup.

```bash
TESTCONTAINERS_RYUK_DISABLED=true CI=true yarn test:integration
```

The middleware's integration project uses Testcontainers for both PostgreSQL and SQL Server, which matters for termination and SQL monitoring, where the SQL Server side is real.

## Contract testing
{: #contract-testing }

We don't use a consumer-driven contract tool such as Pact. The contracts we test are the ones that would break silently:

- **Portal API clients versus backend routes:** integration tests run the production client against the real router, so a renamed field fails a test, not a page.
- **Portal versus middleware:** the middleware plugin's router tests check request shape, auth header and error mapping, including that the delegated token never leaks into a response body.
- **Published contracts** (HITL v1, notifications API): documented with request and response examples.

> **TODO:** Is there any test that runs the portal's middleware client against a real middleware build? If not, I'd add one smoke test per endpoint family in the middleware integration lane.
{: .prompt-warning }

## End-to-end testing
{: #end-to-end-testing }

Playwright owns what Jest can't prove: routing, sign-in boundaries, responsive shell behaviour and client-side errors. It's deliberately small: **30 tests in 2 specs**. The root page renders, the Create route requires sign-in, ten protected routes keep their path behind the sign-in boundary, unknown routes are stable, there are no unexpected console errors or failed requests, and mobile and desktop shells don't overflow. One authenticated journey uses a synthetic user to create a draft in the routing sheet workflow.

Authenticated E2E needs an identity without real credentials, so a **guest provider exists only in the E2E backend config**. It appears only when Playwright sets a browser flag; production sign-in stays Entra-only.

## Regression testing
{: #regression-testing }

Every PR runs the unit and integration lanes plus SonarQube. Every Backstage upgrade runs the **pre-upgrade compatibility workflow**: unit tests on the Node matrix, integration on Node 24 with PostgreSQL 16, an enterprise database matrix on PostgreSQL 16 and 17, the E2E lane, and a runtime image preflight. Bugs get a test in the lane that would have caught them before the fix merges.

## Performance and load testing
{: #performance-and-load-testing }

This is a gap. Performance work so far has been diagnosis-driven: catalog ingestion locked the database, so we split it per subscription; SQL schedule compliance blocked the UI thread, so it moved to a Web Worker.

> **TODO:** No load tests exist in either repo. What's the expected peak (concurrent users, template runs per hour)? I'd start with a k6 script against search, the catalog list and the two heaviest dashboards, run against staging before each upgrade.
{: .prompt-warning }

## Security testing
{: #security-testing }

- Permission tests per role in the backend policy, plus 403 cases in route integration tests.
- E2E checks that protected routes are not reachable anonymously.
- SonarQube on both repos, CodeQL configuration in the middleware.
- Dependabot and vulnerable-package scans after dependency changes.

The PHI filter rules need their own tests ([Security](/posts/projects/oneplatform/06-security-and-privacy/#security-testing-and-incident-response)).

## Accessibility testing
{: #accessibility-testing }

There's no automated accessibility check today. The cheapest useful step is adding `@axe-core/playwright` to the existing E2E spec for the root shell and the Create page, failing on serious violations. It fits in the lane we already run.

> **TODO:** Agree whether accessibility violations should block a merge or only report, and on which pages.
{: .prompt-warning }

## Compatibility testing
{: #compatibility-testing }

Compatibility for OnePlatform means versions, not browsers: Node versions, PostgreSQL versions, and Backstage plus its plugin ecosystem. The pre-upgrade workflow covers the first two. External plugins (like the routing sheet packages) are pinned to exact versions in both app and backend, and the host app's E2E test exercises the published package, not a workspace link. Browser coverage is Chromium in Playwright; that's enough for an internal tool on managed desktops.

## User acceptance testing
{: #user-acceptance-testing }

Development is the first place users see a change: every release deploys there automatically through Argo CD, and requesters try their feature there. Staging is the last stop before production.

> **TODO:** Who signs off UAT for a feature (the requester, the product owner?), and is it recorded on the ticket? This is the "tested before release" evidence for each feature deep-dive.
{: .prompt-warning }

## Test data and test environment management
{: #test-data-and-test-environment-management }

Rules that are already written down: E2E uses synthetic identities and intercepts feature APIs with synthetic responses, never real Azure AD credentials, PHI, PII, production data or live services. Integration tests get a fresh PostgreSQL container per run. The middleware email service can redirect non-production recipients to test accounts through config, so a reminder job in staging needn't email real managers.

## Checklist
{: #checklist }

- [ ] Unit and integration lanes green on every PR, with leaks checks in CI
- [ ] Pre-upgrade compatibility run green before any Backstage upgrade merges
- [ ] Table-driven tests for every PHI filter rule
- [ ] One portal-to-middleware smoke test per endpoint family
- [ ] A k6 baseline for search, catalog and the two heaviest dashboards
- [ ] axe checks on the root shell and Create page in Playwright
- [ ] UAT sign-off recorded on each feature's ticket
- [ ] Synthetic-data rule enforced in review for every new E2E test

{% include project-nav.html %}
