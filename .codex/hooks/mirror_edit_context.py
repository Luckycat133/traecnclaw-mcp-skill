#!/usr/bin/env python3
"""Bounded, read-only project context. Unknown input is a quiet no-op."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BOUNDARIES = ('.git', 'AGENTS.md', 'AGENTS.override.md', '.codex/config.toml', '.codex/hooks.json')
LIMIT = 65536

def in_project(raw):
    if not isinstance(raw, str) or not raw or not Path(raw).is_absolute():
        return False
    current = Path(raw).resolve(strict=True)
    if not current.is_dir() or (current != ROOT and ROOT not in current.parents):
        return False
    while current != ROOT:
        if any((current / marker).exists() for marker in BOUNDARIES):
            return False
        current = current.parent
    return True

def target_path(raw, cwd):
    if not raw or '\x00' in raw:
        return None
    path = Path(raw)
    resolved = (path if path.is_absolute() else Path(cwd) / path).resolve()
    if resolved == ROOT or ROOT not in resolved.parents:
        return None
    parent = resolved.parent
    while not parent.exists() and parent != ROOT:
        parent = parent.parent
    return resolved if in_project(str(parent)) else None

CONTEXT = '本次调用涉及生成目录 .codex/skills/traecnclaw-mcp/。它来自 TRAECNclaw 的 skills/traecnclaw-mcp/，sync-canonical.yml 使用 rsync --delete。按 traecnclaw-mirror-maintenance 核对 SOURCE_REVISION，优先修真源并审阅同步差异；同步不代表发布。若当前用户明确要求镜像局部修复，记录其覆盖风险。'

def relevant(path):
    return path.startswith('.codex/skills/traecnclaw-mcp/')

def context_for(data):
    if data.get('hook_event_name') != 'PostToolUse' or data.get('tool_name') != 'apply_patch':
        return None
    value = data.get('tool_input')
    patch = value.get('command') if isinstance(value, dict) else None
    if not isinstance(patch, str):
        return None
    lines = patch.splitlines()
    if not lines or lines[0] != '*** Begin Patch' or lines[-1] != '*** End Patch':
        return None
    # Context/addition lines have a space/+ prefix, so mere mentions do not match.
    for line in lines[1:-1]:
        for prefix in ('*** Update File: ', '*** Add File: ', '*** Delete File: ', '*** Move to: '):
            if line.startswith(prefix):
                path = target_path(line[len(prefix):], data['cwd'])
                if path is not None and relevant(path.relative_to(ROOT).as_posix()):
                    return CONTEXT
    return None

def main():
    result = {}
    try:
        raw = sys.stdin.buffer.read(LIMIT + 1)
        if len(raw) <= LIMIT:
            data = json.loads(raw)
            if (isinstance(data, dict) and in_project(data.get('cwd'))
                    and in_project(str(Path.cwd()))):
                context = context_for(data)
                if context:
                    result = {'hookSpecificOutput': {'hookEventName': data['hook_event_name'],
                                                    'additionalContext': context}}
    except (ValueError, TypeError, OSError, RuntimeError, RecursionError):
        pass
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
