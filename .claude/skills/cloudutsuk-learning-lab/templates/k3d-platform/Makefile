SHELL   := bash
CLUSTER ?= __CLUSTER__
CTX     := k3d-$(CLUSTER)
KUBECTL := kubectl --context $(CTX)
IMAGE   ?= __APP__:dev
SITE    ?= http://127.0.0.1:__SITE_PORT__
GRAFANA ?= https://grafana.mon.home.cloudutsuk.com
# Lab contract v2 (homelab Phase 2 step 5): infra-local's host/labs/lab.sh joins this cluster to the
# platform (Argo CD installs the monitoring pack; the dashboards go to mon's Grafana, folder Labs).
HOMELAB_INFRA ?= $(HOME)/gitrepos/iac/infra-local

.PHONY: help up down rebuild cluster dns build deploy monitoring status traffic

help: ## List targets
	@grep -E '^[a-z][a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | sed 's/:.*## /\t/' | expand -t 22

up: cluster dns build deploy monitoring ## Everything, in order
	@echo
	@echo "App:       $(SITE)"
	@echo "Dashboard: $(GRAFANA)/d/__SLUG__  (folder Labs)"

down: ## Leave the platform first, then delete the cluster
	-$(HOMELAB_INFRA)/host/labs/lab.sh unregister $(CLUSTER)
	k3d cluster delete $(CLUSTER)

rebuild: down up ## Delete and recreate the cluster (after changing ports or ranges)

cluster: ## Create the k3d cluster on the homelab network (no-op if it exists)
	@k3d cluster list $(CLUSTER) >/dev/null 2>&1 || k3d cluster create --config k3d/cluster.yaml

dns: ## CoreDNS upstreams that pods can reach on the homelab network (ADR 0024)
	$(KUBECTL) apply -f k8s/dns/coredns-custom.yaml
	$(KUBECTL) -n kube-system rollout restart deploy/coredns
	$(KUBECTL) -n kube-system rollout status deploy/coredns --timeout=3m

build: ## Build the image and import it into the cluster (no registry)
	docker build -t $(IMAGE) app
	k3d image import $(IMAGE) -c $(CLUSTER)

deploy: ## Apply the app's manifests and wait for the rollout
	$(KUBECTL) apply -k k8s
	$(KUBECTL) -n __APP_NS__ rollout restart deploy/__APP__
	$(KUBECTL) -n __APP_NS__ rollout status deploy/__APP__ --timeout=5m

monitoring: ## Join the platform: Argo CD registration, monitoring pack, OTLP token, dashboards
	$(HOMELAB_INFRA)/host/labs/lab.sh register $(CLUSTER) dashboards

status: ## Preflight: the app answers and the monitoring pack is Healthy
	$(KUBECTL) get pods -n __APP_NS__
	@$(HOMELAB_INFRA)/host/labs/lab.sh status $(CLUSTER)
	@$(HOMELAB_INFRA)/host/labs/lab.sh status $(CLUSTER) | grep -q 'monitoring-pack-$(CLUSTER) *Synced/Healthy' \
	  && echo "monitoring: ok" || { echo "monitoring pack not Healthy: make monitoring" >&2; exit 1; }
	@curl -fsS -o /dev/null $(SITE)/ && echo "app: ok"

traffic: ## Background load so the dashboard has something to show
	@for i in $$(seq 50); do curl -s -o /dev/null $(SITE)/; done; echo "sent 50 requests"

# --- Experiments --------------------------------------------------------------------------
# One `exp-<id>` target per experiment in the blog's _data/labs/<slug>.yml, and optionally a
# `verify-<id>` target that exits 0 only when the expected signal reached mon.
# scripts/signal.sh queries mon's Grafana: metric <promql> [min] | logs <logql> | traces <traceql>.
# Filter every query on this cluster: the stores hold every cluster's signals.
# EXPERIMENTS.md is generated from the card (lab_repo.py sync); don't edit it by hand.

.PHONY: exp-example verify-example
exp-example: ## Example experiment: replace with the lab's real actions
	@for i in $$(seq 20); do curl -s -o /dev/null $(SITE)/; done; echo "sent 20 requests"

verify-example:
	@scripts/signal.sh metric 'sum(up{cluster="$(CLUSTER)"})'
