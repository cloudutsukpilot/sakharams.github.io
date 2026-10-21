---
published: false
layout: post
title: "OnePlatform: User Experience and Design"
date: 2026-10-05 00:04:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, UX, Design]
description: "How OnePlatform's UX works: one Create page as a role-filtered launcher, guarded template forms with smart pickers, a shared UI library and dual themes."
project: oneplatform
project_step: 4
image:
  path: /assets/img/projects/oneplatform/04-user-experience-and-design.webp
  alt: "OnePlatform: User Experience and Design - Projects hero image"
---

The hardest UX problem in OnePlatform wasn't any one screen. It was making 45+ templates and two dozen dashboards feel like one product to people who log in twice a month. Our answer was a handful of conventions applied everywhere: one place to start, forms that only offer what you're allowed to pick, and one shared component library. This post walks through them.

<!-- more -->

{% include project-nav.html %}

## Information architecture
{: #information-architecture }

The portal has four top-level ideas, and the sidebar mirrors them:

| Area | What lives there |
|---|---|
| **Home** | Tabbed landing page, search, shortcuts |
| **Catalog** | Components, APIs, systems, Azure resources, users, teams; entity pages with cost, monitoring and relations |
| **Create** | Every self-service action *and* every insights dashboard, grouped by category and use case |
| **Docs** | TechDocs for every repo that publishes them |

Then there are role-specific entries such as Operations, Copilot, FinOps reports and admin pages. They come and go per user because [role-aware navigation](/posts/projects/oneplatform/03-product-planning/#feature-catalog) hides what your role can't use.

The decision I'd defend hardest: **dashboards are registered as templates too.** An insights "template" has no real steps. It carries a permission, a category, a use case and a page link. So the Create page becomes a single, permission-filtered launcher for everything, and a new dashboard needs no new sidebar entry:

```yaml
metadata:
  name: insights-finops-reports
  title: FinOps Reports
  annotations:
    <portal>/permission: 'template.insights-finops-reports.create'
    <portal>/use-case: 'Finance'
    <portal>/category: 'Insights'
    <portal>/page-link: '/finops-reports'
```

## User flows
{: #user-flows }

Most flows in the portal are the same flow: pick a template, fill a guarded form, let the backend check and act, get told the result. Here's that flow, with the denial path as a second mode:

{% include flow-anim.html id="projects/oneplatform/self-service-request" %}

Two details matter for UX. The **check happens twice**: the form hides or disables what you can't do, and the backend enforces it anyway. And the **result finds you**: run notifications arrive in the sidebar, failed runs include the error and a link, so nobody watches a spinner for a ten-minute Terraform run.

## Wireframes and prototypes
{: #wireframes-and-prototypes }

We don't keep a separate design tool. Each feature's DESIGN document *is* the wireframe: component tree, layout sketch in text, states (loading, empty, error, unauthorized), and the data each element needs. For dashboards that replaced an existing tool, the existing tool was the prototype. The API gateway dashboard was a port of a working Streamlit script, so we knew the charts were useful before writing any React.

I'd recommend this for internal portals. Text designs live next to the code, get reviewed in the same PR as the plan, and stay true because the implementation checklist refers back to them.

> **TODO:** Did any feature get a clickable prototype or a design review with users before build? If so, name one; it's a good story for the feature deep-dives.
{: .prompt-warning }

## Visual design and design system
{: #visual-design-and-design-system }

Backstage brings Material UI. On top of it we built **`common-ui`**, an internal library that every plugin must use for shared patterns: page header, loading and formatted messages, expandable instructions, labeled switches, summary bubbles, and a standard *Unauthorized* view. A repository skill tells contributors (and the AI assistant) to reach for `common-ui` before writing a component.

The second piece is **theme**. We override Backstage's light and dark themes with explicit OnePlatform variants. Every shared component and the dense visual pages (the service map, charts) read semantic colours from the active theme instead of hard-coded hex values. Users switch in Settings, and the choice is stored in the browser only.

## Interaction patterns
{: #interaction-patterns }

The patterns we reuse across templates:

- **Pickers, not text boxes.** Custom field extensions (40+) list only valid choices: subscriptions you can use, VMs in allowed environments, vaults, queues, GitHub teams, Entra users. Free text is the exception.
- **Validate as you go.** Name availability, "does this group exist", "is this VM already running" are checked inside the form, before submit.
- **Approve where you are.** Copilot requests show status to the requester and the decision buttons to approvers, on the same page.
- **Cascade, don't retype.** File monitoring fields entered on one Jira definition flow into the next, and values survive Back/Next.
- **Guided tour for dense pages.** The service map has a five-step tour with spotlight highlights for first-time users.

## Responsive behavior
{: #responsive-behavior }

OnePlatform is a desktop tool. People use it at a desk with a wide screen, and the data grids and service map need the width. We still guard the basics: the E2E suite checks that the shell has no horizontal overflow on mobile and desktop, and that the sign-in boundary stays visible on a phone. Beyond that, I wouldn't spend effort on mobile layouts for dashboards.

## Accessibility design
{: #accessibility-design }

What we get from the stack: MUI's keyboard and ARIA behaviour, and semantic theme colours that hold contrast in both themes. What we add: every chart has the numbers available in a grid, and status is never shown by colour alone (labels such as *Watch*, *High*, *Saturated* on API gateway capacity).

> **TODO:** Has anyone run an accessibility audit (axe, Lighthouse, screen-reader pass) on the main flows? Record the result here or in [QA](/posts/projects/oneplatform/10-quality-assurance/#accessibility-testing).
{: .prompt-warning }

## Usability testing
{: #usability-testing }

Usability feedback mostly arrives as tickets, and several features exist because of it. The Jira definition cascade came from users reporting duplicate input and lost values on navigation. The Copilot self-service page came from requesters asking "where is my request?". Adoption Insights then shows whether a change got used.

> **TODO:** Is there any structured usability testing (observed sessions, a pilot group per role)? If not, I'd suggest a 30-minute observed session with one person per role before each major page ships.
{: .prompt-warning }

## Content and messaging
{: #content-and-messaging }

The rules we write to. The first two are already the norm; the rest are what I push for in review, and not every older template meets them yet:

- Template titles start with a verb or "Access to …": *Start Azure Virtual Machine*, *Access to Azure Key Vault*.
- Each template opens with expandable instructions saying what will happen, how long it takes and who approves.
- Errors say what to do next. "You don't have permission" should name the role that does.
- Notifications carry the outcome in the title ("Function App created", "Run failed") and the details in the body.
- System alerts (admin-managed banners) are for outages and maintenance only, so people don't learn to ignore them.

## Checklist
{: #checklist }

- [ ] Every new page uses `common-ui` header, loading, empty and unauthorized states
- [ ] Every new template has instructions, pickers for constrained fields and in-form validation
- [ ] New dashboards are registered as insights templates with permission, category and page link
- [ ] Both themes checked for every new page
- [ ] Status never conveyed by colour alone
- [ ] Accessibility pass on the five most-used flows
- [ ] One observed session per affected role before a major page ships

{% include project-nav.html %}
