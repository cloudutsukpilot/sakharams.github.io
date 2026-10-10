CLUSTER ?= __CLUSTER__
IMAGE   ?= __APP__:dev
SITE    ?= http://localhost:__SITE_PORT__
GRAFANA ?= http://localhost:__GRAFANA_PORT__

.PHONY: up cluster build deploy status down traffic

up: cluster build deploy ## Create the cluster, build the image, deploy everything
	@echo
	@echo "App:     $(SITE)"
	@echo "Grafana: $(GRAFANA)"

cluster: ## Create the k3d cluster (no-op if it already exists)
	@k3d cluster list $(CLUSTER) >/dev/null 2>&1 || k3d cluster create --config k3d/cluster.yaml

build: ## Build the image and import it into the cluster
	docker build -t $(IMAGE) app
	k3d image import $(IMAGE) -c $(CLUSTER)

deploy: ## Apply all manifests and wait for rollouts
	kubectl apply -k k8s
	kubectl -n observability rollout status deploy/lgtm --timeout=10m
	kubectl -n observability rollout status ds/otel-collector --timeout=5m
	kubectl -n __APP_NS__ rollout restart deploy/__APP__
	kubectl -n __APP_NS__ rollout status deploy/__APP__ --timeout=5m

status: ## Pods in both namespaces; fails if the app or Grafana is not answering
	kubectl get pods -n observability
	kubectl get pods -n __APP_NS__
	@curl -fsS -o /dev/null $(GRAFANA)/api/health && echo "grafana: ok"
	@curl -fsS -o /dev/null $(SITE)/ && echo "app: ok"

traffic: ## Background load so the dashboard has something to show
	@for i in $$(seq 50); do curl -s -o /dev/null $(SITE)/; done; echo "sent 50 requests"

down: ## Delete the cluster (and all observability data)
	k3d cluster delete $(CLUSTER)

# --- Experiments --------------------------------------------------------------------------
# One `exp-<id>` target per experiment in the blog's _data/labs/<slug>.yml, and optionally a
# `verify-<id>` target that exits 0 only when the expected signal reached the backend.
# scripts/signal.sh queries Grafana's datasources: metric <promql> [min] | logs <logql> | traces <traceql>.
# EXPERIMENTS.md is generated from the card (lab_repo.py sync); don't edit it by hand.

.PHONY: exp-example verify-example
exp-example: ## Example experiment: replace with the lab's real actions
	@for i in $$(seq 20); do curl -s -o /dev/null $(SITE)/; done; echo "sent 20 requests"

verify-example:
	@GRAFANA=$(GRAFANA) scripts/signal.sh metric 'sum(up)'
