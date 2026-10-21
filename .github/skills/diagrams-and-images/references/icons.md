# Icons, shapes and colours

The diagram engines and the hero template draw two kinds of icon. Both stay where the **site** serves
them, never inside this skill folder: published pages load them in the reader's browser.

## Built-in line icons

Defined in `ICONS` in [assets/js/diagram.js](../../../../assets/js/diagram.js) (the same names exist in
`flow-anim.js`). The validators read the list from the engine, so it can't drift. Use the bare name:
`icon: database`.

user, users, browser, phone, laptop, globe, router, balancer, firewall, cloud, server, cpu, cluster,
container, function, api, database, bucket, queue, file, bolt (cache), lock, key, shield, cert, chart,
bell, search, clock, check, cross, git, code, gear, terminal, package, rocket, mail, message

## Tool logos

About 290 SVG logos under [assets/img/icons/](../../../../assets/img/icons/), referenced relative to
that folder: `icon: "devops/monitoring/grafana-18.svg"`. They are drawn on a light tile, so dark
logos stay visible.

| Folder | What is there |
|---|---|
| `cloud/aws/services/`, `cloud/azure/services/`, `cloud/gcp/services/` | Cloud services (EKS, AKS, GKE, Route 53, Key Vault, Entra ID, Cloud Run, BigQuery, …) |
| `cloud/azure/{compute,containers,networks,security,storage}/` | Azure resources by type |
| `devops/cicd/` | GitHub, GitHub Actions, GitLab, Jenkins, Azure DevOps, Spinnaker, … |
| `devops/orchestration/` | Kubernetes, Docker, Helm, Terraform; `kubernetes/pod.svg` |
| `devops/monitoring/` | Grafana, Prometheus, Loki, Datadog |
| `devops/iac/`, `devops/configurationmanagement/` | Terraform, CloudFormation, ARM, Ansible, Puppet, Chef, Consul, … |
| `devsecops/` | SonarQube, Snyk, OWASP ZAP, tfsec, Fortify |
| `databases/` | PostgreSQL, SQL Server |
| `iam/`, `operatingsystems/`, `virtualization/`, `programming/`, `miscellaneous/` | Identity, OSes, hypervisors, languages, generic |

Find one by name instead of browsing:

```bash
python3 .github/skills/diagrams-and-images/scripts/flow-anim/enrich.py --find <word>    # lists candidate logos
python3 .github/skills/diagrams-and-images/scripts/flow-anim/enrich.py <flow-anim.yml> --write   # auto-picks icons for a flow-anim file
```

Matching uses the file names plus the `ALIASES` in
[common/lib/blog.py](../common/lib/blog.py) (`k8s` → Kubernetes, …).

**No logo for a tool** (Keycloak, Argo CD, Qdrant, …)? Use the closest built-in icon (`key`,
`rocket`, `database`) and keep the tool's name in `label` or `sub`. Never draw or approximate a brand
logo by hand. To add a real logo, ask the user for an official SVG, save it as
`assets/img/icons/<area>/<tool>-18.svg`, and add an alias if the file name differs from how posts
spell the tool.

## Shapes

- **Explorable diagrams:** every component is an icon disc with its label underneath, and an open
  group is a frame with a header icon. There are no shape options.
- **Flow-anim:** `shape: box` (default), `terminal` (start or end pill), `diamond` (decision),
  `cylinder` (database, repository, queue), `circle` (actor or event), `site` (a disc with halo rings,
  for regions and locations). See [flow-anim.md](flow-anim.md#3-lay-it-out).

## Colours

Palette names for `color`: blue, sky, teal, green, lime, amber, orange, red, rose, pink, violet,
indigo, slate, or `#RRGGBB`. By role: people/clients `blue`, edge/network `teal` (`sky` for cloud),
compute/services `violet`, data/storage/queues `amber`, security/identity `rose`, observability
`green`, messaging `pink`, external/third party `slate`, delivery `orange`. Arrow colours come from
the communication kind (request, stream, event, data, telemetry, control), which comes from `proto`.

The accent pair (`accent`, `accent2`) comes from the post's category in
[common/brand.json](../common/brand.json). Run `python3 $COMMON/post_context.py <post>` and use
`palette.accent` / `palette.accent2`, or take the category entry (`default` when unsure).
