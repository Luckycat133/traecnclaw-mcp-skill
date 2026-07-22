# TRAECNclaw MCP Skill

> Status: Thin Public Distribution Repository

This repository is a **generated public distribution mirror**.

- Canonical source: [Luckycat133/TRAECNclaw](https://github.com/Luckycat133/TRAECNclaw)
- Canonical path: `skills/traecnclaw-mcp`
- Mirrored path: `.codex/skills/traecnclaw-mcp`
- Exact source revision: [`SOURCE_REVISION`](./SOURCE_REVISION)

Do not edit the mirrored Skill by hand. Behavior, version, tests, MCP code, npm
packages, and release artifacts are produced from TRAECNclaw.

## What stays in Git

- the public Agent Skill source
- installation documentation
- source-revision metadata
- marketplace metadata and release notes
- automation that verifies the mirror

Generated `.tgz`, `.zip`, npm-ready directories, and checksum manifests belong
in [GitHub Releases](https://github.com/Luckycat133/traecnclaw-mcp-skill/releases),
not in the default branch.

## Installation

TRAECNclaw MCP is published across several channels. Pick the one that fits
your client — they all serve the same `traecnclaw-mcp` stdio server.

### Option 1 — Glama (recommended, one-click)

Open the Glama server page and click **Install**; Glama reads `glama.json`
from this repo and emits a paste-ready MCP config for Claude Desktop, Cursor,
and more.

- https://glama.ai/mcp/servers/@Luckycat133/traecnclaw-mcp-skill

### Option 2 — npm (global install)

```sh
npm install -g traecnclaw@0.3.1
```

This puts the `traecnclaw-mcp` stdio server on your `PATH`. Then register it
with your client using the config below.

### Option 3 — npx (no install)

For clients that can launch via `npx`:

```json
{
  "mcpServers": {
    "traecn": {
      "command": "npx",
      "args": ["-y", "traecnclaw@0.3.1", "traecnclaw-mcp"],
      "env": { "TRAECN_MCP_TOOL_PROFILE": "public" }
    }
  }
}
```

### Option 4 — MCP Registry

The server is indexed in the official Model Context Protocol Registry as
`io.github.Luckycat133/traecnclaw` (v0.3.1). Registry-aware clients can
discover and install it automatically.

### Option 5 — Smithery (Codex / Cursor / OpenClaw Skill)

Install the packaged Skill for AI coding clients; the page offers one-click
install for Codex, OpenClaw, Cursor, and GitHub Copilot.

- https://smithery.ai/skills/xingmiao201081/traecnclaw-mcp

### MCP client configuration

Once the server binary is available (any of Options 2–3), register it with
your client. Example `mcp.json` / `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "traecn": {
      "command": "traecnclaw-mcp",
      "env": {
        "TRAECN_HOST": "127.0.0.1",
        "TRAECN_PORT": "8788",
        "TRAECN_GATEWAY_TOKEN": "",
        "TRAECN_MCP_TOOL_PROFILE": "public"
      }
    }
  }
}
```

Keep the gateway on `127.0.0.1` unless remote access is intentional. Use a
token for any shared or non-local environment.

## Install the Skill (from a cloned checkout)

```sh
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R .codex/skills/traecnclaw-mcp "${CODEX_HOME:-$HOME/.codex}/skills/"
```

For release archives, download the matching asset from the Releases page and
verify it against the release checksum manifest before extracting it.

## Release provenance

Every public release must identify the canonical TRAECNclaw commit that produced
it. A mirror update is valid only when the mirrored Skill matches that canonical
path byte-for-byte.

Glama, Smithery, and the MCP Registry metadata are retained and already
deployed; this mirror stays in sync via the `Sync canonical Skill` workflow.

## License

MIT
