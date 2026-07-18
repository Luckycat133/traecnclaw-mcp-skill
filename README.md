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

## Install the Skill

From a cloned checkout:

```sh
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R .codex/skills/traecnclaw-mcp "${CODEX_HOME:-$HOME/.codex}/skills/"
```

For release archives, download the matching asset from the Releases page and
verify it against the release checksum manifest before extracting it.

## MCP server

The Skill is a client guide; the executable MCP server comes from TRAECNclaw.
When the package is installed and `traecnclaw-mcp` is on `PATH`:

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

## Release provenance

Every public release must identify the canonical TRAECNclaw commit that produced
it. A mirror update is valid only when the mirrored Skill matches that canonical
path byte-for-byte.

Glama metadata is retained, but Glama account setup and deployment remain a
separate maintainer task.

## License

MIT
