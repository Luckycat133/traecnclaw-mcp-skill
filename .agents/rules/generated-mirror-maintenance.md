---
trigger: model_decision
description: "Apply when editing, synchronizing, reviewing or releasing generated traecnclaw-mcp skill mirrors, SOURCE_REVISION or sync-canonical.yml."
---

# 生成镜像维护

`.codex/skills/traecnclaw-mcp/` 来自 TRAECNclaw 的 `skills/traecnclaw-mcp/`；`.agents/skills` 与 `.claude/skills` 的链接可能指向相同目录；分发验证只核对链接文本，不跟随链接。旧 `sync-canonical.yml` 已禁用：无 checkout、无 token 权限，所有 legacy dispatch 均拒绝，不再执行 `rsync` 或公开推送。按 `.agents/skills/traecnclaw-mirror-maintenance/SKILL.md` 核对 `SOURCE_REVISION`，优先修真源并审阅完整、固定版本的 allowlist 导出；导出不等于发布。不得恢复旧同步来修复维护目录与严格分发快照的验证边界。用户明确要求镜像局部修复时记录后续生成覆盖风险。
