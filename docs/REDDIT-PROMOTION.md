# Reddit Promotion Drafts

Use these only from an account that is allowed to post the project. Check each
subreddit's current self-promotion rules before posting.

## Recommended Targets

- `r/mcp`: best match for MCP server and tool-surface feedback.
- `r/OpenAI`: reasonable for Codex Skill and agent workflow discussion.
- `r/ClaudeAI`: only use if framing as a generic MCP server that Claude Desktop
  can connect to, not as a Claude-built project.
- `r/LocalLLaMA`: use cautiously; disclose affiliation and avoid direct
  marketing tone.

## Primary Post

Title:

```text
TRAECNclaw MCP: a portable Agent Skill + stdio MCP server for TraeCN automation
```

Body:

```text
I built TRAECNclaw MCP to give MCP-capable coding agents a structured local interface to TraeCN desktop automation.

It includes:

- a stdio MCP server with profile-scoped tools
- a portable Agent Skill at .codex/skills/traecnclaw-mcp
- a public profile with 20 common tools for normal agent integrations
- ops/full profiles for recovery, cleanup, Solo conversation control, diagnostics, and long-queue proof workflows

The main use case is replacing brittle screen control with explicit tool calls for readiness checks, task delegation, queue polling, model/mode switching, settings, dialogs, code review delegation, and unattended workflow runs.

Install:

npm install -g https://github.com/Luckycat133/traecnclaw-mcp-skill/releases/download/v0.3.0-mcp-skill.1/traecnclaw-0.3.0.tgz

Repo:
https://github.com/Luckycat133/traecnclaw-mcp-skill

I am the maintainer. Feedback on the tool profile split and MCP client config would be useful.
```

## Short Comment Reply

```text
Thanks. The public repo is here: https://github.com/Luckycat133/traecnclaw-mcp-skill

It ships both the Agent Skill and the installable stdio MCP server tarball. The default public profile exposes 20 common tools; ops/full expose recovery and audit surfaces.
```

## Disclosure Line

```text
Disclosure: I am the maintainer of TRAECNclaw MCP.
```
