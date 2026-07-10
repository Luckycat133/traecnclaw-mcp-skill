# TRAECNclaw MCP Skill

Public distribution bundle for the TRAECNclaw Agent Skill and stdio MCP server
package.

TRAECNclaw MCP lets MCP-capable AI agents operate TraeCN through a local,
auditable stdio MCP server instead of GUI automation. The bundled skill teaches
agents how to configure the server, choose the right tool profile, run
readiness checks, delegate tasks, handle dialogs, and use unattended workflows.

## Contents

- `.codex/skills/traecnclaw-mcp`: portable Agent Skill
- `dist/traecnclaw-mcp-skill.tgz`: skill archive for direct install
- `dist/traecnclaw-mcp-skill.zip`: skill archive for manual download
- `dist/traecnclaw-0.3.0.tgz`: installable TRAECNclaw MCP server package
- `npm-package/traecnclaw-0.3.0.tgz`: npm-ready public package tarball
- `dist/traecnclaw-mcp-release.json`: checksum and install metadata
- `scripts/repack-npm-package.js`: reproducibly builds the npm-ready tarball
- `harness/`: Harness Worker Agent marketplace submission draft
- `docs/LAUNCH-KIT.md`: announcement and listing copy

## Requirements

- Node.js 22 or newer
- TraeCN desktop application
- TraeCN running with a remote debugging port
- Any stdio MCP client, such as Codex, Claude Desktop, Cursor, Cline/Roo Code,
  Windsurf, or OpenClaw

## Install The Skill

From a cloned checkout:

```sh
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R .codex/skills/traecnclaw-mcp "${CODEX_HOME:-$HOME/.codex}/skills/"
```

From the archive:

```sh
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
tar -xzf dist/traecnclaw-mcp-skill.tgz -C "${CODEX_HOME:-$HOME/.codex}/skills"
```

Restart your agent client after installing the skill.

## Install The MCP Server

Install the included package tarball globally:

```sh
npm install -g ./dist/traecnclaw-0.3.0.tgz
traecnclaw --help
traecnclaw-mcp
```

For a GitHub Release download, use the release asset URL:

```sh
npm install -g https://github.com/Luckycat133/traecnclaw-mcp-skill/releases/download/v0.3.0-mcp-skill.1/traecnclaw-0.3.0.tgz
```

Maintainers can rebuild and validate the npm-ready package without including
uncommitted source-checkout changes:

```sh
node scripts/repack-npm-package.js
npm publish --dry-run ./npm-package/traecnclaw-0.3.0.tgz
```

## MCP Client Config

Use this config when the `traecnclaw-mcp` bin is on `PATH`:

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

Tool profiles:

- `public`: 20 common tools for normal agent integrations
- `ops`: recovery, cleanup, Solo conversation control, and long-queue proof tools
- `full`: every explicit shortcut for compatibility and audits

## Checksums

```text
7d1a7751428f94721ae22ddf4db264654432c5aa0f3340f90eccd611bb855bb3  dist/traecnclaw-mcp-skill.tgz
5d5a281bb52bc9426a428b8d62c826802f0e80a8ed4270e4add3c0941c5b25dc  dist/traecnclaw-mcp-skill.zip
0abc67f3fad36e166a56c2e8a0db1f7461915c23a4e366721e6f137b0a614ebf  dist/traecnclaw-0.3.0.tgz
```

## Safety

Bind the TRAECNclaw gateway to `127.0.0.1` unless remote access is intentional.
Use `TRAECN_GATEWAY_TOKEN` for shared or non-local environments.

## License

MIT
