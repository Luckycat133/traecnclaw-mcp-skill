# Harness Worker Agent Draft

This folder contains a Harness Community Worker Agent submission draft for
TRAECNclaw MCP.

Harness Worker Agents are submitted through the Harness Worker Agent submission
form. The submission requires an agent name, clear description, agent definition
YAML, and the use case it solves. This draft keeps those fields ready for copy
and review.

## Files

- `traecnclaw-mcp-worker-agent.yaml`: Worker Agent definition YAML.
- `submission.md`: marketplace submission copy and operational notes.

## Important Harness Notes

Harness Worker Agents use Harness MCP Connectors. Harness Cloud cannot reach a
developer laptop's `localhost` directly, so users must expose a TRAECNclaw MCP
endpoint through an approved MCP connector or tunnel before running the agent.

For local-first users, the Codex/OpenClaw skill and stdio MCP package remain the
recommended installation path:

```sh
npm install -g https://github.com/Luckycat133/traecnclaw-mcp-skill/releases/download/v0.3.0-mcp-skill.1/traecnclaw-0.3.0.tgz
```
