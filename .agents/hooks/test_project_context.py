#!/usr/bin/env python3
"""Isolated protocol and Git/AST fixtures; never runs project business code."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('project_context.py')
MODE = 'mirror'
CALLS = 0

class HookTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ag-hook-fixture-')
        self.base = Path(self.temp.name)
        self.root = self.base / 'project with spaces'
        self.runner = self.root / '.agents/hooks/project_context.py'
        self.runner.parent.mkdir(parents=True)
        shutil.copyfile(SCRIPT, self.runner)
        self.data = {'workspacePaths': [str(self.root)], 'invocationNum': 0,
                     'initialNumSteps': 0, 'conversationId': 'fixture'}
        if MODE != 'campus':
            subprocess.run(['git', 'init', '-q', str(self.root)], check=True,
                           capture_output=True)
        self.target = ('scripts/export.py' if MODE == 'campus' else
                       'src/app/save-orchestrator.js' if MODE == 'clover' else
                       '.codex/skills/traecnclaw-mcp/SKILL.md')

    def tearDown(self):
        self.temp.cleanup()

    def write(self, rel, text='fixture'):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        return path

    def relevant(self):
        if MODE == 'campus':
            self.write('Campus.blend', 'not a real blend file')
            self.write(self.target, "PATH = 'source/Campus_Walkable_V4.blend'\n")
        else:
            self.write(self.target)

    def call(self, data=None, *, raw=None, cwd=None):
        global CALLS
        CALLS += 1
        config = SCRIPT.parent.parent / 'hooks.json'
        command = next(iter(json.loads(config.read_text()).values()))['PreInvocation'][0]['command'] if config.exists() and cwd is None else None
        result = subprocess.run(['sh', '-c', command] if command else [sys.executable, str(self.runner)],
                                input=raw if raw is not None else json.dumps(self.data if data is None else data),
                                cwd=cwd or self.root / '.agents', text=True,
                                capture_output=True, timeout=4)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, '')
        value = json.loads(result.stdout)
        if value:
            self.assertEqual(set(value), {'injectSteps'})
            self.assertEqual(len(value['injectSteps']), 1)
            self.assertEqual(set(value['injectSteps'][0]), {'ephemeralMessage'})
            self.assertLess(len(result.stdout), 3000)
        return value

    def test_actual_state_and_no_business_execution(self):
        self.assertEqual(self.call(), {})
        self.relevant()
        self.assertTrue(self.call())
        self.assertTrue(self.call(dict(self.data, invocationNum=3)))
        if MODE != 'campus':
            subprocess.run(['git', '-C', str(self.root), 'add', self.target], check=True)
            self.assertTrue(self.call())
            (self.root / self.target).unlink()
            self.assertTrue(self.call())
        else:
            self.write('source/Campus_Walkable_V4.blend')
            self.assertEqual(self.call(), {})

    def test_bad_inputs_and_wrong_event_shape(self):
        self.relevant()
        for raw in ('', 'oops', '[]', 'null', '1', '"text"', 'x' * 65537):
            self.assertEqual(self.call(raw=raw), {})
        for value in (None, [], '', -1, True, 0.5, '0'):
            self.assertEqual(self.call(dict(self.data, invocationNum=value)), {})
        self.assertEqual(self.call({'toolCall': {'name': 'write_to_file'},
                                    'workspacePaths': [str(self.root)]}), {})

    def test_workspace_and_runner_scope(self):
        self.relevant()
        for paths in (None, str(self.root), [], ['.'], [str(self.base)],
                      [str(self.root / '.agents')], [None], [str(self.root)] * 65):
            self.assertEqual(self.call(dict(self.data, workspacePaths=paths)), {})
        self.assertEqual(self.call(cwd=self.root), {})
        self.assertEqual(self.call(cwd=self.base), {})
        alias = self.base / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        self.assertTrue(self.call(dict(self.data, workspacePaths=[str(alias)])))

    def test_symlink_escape_and_nested_boundary(self):
        self.relevant()
        path = self.root / self.target
        saved = path.read_text()
        path.unlink()
        outside = self.base / 'outside'
        outside.write_text(saved)
        path.symlink_to(outside)
        self.assertEqual(self.call(), {})
        path.unlink()
        path.write_text(saved)
        for marker in ('AGENTS.md', '.claude/CLAUDE.md', '.claude/settings.local.json', '.agents/hooks.json', 'AGENTS.override.md', '.codex/hooks.json'):
            p = path.parent / marker
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text('{}')
            self.assertEqual(self.call(), {})
            p.unlink()

    def test_unrelated_or_non_executable_asset_content(self):
        self.write('README.md', 'unrelated')
        self.assertEqual(self.call(), {})
        if MODE == 'campus':
            self.write('Campus.blend')
            self.write(self.target, "# source/Campus_Walkable_V4.blend\n")
            self.assertEqual(self.call(), {})
            self.write(self.target, 'not valid Python ?')
            self.assertEqual(self.call(), {})
            self.write(self.target, 'x' * 65537)
            self.assertEqual(self.call(), {})
        else:
            # Similar sibling paths must not trigger.
            self.write(self.target + '.unrelated')
            if MODE == 'clover':
                self.assertEqual(self.call(), {})
            else:
                self.assertTrue(self.call())  # any file under the generated mirror is relevant

if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(HookTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({'mode': MODE, 'fixture_invocations': CALLS,
                      'tests': result.testsRun, 'passed': result.wasSuccessful()}))
    sys.exit(0 if result.wasSuccessful() else 1)
