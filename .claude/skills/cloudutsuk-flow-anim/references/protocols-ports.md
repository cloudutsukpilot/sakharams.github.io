# Protocols, default ports and communication kinds

Use the post's real values first: a port the post, its code or its config names wins. Fall back to
these well-known defaults, and say "default port" in the caption when the post does not pin it.
`proto` is what the reader would recognise (`HTTPS`, `PostgreSQL`, `OTLP gRPC`); the engine takes the
first word to pick the colour, so `OTLP gRPC` and `OTLP HTTP` are both telemetry.

| Kind (colour) | `proto` | Default `port` | Typical arrow |
|---|---|---|---|
| request (blue) | HTTPS | 443 | browser → load balancer / API gateway |
| request | HTTP | 80 (8080, 8000, 3000 for app servers) | load balancer → service inside the network |
| request | gRPC | 443 or 50051 | service → service |
| request | GraphQL | 443 | client → GraphQL server |
| request | SOAP | 443 | client → SOAP endpoint |
| stream (teal) | WSS / WebSocket | 443 | browser ↔ chat server |
| stream | SSE | 443 | server → browser event stream |
| event (purple) | Kafka | 9092 (9093 TLS) | producer → broker → consumer |
| event | AMQP | 5672 (5671 TLS) | publisher → RabbitMQ exchange |
| event | MQTT | 1883 (8883 TLS) | device → broker |
| event | NATS | 4222 | service → NATS |
| event | Webhook (HTTPS) | 443 | provider → your endpoint (`proto: Webhook` keeps it purple) |
| event | SMTP | 587 (25 relay) | app → mail server |
| data (amber) | PostgreSQL | 5432 | service → database |
| data | MySQL | 3306 | service → database |
| data | TDS (SQL Server) | 1433 | service → SQL Server |
| data | MongoDB | 27017 | service → database |
| data | Redis | 6379 (6380 TLS on Azure Cache) | service → cache |
| data | S3 / HTTPS | 443 | service → object storage (`kind: data`) |
| data | NFS / SMB | 2049 / 445 | pod → file share |
| telemetry (lime) | OTLP gRPC | 4317 | app / agent → OpenTelemetry Collector |
| telemetry | OTLP HTTP | 4318 | browser SDK → collector |
| telemetry | Prometheus | 9090 (scrape targets vary, e.g. 9100 node exporter, 9113 nginx exporter) | Prometheus → target (scrape) |
| telemetry | Loki | 3100 | collector → Loki push |
| telemetry | syslog | 514 | device → log server |
| control (pink) | DNS | 53 | client → resolver |
| control | TLS | 443 | the handshake itself |
| control | OIDC / OAuth | 443 | app → identity provider |
| control | LDAP / LDAPS | 389 / 636 | app → directory |
| control | SSH | 22 | operator → host |
| control | Kerberos | 88 | client → KDC |

When a proto is not in the engine's list (`PROTO_KIND` in `assets/js/flow-anim.js`), the validator
warns: set `kind:` on the edge. Internal process arrows (pipeline stages, approvals, "calls function")
carry no protocol.
