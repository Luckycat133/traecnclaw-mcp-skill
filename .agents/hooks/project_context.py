#!/usr/bin/env python3
"""Read-only Antigravity PreInvocation context; no tool/permission decisions."""
import ast
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
LIMIT = 65536
MODE = 'mirror'
BOUNDARIES = ('.git', 'AGENTS.md', 'AGENTS.override.md', 'GEMINI.md',
              'CLAUDE.md', 'CLAUDE.local.md', '.claude/CLAUDE.md',
              '.claude/settings.json', '.claude/settings.local.json',
              '.agents/hooks.json', '.agent/hooks.json', '.codex/config.toml', '.codex/hooks.json')
CLOVER_PATHS = ('src/infrastructure/persistence/save-system.js',
                'src/infrastructure/persistence/schema-version.js',
                'src/infrastructure/persistence/save-migrations.js',
                'src/app/save-orchestrator.js', 'src/app/save-write-coordinator.js',
                'src/app/wire-runtime-events.js')
MIRROR = '.codex/skills/traecnclaw-mcp/'

def local_path(relative):
    target = (ROOT / relative).resolve()
    if ROOT not in target.parents:
        return None
    current = target if target.is_dir() else target.parent
    while current != ROOT:
        if any((current / marker).exists() for marker in BOUNDARIES):
            return None
        current = current.parent
    return target

def scoped(data):
    # The native runner's cwd is the directory containing hooks.json.
    if Path.cwd().resolve() != ROOT / '.agents':
        return False
    paths = data.get('workspacePaths')
    if not isinstance(paths, list) or len(paths) > 64:
        return False
    if not any(isinstance(p, str) and p and Path(p).is_absolute()
               and Path(p).resolve() == ROOT for p in paths):
        return False
    value = data.get('invocationNum')
    return type(value) is int and value >= 0

def git_output(args):
    env = dict(os.environ, GIT_OPTIONAL_LOCKS='0')
    result = subprocess.run(['git', '-c', 'core.fsmonitor=false',
                             '-c', 'core.untrackedCache=false', '-C', str(ROOT), *args],
                            env=env, capture_output=True, timeout=1, check=False)
    if result.returncode or len(result.stdout) > LIMIT:
        return b''
    return result.stdout

def changed_paths():
    # Avoid inheriting an outer repository in a non-Git workspace.
    top = git_output(['rev-parse', '--show-toplevel']).decode().strip()
    if not top or Path(top).resolve() != ROOT:
        return []
    watched = CLOVER_PATHS if MODE == 'clover' else (MIRROR,)
    raw = git_output(['status', '--porcelain=v1', '-z', '--no-renames',
                      '--untracked-files=all', '--', *watched])
    paths = []
    for record in raw.split(b'\0'):
        if len(record) < 4:
            continue
        relative = record[3:].decode('utf-8', errors='surrogateescape')
        relevant = relative in CLOVER_PATHS if MODE == 'clover' else relative.startswith(MIRROR)
        if relevant and local_path(relative) is not None:
            paths.append(relative)
    return paths

def context():
    if MODE == 'campus':
        source = local_path('Campus.blend')
        if source is None or not source.is_file() or (ROOT / 'source/Campus_Walkable_V4.blend').exists():
            return None
        found = []
        for relative in ('scripts/export.py', 'scripts/validate_exports.py'):
            target = local_path(relative)
            if target is None or not target.is_file():
                continue
            try:
                with target.open('rb') as stream:
                    raw = stream.read(LIMIT + 1)
                if len(raw) > LIMIT:
                    continue
                tree = ast.parse(raw)
                if any(isinstance(n, ast.Constant) and n.value == 'source/Campus_Walkable_V4.blend'
                       for n in ast.walk(tree)):
                    found.append(relative)
            except (OSError, SyntaxError, ValueError, RecursionError):
                continue
        if found:
            return ('校园资产路径检查：脚本仍引用缺失的 source/Campus_Walkable_V4.blend，'
                    '根目录 Campus.blend 存在。按 .agents/skills/campus-3d-asset-pipeline/SKILL.md '
                    '及 docs/delivery_manifest.json 核对真源和输出身份。不要自动复制改名或启动 Blender；'
                    '旧输出存在不等于当前验收通过。')
        return None
    if not changed_paths():
        return None
    if MODE == 'clover':
        return ('当前工作区存在 Clover 存档/生命周期未提交改动，可能来自其他会话。'
                '若当前任务涉及这些文件，读 .agents/skills/clover-village-development/references/11-reliability-security.md；'
                '保留旧档首次备份、损坏/未来版本拒绝、flush/cancel/dispose 语义，按改动选聚焦测试。'
                '请求成功不等于落盘；保留现场和其他会话工作。')
    return ('当前生成镜像 .codex/skills/traecnclaw-mcp/ 有未提交改动，可能来自其他会话。'
            '若当前任务涉及镜像，按 .agents/skills/traecnclaw-mirror-maintenance/SKILL.md '
            '核对 TRAECNclaw/skills/traecnclaw-mcp 真源与 SOURCE_REVISION；sync-canonical.yml 的 rsync --delete '
            '可能覆盖局部改动。保留当前用户明确授权的局部修复并记录覆盖风险；同步不等于发布。')

def main():
    output = {}
    try:
        raw = sys.stdin.buffer.read(LIMIT + 1)
        if len(raw) <= LIMIT:
            data = json.loads(raw)
            if isinstance(data, dict) and scoped(data):
                message = context()
                if message:
                    output = {'injectSteps': [{'ephemeralMessage': message}]}
    except (OSError, ValueError, TypeError, RuntimeError, RecursionError, subprocess.SubprocessError):
        pass
    print(json.dumps(output, ensure_ascii=False))

if __name__ == '__main__':
    main()
