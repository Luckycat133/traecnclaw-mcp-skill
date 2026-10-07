#!/usr/bin/env python3
"""Isolated hook contract fixtures; never run project workloads."""
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]
SCRIPT = 'mirror_edit_context.py'
EVENT = 'PostToolUse'
TARGET = '.codex/skills/traecnclaw-mcp/SKILL.md'

class ProjectContextTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='hook contract ')
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / 'project with spaces'
        hooks = self.root / '.codex/hooks'
        hooks.mkdir(parents=True)
        shutil.copyfile(PROJECT / '.codex/hooks' / SCRIPT, hooks / SCRIPT)
        shutil.copyfile(PROJECT / '.codex/hooks.json', self.root / '.codex/hooks.json')
        (self.root / 'AGENTS.md').write_text('fixture')
        self.child = self.root / 'nested directory'; self.child.mkdir()
        self.other = self.base / 'outside'; self.other.mkdir()
        config = json.loads((self.root / '.codex/hooks.json').read_text())
        handler = config['hooks'][EVENT][0]['hooks'][0]
        self.assertEqual(handler['timeout'], 3)
        self.assertEqual(handler['additionalContextLimit'], 500)
        self.command = handler['command']
        subprocess.run(['sh', '-n', '-c', self.command], check=True)
        if EVENT == 'SessionStart':
            (self.root / 'scripts').mkdir()
            (self.root / 'Campus.blend').write_bytes(b'fixture, not a real blend')
            (self.root / 'scripts/export.py').write_text("from pathlib import Path\nROOT=Path(__file__)\nsource=ROOT/'source/Campus_Walkable_V4.blend'\n")
        else:
            target = self.root / TARGET; target.parent.mkdir(parents=True, exist_ok=True); target.write_text('old')

    def payload(self, cwd=None, patch=None):
        data = {'hook_event_name': EVENT, 'cwd': str(cwd or self.root)}
        if EVENT == 'SessionStart': data['source'] = 'startup'
        else: data.update(tool_name='apply_patch', tool_input={'command': patch or self.patch(TARGET)}, tool_response={'output':'fixture'})
        return data

    def patch(self, target, kind='Update File'):
        return '*** Begin Patch\n*** '+kind+': '+target+'\n@@\n-old\n+new\n*** End Patch'

    def check_hook(self, data, expected, cwd=None, direct=False):
        args = ['python3', str(self.root / '.codex/hooks' / SCRIPT)] if direct else ['sh','-c',self.command]
        run = subprocess.run(args,cwd=cwd or self.root,input=data if isinstance(data,str) else json.dumps(data),capture_output=True,text=True,timeout=3)
        self.assertEqual(run.returncode,0,run.stderr);self.assertEqual(run.stderr,'')
        output=json.loads(run.stdout)
        if expected:
            self.assertEqual(set(output),{'hookSpecificOutput'})
            context=output['hookSpecificOutput']
            self.assertEqual(context['hookEventName'],EVENT)
            self.assertEqual(set(context),{'hookEventName','additionalContext'})
            self.assertLessEqual(len(context['additionalContext']),500)
        else: self.assertEqual(output,{})

    def test_payload_and_scope(self):
        self.check_hook(self.payload(),True)
        for bad in ['garbage','[]','null','{}','x'*65537,dict(self.payload(),hook_event_name='Stop'),dict(self.payload(),cwd='relative'),dict(self.payload(),cwd=str(self.other)),dict(self.payload(),cwd=str(self.root/'absent'))]:
            with self.subTest(bad=str(bad)[:40]):self.check_hook(bad,False)
        self.check_hook(self.payload(),False,cwd=self.other,direct=True)
        self.check_hook(self.payload(),False,cwd=self.other)
        linked=self.base/'linked root';linked.symlink_to(self.root,target_is_directory=True)
        self.check_hook(self.payload(cwd=linked),True,cwd=linked)
        nested_payload=self.payload(cwd=self.child,patch=self.patch(str(self.root/TARGET)))
        self.check_hook(nested_payload,True,cwd=self.child)
        for marker in ['.git','AGENTS.md','AGENTS.override.md','.codex/config.toml','.codex/hooks.json']:
            boundary=self.child/marker;boundary.parent.mkdir(parents=True,exist_ok=True);boundary.write_text('fixture')
            self.check_hook(nested_payload,False,cwd=self.child)
            self.check_hook(nested_payload,False,direct=True)
            boundary.unlink()
        escape=self.root/'escape';escape.symlink_to(self.other,target_is_directory=True)
        self.check_hook(self.payload(cwd=escape),False,direct=True)

    def test_event_specific(self):
        if EVENT == 'SessionStart':
            for source in ('startup','resume','compact','clear'):
                self.check_hook(dict(self.payload(),source=source),True)
            self.check_hook(dict(self.payload(),source='unknown'),False)
            old=self.root/'source/Campus_Walkable_V4.blend';old.parent.mkdir();old.write_bytes(b'old fixture')
            self.check_hook(self.payload(),False);old.unlink()
            script=self.root/'scripts/export.py'
            for code in ["source = 'Campus.blend'",'broken (','x'*65537]:
                script.write_text(code);self.check_hook(self.payload(),False)
            script.unlink();self.check_hook(self.payload(),False)
            script.symlink_to(self.other/'outside.py');(self.other/'outside.py').write_text("source = 'source/Campus_Walkable_V4.blend'")
            self.check_hook(self.payload(),False)
        else:
            for kind in ('Update File','Add File','Delete File'):
                self.check_hook(self.payload(patch=self.patch(TARGET,kind)),True)
            move='*** Begin Patch\n*** Update File: other.txt\n*** Move to: '+TARGET+'\n@@\n-old\n+new\n*** End Patch'
            self.check_hook(self.payload(patch=move),True)
            self.check_hook(self.payload(patch=self.patch(str(self.root/TARGET))),True)
            self.check_hook(self.payload(patch=self.patch('unrelated.txt')),False)
            self.check_hook(self.payload(patch='*** Begin Patch\n*** Update File: README.md\n@@\n+*** Update File: '+TARGET+'\n*** End Patch'),False)
            self.check_hook(self.payload(patch=self.patch(TARGET+'.bak')),True)
            self.check_hook(self.payload(patch=self.patch(str(self.other/TARGET))),False)
            self.check_hook(dict(self.payload(),tool_name='Bash'),False)
            self.check_hook(dict(self.payload(),tool_input={'command':42}),False)
            self.check_hook(self.payload(patch='not a patch '+TARGET),False)
            self.check_hook(dict(self.payload(),tool_response={'error':'failed'}),True)
            target=self.root/TARGET;target.unlink();target.symlink_to(self.other/'protected');self.check_hook(self.payload(),False)
            target.unlink();target.write_text('fixture');(target.parent/'AGENTS.md').write_text('nested owner');self.check_hook(self.payload(),False)

if __name__ == '__main__':
    unittest.main()
