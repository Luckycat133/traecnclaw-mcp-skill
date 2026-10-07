#!/usr/bin/env python3
"""Run actual hook processes in isolated fixtures, without loading project code."""
import json, os, shutil, subprocess, sys, tempfile, unittest
from pathlib import Path
KIND = 'mirror'
CALLS = 0
SCRIPT = Path(__file__).with_name('project_context.py')
class HookTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='claude hook ')
  self.addCleanup(self.tmp.cleanup)
  self.base=Path(self.tmp.name);self.root=self.base/'project';self.root.mkdir()
  self.script=self.root/'.claude/hooks/project_context.py';self.script.parent.mkdir(parents=True);shutil.copyfile(SCRIPT,self.script)
  self.child=self.root/'subdir';self.child.mkdir()
  if KIND=='campus':
   (self.root/'Campus.blend').write_bytes(b'fixture')
   (self.root/'scripts').mkdir();(self.root/'scripts/export.py').write_text("SOURCE='source/Campus_Walkable_V4.blend'\n")
  self.target=self.root/('.codex/skills/traecnclaw-mcp/SKILL.md' if KIND=='mirror' else 'src/app/save-write-coordinator.js')
  self.target.parent.mkdir(parents=True,exist_ok=True);self.target.write_text('fixture')
 def data(self):
  return {'cwd':str(self.root),'hook_event_name':'SessionStart','source':'startup'} if KIND=='campus' else {'cwd':str(self.root),'hook_event_name':'PostToolUse','tool_name':'Write','tool_input':{'file_path':str(self.target)},'tool_response':{'type':'create'}}
 def call(self,data=None,raw=None,cwd=None,expected=False):
  global CALLS
  payload=raw if raw is not None else json.dumps(data if data is not None else self.data()).encode()
  p=subprocess.run([sys.executable,str(self.script)],input=payload,cwd=str(cwd or self.root),stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=3)
  CALLS+=1;self.assertEqual(p.returncode,0,p.stderr);self.assertEqual(p.stderr,b'');out=json.loads(p.stdout)
  if expected:
   self.assertEqual(set(out),{'hookSpecificOutput'});h=out['hookSpecificOutput'];self.assertEqual(set(h),{'hookEventName','additionalContext'});self.assertTrue(h['additionalContext']);self.assertLessEqual(len(h['additionalContext']),500)
  else:self.assertEqual(out,{})
 def test_scope_and_invalid_inputs(self):
  self.call(expected=True)
  d=self.data();d['cwd']=str(self.child);self.call(d,cwd=self.child,expected=True)
  for raw in [b'',b'{',b'null',b'[]',b'1',b'"x"',b'x'*65537]:self.call(raw=raw)
  for key,val in [('cwd',None),('cwd',[]),('cwd','relative'),('cwd',str(self.base)),('hook_event_name',[]),('hook_event_name','Stop')]:
   d=self.data();d[key]=val;self.call(d)
  self.call(cwd=self.base)
  for marker in ['.git','CLAUDE.md','GEMINI.md','.claude/settings.json','.claude/CLAUDE.md','.claude/settings.local.json']:
   m=self.child/marker;m.parent.mkdir(exist_ok=True);m.write_text('fixture');d=self.data();d['cwd']=str(self.child);self.call(d,cwd=self.child);m.unlink()
  link=self.base/'alias';link.symlink_to(self.root,target_is_directory=True);d=self.data();d['cwd']=str(link);self.call(d,cwd=link,expected=True)
 def test_native_contract_and_dynamic_condition(self):
  if KIND=='campus':
   for source in ['startup','resume','clear','compact','fork']:
    d=self.data();d['source']=source;self.call(d,expected=True)
   for source in [None,[],1,'other']:
    d=self.data();d['source']=source;self.call(d)
   legacy=self.root/'source/Campus_Walkable_V4.blend';legacy.parent.mkdir();legacy.write_text('fixture');self.call();legacy.unlink()
   f=self.root/'scripts/export.py'
   for text in ['SOURCE="Campus.blend"','bad syntax !!!','x'*65537]:f.write_text(text);self.call()
   f.unlink();f.symlink_to(self.base/'external.py');(self.base/'external.py').write_text("SOURCE='source/Campus_Walkable_V4.blend'");self.call()
  else:
   for tool in ['Edit','Write']:
    d=self.data();d['tool_name']=tool;self.call(d,expected=True)
   for tool in ['Bash','apply_patch',None,[]]:
    d=self.data();d['tool_name']=tool;self.call(d)
   for val in [None,[],{},'text',{'file_path':None},{'file_path':[]},{'file_path':'relative'},{'file_path':'/tmp/unrelated'},{'file_path':str(self.target)+'.bak' if KIND!='mirror' else str(self.root/'.codex/skills/traecnclaw-mcp-other/SKILL.md')}]:
    d=self.data();d['tool_input']=val;self.call(d)
   d=self.data();d['tool_input']={'file_path':str(self.root/'ordinary.md'),'content':str(self.target)};self.call(d)
   for val in [{'isError':True},{'error':'failed'}]:
    d=self.data();d['tool_response']=val;self.call(d)
   # A client skill alias resolves to the real in-project target.
   link=self.root/'alias-target';link.symlink_to(self.target);d=self.data();d['tool_input']['file_path']=str(link);self.call(d,expected=True)
   self.target.unlink();self.target.symlink_to(self.base/'external');(self.base/'external').write_text('fixture');self.call()
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(HookTests));print('fixture_invocations='+str(CALLS));sys.exit(not result.wasSuccessful())
