# TRAECNclaw MCP Skill

> Portable Skill bytes and server artifacts are sourced from canonical TRAECNclaw 0.5.6 at commit `0fde120d5c2ac848ef61f14b7d3faf1e44c74894`.

TRAECNclaw is a local-first MCP server and Agent Skill for operating the TraeCN
desktop app on the user's Mac. This repository is the public distribution
mirror: it carries the portable Skill, installable server archives, provenance,
and marketplace metadata without publishing the private canonical history.

TRAECNclaw exposes MCP contract version 5 with exactly 20 stable,
single-intent tools. The normal Agent flow is:

1. Open a workspace only when needed.
2. Select model or mode only when needed.
3. Send one message and release the caller context.
4. Legacy MCP clients receive a durable notification; modern `2026-07-28`
   hosts can negotiate Tasks and subscribe to the exact returned task ID.

Queueing, waiting, recovery, routine non-command questions, task ownership, and
durable completion remain gateway-managed.

The local server uses newline-delimited stdio, implements MCP `2026-07-28`, and
remains compatible with initialization-based `2025-11-25` and `2024-11-05`
clients. TRAECNclaw contract version 5 is the tool-surface version, not the MCP
protocol revision. The independently negotiated, upstream-draft
`io.modelcontextprotocol/tasks` extension does not add tools.

## Install the server

Use this repository's matching [GitHub Release](https://github.com/Luckycat133/traecnclaw-mcp-skill/releases)
for the complete server archive. Install the exact archive version before
configuring a host; do not use the unrelated historical npm 0.3.1 package as a
current server.

## Install the Agent Skill

Install from this public repository with the open Skills CLI:

```sh
npx skills add https://github.com/Luckycat133/traecnclaw-mcp-skill \
  --skill traecnclaw-mcp \
  -g
```

Or download the matching Skill archive from the GitHub Release. The Skill lives
at `.codex/skills/traecnclaw-mcp` and includes the launcher, setup script, and
host configuration template. Restart the Agent host after installing or
updating the Skill.

Use `scripts/setup-mcp.js` to validate server discovery and generate the host
entry. The normal runtime is:

```text
Agent host -> local stdio server -> gateway on the same Mac -> TraeCN
```

The server and gateway run on the same user-owned Mac as TraeCN. Marketplace
containers may inspect the stdio schema, but a cloud container cannot
transparently control the user's local TraeCN desktop.

The mirror does not advertise a current npm or Official MCP Registry version
until that exact artifact has been published and verified. Smithery local
publication will use a verified MCPB bundle; the retired `smithery.yaml` format
remains absent.

## Configuration

The gateway defaults are `TRAECN_GATEWAY_HOST=127.0.0.1` and
`TRAECN_GATEWAY_PORT=8788`. Non-loopback binds require
`TRAECN_GATEWAY_TOKEN`. There is no MCP tool-profile setting.

## Discovery channels

This repository is the canonical public source for Skill and MCP directory
submissions. A listing is trustworthy only when its version, local stdio
transport, macOS requirement, 20-tool count, and generated install command match
this Release.

Current distribution includes the public GitHub Release and ClawHub. Glama,
skills.sh, AwesomeSkills.dev, MCP.Directory, MCPB/Smithery Local, and—after a
current public package exists—the Official MCP Registry and PulseMCP are the
selected next channels. Other directories should reuse this same provenance and
install copy rather than maintaining forks.

## Glama

`glama.json` and the root Dockerfile support directory registration, maintainer
verification, security/quality scanning, and tool-schema inspection. The image
installs the current public 0.5.6 server and contains no gateway token or mock
bridge.

TRAECNclaw should be listed as a **local stdio server**. A Glama build proves the
package boots and exposes 20 tools; it does not prove that Glama hosting can
reach a user's Mac.

See `SOURCE_REVISION` and `release-manifest.json` for provenance and channel
readiness.
