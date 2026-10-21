#!/usr/bin/env bash
# Ask the platform's Grafana (on mon) whether a signal has arrived; exit 0 only if the query returns data.
# Used by the Makefile's verify-* targets, so a screenshot is only trusted when the data exists.
#
#   scripts/signal.sh metric '<PromQL>' [min]       first sample's value must be > min (default 0)
#   scripts/signal.sh logs   '<LogQL>'   [seconds]  at least one line in the last N seconds (default 900)
#   scripts/signal.sh traces '<TraceQL>' [seconds]  at least one trace in the last N seconds (default 900)
#
# Lab contract v2: the lab's signals are in mon, mixed with every other cluster's, so filter every query
# on this cluster: metrics {cluster="__CLUSTER__"}, logs {k8s_cluster_name="__CLUSTER__"}, traces
# { resource.k8s.cluster.name = "__CLUSTER__" }.
# GRAFANA defaults to https://grafana.mon.home.cloudutsuk.com. It needs a sign-in, so this sends the
# read-only lab-tools token from ~/.config/homelab/grafana-labs-token (LABS_GRAFANA_TOKEN_FILE), made by
# infra-local host/monitoring/labs-grafana-token.sh.
# Signals arrive late (batching, scrape intervals, Tempo's search index), so a miss is retried:
# SIGNAL_TRIES attempts (default 6), SIGNAL_DELAY seconds apart (default 10).
set -uo pipefail
G="${GRAFANA:-https://grafana.mon.home.cloudutsuk.com}"
token_file="${LABS_GRAFANA_TOKEN_FILE:-$HOME/.config/homelab/grafana-labs-token}"
[ -r "$token_file" ] || { echo "$token_file missing: run infra-local host/monitoring/labs-grafana-token.sh" >&2; exit 2; }
auth() { printf 'Authorization: Bearer %s\n' "$(cat "$token_file")"; }
kind="${1:?metric|logs|traces}"; query="${2:?query}"
tries="${SIGNAL_TRIES:-6}"; delay="${SIGNAL_DELAY:-10}"

check() {
now=$(date +%s)
case "$kind" in
  metric)
    curl -fsS -G -H @<(auth) "$G/api/datasources/proxy/uid/mimir/api/v1/query" --data-urlencode "query=$query" |
      python3 -c 'import sys,json
r=json.load(sys.stdin)["data"]["result"]; m=float(sys.argv[1])
v=float(r[0]["value"][1]) if r else None
print(f"metric: {v}"); sys.exit(0 if v is not None and v > m else 1)' "${3:-0}" ;;
  logs)
    curl -fsS -G -H @<(auth) "$G/api/datasources/proxy/uid/loki/loki/api/v1/query_range" --data-urlencode "query=$query" \
      --data-urlencode "start=$(( (now - ${3:-900}) * 1000000000 ))" --data-urlencode "limit=20" |
      python3 -c 'import sys,json
r=json.load(sys.stdin)["data"]["result"]; n=sum(len(s["values"]) for s in r)
print(f"log lines: {n}"); sys.exit(0 if n else 1)' ;;
  traces)
    curl -fsS -G -H @<(auth) "$G/api/datasources/proxy/uid/tempo/api/search" --data-urlencode "q=$query" \
      --data-urlencode "start=$(( now - ${3:-900} ))" --data-urlencode "end=$now" --data-urlencode "limit=20" |
      python3 -c 'import sys,json
t=json.load(sys.stdin).get("traces") or []
tid=t[0]["traceID"] if t else "-"
print(f"traces: {len(t)} (latest {tid})"); sys.exit(0 if t else 1)' ;;
  *) echo "unknown kind $kind" >&2; exit 2 ;;
esac
}

for i in $(seq "$tries"); do
  check && exit 0
  [ "$i" -lt "$tries" ] && sleep "$delay"
done
exit 1
