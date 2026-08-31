# Logging Rule

## Purpose and Applicability

Not applicable to runtime behavior until an application or service exists.

## Requirements

Do not infer logging, telemetry, audit trails, or observability from demo screens. Documentation should cite evidence paths and record failed checks without secrets.

## Repository Evidence

No logger, telemetry SDK, backend, environment config, or operational sink exists.

## Stop or Escalate

Stop before selecting tools, schemas, retention, or sensitive fields.

## Validation Deliverable

A logging applicability gap and the operational requirements needed for activation.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../agents/devops-engineer.md)

## Guideline Basis

- **SEC-03** excludes secrets, tokens, and sensitive payloads from future logs and current examples.
- **DOC-02** prevents presentation strings in exports from being treated as operational logs.
- **PG-02** blocks claims about logging commands or backends while no runtime exists.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
