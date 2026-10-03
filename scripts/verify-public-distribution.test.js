'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readSnapshot, verifySnapshot, blobHash, main, MAX_FILE_BYTES } = require('./verify-public-distribution');

const root = path.resolve(__dirname, '..');
const snapshot = readSnapshot(root);
const BASELINE = 'scripts/public-release-baseline.json';
const CONTRACT = '.codex/skills/traecnclaw-mcp/references/mcp-tool-contracts.json';

function edit(name, transform) {
  const result = new Map(snapshot);
  result.set(name, Buffer.from(transform(result.get(name).toString('utf8'))));
  return result;
}

function editJson(name, transform) {
  return edit(name, value => {
    const object = JSON.parse(value);
    transform(object);
    return JSON.stringify(object);
  });
}

function rejects(name, make, pattern) {
  test(name, () => assert.throws(() => verifySnapshot(make()), pattern));
}

function fixture(run) {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'traecn-public-validation-'));
  try { return run(dir); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('current public distribution passes without install or network', () => {
  assert.deepEqual(verifySnapshot(snapshot), {
    version: '0.6.0', fileCount: 35, pinnedFileCount: 20, toolCount: 20,
    installsRun: false, networkUsed: false,
  });
});

test('repeated validation does not change any repository bytes', () => {
  const before = [...snapshot].map(([name, value]) => [name, blobHash(value)]);
  assert.deepEqual(main(['--root', root]), main(['--root', root]));
  assert.deepEqual([...readSnapshot(root)].map(([name, value]) => [name, blobHash(value)]), before);
});

for (const name of snapshot.keys()) {
  rejects(`rejects missing ${name}`, () => {
    const result = new Map(snapshot);
    result.delete(name);
    return result;
  }, /Missing file:/);
}

for (const name of ['release-manifest.json', BASELINE, CONTRACT]) {
  rejects(`rejects malformed JSON in ${name}`, () => edit(name, () => '{'), /Invalid JSON:/);
}
rejects('rejects private source accidentally added', () => new Map([...snapshot, ['src/server.js', Buffer.from('synthetic private source')]]), /Unexpected public file/);
rejects('rejects release archive in Git', () => new Map([...snapshot, ['traecnclaw-0.6.0.tgz', Buffer.from('synthetic archive')]]), /Generated artifact/);
rejects('rejects wrong release version', () => editJson('release-manifest.json', value => { value.version = '0.6.1'; }), /Release identity/);
rejects('rejects source revision drift', () => editJson('release-manifest.json', value => { value.sourceRevision = 'a'.repeat(40); }), /Release identity/);
rejects('rejects wrong repository', () => editJson('release-manifest.json', value => { value.repository += '-other'; }), /Repository identity/);
rejects('rejects changed Skill location', () => editJson('release-manifest.json', value => { value.skillPath = 'skills/other'; }), /Skill path/);
rejects('rejects incorrect npm scope', () => editJson('release-manifest.json', value => { value.marketplaces.npm.package = '@traecnclaw/traecnclaw'; }), /npm package identity/);
rejects('rejects different tap identity', () => editJson('release-manifest.json', value => { value.marketplaces.homebrew.formula = 'other/tap/traecnclaw'; }), /Homebrew identity/);
rejects('rejects partial SOURCE_REVISION sync', () => edit('SOURCE_REVISION', value => value.replace(/^Canonical release:.*\n/m, '')), /SOURCE_REVISION/);
rejects('rejects README source drift', () => edit('README.md', value => value.replace('40bcf770', '00000000')), /README provenance/);
rejects('rejects README npm scope drift', () => edit('README.md', value => value.replaceAll('@luckycat133/traecnclaw', '@traecnclaw/traecnclaw')), /README npm identity/);
rejects('rejects missing migration link', () => edit('README.md', value => value.replace('(docs/HOMEBREW-MIGRATION.md)', '(missing.md)')), /Missing migration link/);
rejects('rejects tool count mismatch', () => editJson(CONTRACT, value => { value.tools.pop(); }), /Tool count/);
rejects('rejects duplicate tool names', () => editJson(CONTRACT, value => { value.tools[1].name = value.tools[0].name; }), /Duplicate tool/);
rejects('rejects wrong tool input schema', () => editJson(CONTRACT, value => { value.tools[0].inputSchema.type = 'string'; }), /Invalid tool schema/);
rejects('rejects wrong contract version', () => editJson(CONTRACT, value => { value.contractVersion = 4; }), /Contract version/);
rejects('rejects Formula URL drift', () => edit('Formula/traecnclaw.rb', value => value.replace('/download/v0.6.0/', '/download/v0.6.1/')), /Formula release URL/);
rejects('rejects private Formula URL', () => edit('Formula/traecnclaw.rb', value => value.replace('/traecnclaw-mcp-skill/releases/', '/TRAECNclaw/releases/')), /Formula release URL/);
rejects('rejects duplicate Formula URL directive', () => edit('Formula/traecnclaw.rb', value => value + '\n  url "https://example.invalid/other.tgz"\n'), /Formula release URL/);
rejects('rejects Formula digest drift', () => edit('Formula/traecnclaw.rb', value => value.replace('ae7c2a91', '00000000')), /Formula SHA-256/);
rejects('rejects Formula body modification', () => edit('Formula/traecnclaw.rb', value => value + '# modified\n'), /Pinned public bytes changed/);
rejects('rejects re-enabling legacy workflow', () => edit('.github/workflows/sync-canonical.yml', value => value.replace('exit 1', 'exit 0')), /Pinned public bytes changed/);
rejects('rejects adding private-source checkout to legacy workflow', () => edit('.github/workflows/sync-canonical.yml', value => value + '      - uses: actions/checkout@v7\n'), /Pinned public bytes changed/);
rejects('rejects expanding legacy workflow permissions', () => edit('.github/workflows/sync-canonical.yml', value => value.replace('permissions: {}', 'permissions: write-all')), /Pinned public bytes changed/);
rejects('rejects Skill mutation', () => edit('.codex/skills/traecnclaw-mcp/SKILL.md', value => value + '\nchanged\n'), /Pinned public bytes changed/);
rejects('rejects baseline release mutation', () => editJson(BASELINE, value => { value.version = '0.6.1'; }), /Transition baseline/);
rejects('rejects baseline source mutation', () => editJson(BASELINE, value => { value.sourceRevision = 'a'.repeat(40); }), /Transition source/);
rejects('rejects baseline URL mutation', () => editJson(BASELINE, value => { value.tarballUrl += '?changed'; }), /Unexpected release URL/);
rejects('rejects baseline digest mutation', () => editJson(BASELINE, value => { value.tarballSha256 = '0'.repeat(64); }), /Unexpected release SHA/);
rejects('rejects duplicate allowlist entries', () => editJson(BASELINE, value => { value.allowedFiles.push(value.allowedFiles[0]); }), /Invalid file allowlist/);
rejects('rejects parent traversal in allowlist', () => editJson(BASELINE, value => { value.allowedFiles.push('../outside'); }), /Unsafe allowlist path/);
rejects('rejects incomplete pinned byte set', () => editJson(BASELINE, value => { delete value.pinnedBlobs.SOURCE_REVISION; }), /Incomplete pinned blobs/);

test('rejects file symlink without reading its target', () => fixture(dir => {
  fs.symlinkSync(path.join(dir, 'missing-outside-target'), path.join(dir, 'link'));
  assert.throws(() => readSnapshot(dir), /Symlink is not allowed/);
}));
test('rejects directory symlink', () => fixture(dir => {
  fs.mkdirSync(path.join(dir, 'outside'));
  fs.mkdirSync(path.join(dir, 'input'));
  fs.symlinkSync(path.join(dir, 'outside'), path.join(dir, 'input', 'directory'), 'dir');
  assert.throws(() => readSnapshot(path.join(dir, 'input')), /Symlink is not allowed/);
}));
test('rejects root symlink', () => fixture(dir => {
  fs.mkdirSync(path.join(dir, 'real'));
  fs.symlinkSync(path.join(dir, 'real'), path.join(dir, 'link'), 'dir');
  assert.throws(() => readSnapshot(path.join(dir, 'link')), /Root must be a real directory/);
}));
test('rejects root with symlink ancestor', () => fixture(dir => {
  fs.mkdirSync(path.join(dir, 'real', 'child'), { recursive: true });
  fs.symlinkSync(path.join(dir, 'real'), path.join(dir, 'link'), 'dir');
  assert.throws(() => readSnapshot(path.join(dir, 'link', 'child')), /Root must not traverse a symlink/);
}));
test('rejects binary content', () => fixture(dir => {
  fs.writeFileSync(path.join(dir, 'binary'), Buffer.from([0]));
  assert.throws(() => readSnapshot(dir), /Binary file/);
}));
test('rejects malformed UTF-8', () => fixture(dir => {
  fs.writeFileSync(path.join(dir, 'bad-utf8'), Buffer.from([0xff]));
  assert.throws(() => readSnapshot(dir), /Invalid UTF-8/);
}));
test('rejects oversized file before reading it', () => fixture(dir => {
  const file = path.join(dir, 'large');
  fs.writeFileSync(file, '');
  fs.truncateSync(file, MAX_FILE_BYTES + 1);
  assert.throws(() => readSnapshot(dir), /File exceeds size limit/);
}));
test('rejects generated directories before traversing', () => fixture(dir => {
  fs.mkdirSync(path.join(dir, 'dist'));
  assert.throws(() => readSnapshot(dir), /Forbidden directory/);
}));
test('rejects executable Formula data file', () => fixture(dir => {
  fs.mkdirSync(path.join(dir, 'Formula'));
  const formula = path.join(dir, 'Formula', 'traecnclaw.rb');
  fs.writeFileSync(formula, '# synthetic formula\n');
  fs.chmodSync(formula, 0o755);
  assert.throws(() => readSnapshot(dir), /Unexpected executable or special mode/);
}));
test('rejects missing executable bit on preserved executable script', () => fixture(dir => {
  const script = path.join(dir, '.codex/skills/traecnclaw-mcp/scripts/setup-mcp.js');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.writeFileSync(script, '// synthetic script\n');
  fs.chmodSync(script, 0o644);
  assert.throws(() => readSnapshot(dir), /Unexpected executable or special mode/);
}));
test('accepts the existing executable script mode', () => fixture(dir => {
  const script = path.join(dir, '.codex/skills/traecnclaw-mcp/scripts/setup-mcp.js');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.writeFileSync(script, '// synthetic script\n');
  fs.chmodSync(script, 0o755);
  assert.equal(readSnapshot(dir).size, 1);
}));
test('rejects unknown CLI options', () => assert.throws(() => main(['--publish']), /Usage:/));
test('rejects missing root argument', () => assert.throws(() => main(['--root']), /Usage:/));
test('rejects nonexistent root', () => assert.throws(() => main(['--root', path.join(root, 'does-not-exist')]), /ENOENT/));
