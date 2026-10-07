---
trigger: model_decision
description: "Apply when editing, synchronizing, reviewing or releasing generated traecnclaw-mcp skill mirrors, SOURCE_REVISION or sync-canonical.yml."
---

# 生成镜像维护

`.codex/skills/traecnclaw-mcp/` 来自 TRAECNclaw 的 `skills/traecnclaw-mcp/`；`.agents/skills` 与 `.claude/skills` 的链接可能落到相同目录，先解析真实目标。`sync-canonical.yml` 使用 `rsync --delete`，按 `.agents/skills/traecnclaw-mirror-maintenance/SKILL.md` 核对 `SOURCE_REVISION`，优先修真源并审阅同步差异；同步不等于发布。用户明确要求镜像局部修复时记录后续同步覆盖风险。
