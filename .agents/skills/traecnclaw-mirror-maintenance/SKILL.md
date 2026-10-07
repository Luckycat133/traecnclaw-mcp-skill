---
name: traecnclaw-mirror-maintenance
description: Audit or maintain this generated TRAECNclaw public mirror, its provenance, release metadata and install claims. Use for mirror drift or distribution review, not for operating TraeCN.
---

# TRAECNclaw mirror maintenance

Read `SOURCE_REVISION`, `release-manifest.json`, `README.md` and the affected workflow. This repository is a public distribution mirror; it is not the canonical gateway implementation.

## Choose the owner

- `.codex/skills/traecnclaw-mcp/` is generated from the canonical repository's `skills/traecnclaw-mcp/`. Correct runtime Skill content upstream, then review a sync diff; hand edits here can be deleted by `rsync --delete`.
- `.github/workflows/sync-canonical.yml` currently copies the Skill subtree and updates `SOURCE_REVISION`. It does not by itself prove that README, release manifest, npm package, MCPB, Dockerfile or directory metadata all changed together.
- Maintainer-only guidance under `.agents/` must not be inserted into the portable public operator Skill or its release archive.

For drift, compare the recorded canonical revision, intended source revision, mirrored Skill version, manifest artifact/version fields and README install commands separately. Do not overwrite unrelated local changes or infer that a successful sync PR published a release. Canonical access may be unavailable; report the unresolved source comparison instead of fabricating provenance.

## Verify the relevant claim

The current mirror validation workflow checks source metadata/frontmatter and rejects tracked generated archives. It does not establish MCP behavior or a working published install. For Skill-contract changes, use the portable tests under `.codex/skills/traecnclaw-mcp/scripts/` after inspecting their launcher requirements. For a release/install claim, verify the exact artifact, its checksum, the installed server version and stdio discovery on the intended host.

A container can inspect the local-stdio schema; it cannot establish access to the user's Mac TraeCN UI. Keep schema, package installation and live desktop task evidence separate. Read-only audit does not trigger `workflow_dispatch`, push a sync branch, publish a release or submit a listing.
