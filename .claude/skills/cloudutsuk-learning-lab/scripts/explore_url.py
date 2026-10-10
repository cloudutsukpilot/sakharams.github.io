#!/usr/bin/env python3
"""Print a Grafana Explore URL for a lab card shot (`url:`), with capture.cjs time tokens.

Explore keeps its state in URL-encoded JSON (`panes=`), which is unreadable to write by hand. This
builds it for the datasource UIDs of grafana/otel-lgtm (tempo, loki, prometheus).

  python3 explore_url.py tempo '{ status = error && resource.service.name = "api" }'
  python3 explore_url.py loki '{service_name="api"} != "/healthz"'
  python3 explore_url.py prometheus 'sum by (code) (rate(http_requests_total[1m]))' --legend '{{code}}'
  python3 explore_url.py tempo '<query>' --from from      # range from ${from} instead of ${start}

The range runs from ${start} (the experiment's start; the default) or ${from} (start minus
capture.window) to ${to} (the moment of the shot). Paste the output, quoted, into the card.
Result panel selectors: section[data-testid="data-testid Panel header <Table - Traces|Trace|Logs|Graph>"].
"""
import argparse
import json
import urllib.parse


def explore(ds, query, frm="start", legend=None, alias="grafana"):
    q = {"refId": "A", "datasource": {"type": ds, "uid": ds}}
    if ds == "tempo":
        q.update({"queryType": "traceql", "query": query, "limit": 20, "tableType": "traces"})
    else:
        q["expr"] = query
        if legend:
            q["legendFormat"] = legend
    panes = {"x": {"datasource": ds, "queries": [q], "range": {"from": "FROMTOK", "to": "TOTOK"}}}
    enc = urllib.parse.quote(json.dumps(panes, separators=(",", ":")), safe="")
    enc = enc.replace("FROMTOK", "${" + frm + "}").replace("TOTOK", "${to}")
    return f"{alias}:/explore?schemaVersion=1&orgId=1&panes={enc}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("datasource", choices=["tempo", "loki", "prometheus"])
    ap.add_argument("query")
    ap.add_argument("--from", dest="frm", choices=["start", "from"], default="start")
    ap.add_argument("--legend", help="Prometheus legendFormat, e.g. '{{code}}'")
    ap.add_argument("--alias", default="grafana", help="capture.urls alias (default grafana)")
    a = ap.parse_args()
    print(explore(a.datasource, a.query, a.frm, a.legend, a.alias))


if __name__ == "__main__":
    main()
