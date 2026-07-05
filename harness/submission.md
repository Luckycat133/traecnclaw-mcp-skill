# Harness Marketplace Submission Draft

## Agent Name

TRAECNclaw MCP Operator

## Description

Operate TraeCN through TRAECNclaw's MCP surface from a Harness Worker Agent. The
agent discovers the configured MCP tools, runs readiness checks before side
effects, delegates TraeCN tasks, handles dialogs, and reports auditable results
for local automation workflows.

## Use Case

Teams that use TraeCN for coding or automation can trigger a governed Harness
Worker Agent to route work through a TRAECNclaw MCP connector instead of manual
desktop control. This is useful for repeatable code review delegation,
unattended task queues, model/mode setup checks, and workflow recovery where
Harness should own the pipeline trigger, audit trail, and model connector.

## Agent Definition YAML

Use `traecnclaw-mcp-worker-agent.yaml`.

## Submission URL

Harness documents the Worker Agent submission form at:

https://docs.google.com/forms/d/e/1FAIpQLSezpouRTRs3pOl9r6svUmf5L98dQZGgxIQl0FUOkgnCLvcPOg/viewform

## Reviewer Notes

- Requires a Harness AI model connector.
- Requires a Harness MCP connector that can reach a TRAECNclaw MCP endpoint.
- Harness Cloud cannot reach `localhost`; users should use an approved tunnel,
  internal delegate/network route, or hosted MCP bridge where appropriate.
- The public source and release artifacts are available at
  https://github.com/Luckycat133/traecnclaw-mcp-skill.
