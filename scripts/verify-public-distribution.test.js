'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readSnapshot, verifySnapshot, readCheckout, verifyCheckout, blobHash, main, MAX_FILE_BYTES, CHECKOUT_MAINTENANCE } = require('./verify-public-distribution');

const root = path.resolve(__dirname, '..');
const snapshot = readCheckout(root).files;
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
  assert.deepEqual(main(['--checkout', '--root', root]), main(['--checkout', '--root', root]));
  assert.deepEqual([...readCheckout(root).files].map(([name, value]) => [name, blobHash(value)]), before);
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

function writeDistribution(dir, files = snapshot) {
  for (const [name, content] of files) {
    const destination = path.join(dir, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
    fs.chmodSync(destination, /\/scripts\/setup-mcp(?:\.test)?\.js$/.test(name) ? 0o755 : 0o644);
  }
}

function writeMaintenance(dir) {
  for (const [name, entry] of Object.entries(CHECKOUT_MAINTENANCE)) {
    const destination = path.join(dir, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (entry.mode === '120000') fs.symlinkSync(entry.target, destination);
    else fs.writeFileSync(destination, 'synthetic checkout-only maintenance\n', { mode: 0o644 });
  }
}

function checkoutFixture(run) {
  return fixture(dir => {
    writeDistribution(dir);
    writeMaintenance(dir);
    return run(dir);
  });
}

function checkoutRejects(label, change, pattern) {
  test(label, () => checkoutFixture(dir => {
    change(dir);
    assert.throws(() => verifyCheckout(dir), pattern);
  }));
}

test('checkout entry supports both an isolated snapshot and all 83 classified paths', () => fixture(dir => {
  writeDistribution(dir);
  assert.deepEqual(verifyCheckout(dir), { ...verifySnapshot(snapshot), excludedMaintenanceFileCount: 0 });
  writeMaintenance(dir);
  assert.equal(Object.keys(CHECKOUT_MAINTENANCE).length, 48);
  assert.equal(Object.values(CHECKOUT_MAINTENANCE).filter(entry => entry.mode === '120000').length, 7);
  assert.deepEqual(main(['--checkout', '--root', dir]), {
    ...verifySnapshot(snapshot), excludedMaintenanceFileCount: 48,
  });
  assert.equal(readCheckout(dir).files.size + readCheckout(dir).maintenanceFiles.length, 83);
  assert.throws(() => readSnapshot(dir), /Symlink is not allowed/);
}));

test('selected strict snapshot preserves every distribution byte and original executable mode', () => checkoutFixture(dir => {
  const selected = readCheckout(dir).files;
  assert.deepEqual([...selected], [...snapshot]);
  assert.ok(readCheckout(dir).maintenanceFiles.every(name => !selected.has(name)));
  fixture(stage => {
    writeDistribution(stage, selected);
    assert.deepEqual([...readSnapshot(stage)], [...snapshot]);
    assert.deepEqual(main(['--root', stage]), verifySnapshot(snapshot));
    assert.equal(fs.statSync(path.join(stage, '.codex/skills/traecnclaw-mcp/scripts/setup-mcp.js')).mode & 0o777, 0o755);
    assert.equal(fs.statSync(path.join(stage, 'Formula/traecnclaw.rb')).mode & 0o777, 0o644);
  });
}));

test('maintenance link validation never resolves or reads its dangling target', () => fixture(dir => {
  writeDistribution(dir);
  const name = '.claude/skills/traecnclaw-mcp';
  const link = path.join(dir, name);
  fs.mkdirSync(path.dirname(link), { recursive: true });
  fs.symlinkSync(CHECKOUT_MAINTENANCE[name].target, link);
  assert.equal(fs.existsSync(link), false);
  const originalRealpath = fs.realpathSync;
  const originalReaddir = fs.readdirSync;
  fs.realpathSync = function (target, ...args) {
    assert.notEqual(target, link, 'maintenance link must not be resolved');
    return originalRealpath.call(this, target, ...args);
  };
  fs.readdirSync = function (target, ...args) {
    assert.notEqual(target, link, 'maintenance link must not be traversed');
    return originalReaddir.call(this, target, ...args);
  };
  try {
    assert.equal(verifyCheckout(dir).excludedMaintenanceFileCount, 1);
    assert.ok(!readCheckout(dir).files.has(name));
  } finally {
    fs.realpathSync = originalRealpath;
    fs.readdirSync = originalReaddir;
  }
}));

const pinned = Object.keys(JSON.parse(snapshot.get(BASELINE)).pinnedBlobs);
for (const name of pinned) {
  checkoutRejects(`checkout rejects missing pinned file ${name}`, dir => {
    fs.unlinkSync(path.join(dir, name));
  }, /Missing file:/);
  checkoutRejects(`checkout rejects modified pinned file ${name}`, dir => {
    fs.appendFileSync(path.join(dir, name), '\nmodified pinned bytes\n');
  }, /Pinned public bytes changed|Invalid JSON/);
}

for (const name of [
  'unknown.md', 'src/server.js', '.agents/unknown.md', '.agents/skills/mcp-builder/unknown.md',
  '.codex/unknown.md', '.codex/skills/traecnclaw-mcp/unknown.md',
  'dist/bundle.js', 'npm-package/package.json', 'node_modules/unexpected.js',
  'traecnclaw-0.6.0.tgz', '.agents/extra.zip', '.codex/hooks/extra.mcpb',
]) {
  checkoutRejects(`checkout rejects unclassified path ${name}`, dir => {
    const destination = path.join(dir, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, 'unclassified file');
  }, /Unexpected checkout path/);
}
checkoutRejects('checkout rejects even an unknown empty directory', dir => {
  fs.mkdirSync(path.join(dir, '.agents', 'unclassified'));
}, /Unexpected checkout path/);
checkoutRejects('checkout cannot expand distribution by changing the baseline', dir => {
  const destination = path.join(dir, BASELINE);
  const baseline = JSON.parse(fs.readFileSync(destination));
  baseline.allowedFiles.push('unknown.md');
  fs.writeFileSync(destination, JSON.stringify(baseline));
  fs.writeFileSync(path.join(dir, 'unknown.md'), 'not a reviewed distribution file');
}, /Checkout distribution baseline changed/);

for (const name of ['SOURCE_REVISION', 'Formula/traecnclaw.rb', BASELINE]) {
  checkoutRejects(`checkout rejects distribution file symlink ${name}`, dir => {
    const destination = path.join(dir, name);
    fs.unlinkSync(destination);
    fs.symlinkSync(path.join(dir, 'missing-outside-target'), destination);
  }, /Distribution file must be regular, not a symlink/);
}
for (const name of ['Formula', 'scripts', '.codex', '.codex/skills', '.codex/skills/traecnclaw-mcp']) {
  test(`checkout rejects distribution ancestor symlink ${name}`, () => fixture(outside => checkoutFixture(dir => {
    const destination = path.join(dir, name);
    fs.renameSync(destination, path.join(outside, 'real-directory'));
    fs.symlinkSync(path.join(outside, 'real-directory'), destination, 'dir');
    assert.throws(() => verifyCheckout(dir), /Directory must not be a symlink/);
  })));
}
for (const name of ['.agents', '.agents/skills', '.claude', '.codex/hooks']) {
  checkoutRejects(`checkout rejects maintenance ancestor symlink ${name}`, dir => {
    const destination = path.join(dir, name);
    fs.rmSync(destination, { recursive: true });
    fs.symlinkSync(path.join(dir, 'missing-outside-target'), destination, 'dir');
  }, /Directory must not be a symlink/);
}
checkoutRejects('checkout rejects changed maintenance link text', dir => {
  const destination = path.join(dir, '.agents/skills/traecnclaw-mcp');
  fs.unlinkSync(destination);
  fs.symlinkSync('/outside-untrusted-target', destination);
}, /Maintenance link target changed/);
checkoutRejects('checkout rejects regular-file substitution of a maintenance link', dir => {
  const destination = path.join(dir, '.agents/skills/traecnclaw-mcp');
  fs.unlinkSync(destination);
  fs.writeFileSync(destination, 'pretend link');
}, /Maintenance link required/);
checkoutRejects('checkout rejects link substitution of a maintenance regular file', dir => {
  const destination = path.join(dir, '.agents/SKILLS.md');
  fs.unlinkSync(destination);
  fs.symlinkSync('/outside-untrusted-target', destination);
}, /Maintenance file must be regular/);
checkoutRejects('checkout rejects executable mode on maintenance data', dir => {
  fs.chmodSync(path.join(dir, '.agents/SKILLS.md'), 0o755);
}, /Unexpected maintenance mode/);
checkoutRejects('checkout rejects executable mode on Formula', dir => {
  fs.chmodSync(path.join(dir, 'Formula/traecnclaw.rb'), 0o755);
}, /Unexpected executable or special mode/);
checkoutRejects('checkout rejects missing executable bits on preserved executable', dir => {
  fs.chmodSync(path.join(dir, '.codex/skills/traecnclaw-mcp/scripts/setup-mcp.js'), 0o644);
}, /Unexpected executable or special mode/);
checkoutRejects('checkout rejects special mode on selected parent directory', dir => {
  fs.chmodSync(path.join(dir, 'Formula'), 0o2755);
}, /Unexpected special directory mode/);
checkoutRejects('checkout rejects binary distribution content', dir => {
  fs.writeFileSync(path.join(dir, 'README.md'), Buffer.from([0]));
}, /Binary file/);
checkoutRejects('checkout rejects invalid UTF-8 distribution content', dir => {
  fs.writeFileSync(path.join(dir, 'README.md'), Buffer.from([0xff]));
}, /Invalid UTF-8/);
checkoutRejects('checkout rejects oversized distribution content before reading', dir => {
  fs.truncateSync(path.join(dir, 'README.md'), MAX_FILE_BYTES + 1);
}, /File exceeds size limit/);

test('checkout rejects root symlink and root symlink ancestor', () => fixture(dir => {
  fs.mkdirSync(path.join(dir, 'real'));
  fs.symlinkSync(path.join(dir, 'real'), path.join(dir, 'link'), 'dir');
  assert.throws(() => readCheckout(path.join(dir, 'link')), /Directory must not be a symlink/);
  fs.mkdirSync(path.join(dir, 'real', 'child'));
  assert.throws(() => readCheckout(path.join(dir, 'link', 'child')), /Path must not traverse a symlink/);
}));
test('checkout rejects missing root argument', () => assert.throws(() => main(['--checkout', '--root']), /Usage:/));
test('checkout rejects unknown additional options', () => assert.throws(() => main(['--checkout', '--publish']), /Usage:/));

// Raw metadata reads must not precede the checkout path/symlink guard.
test('workflow validates checkout boundaries before reading release metadata', () => {
  const workflow = snapshot.get('.github/workflows/validate.yml').toString('utf8');
  const guard = workflow.indexOf('node scripts/verify-public-distribution.js --checkout');
  const metadata = workflow.indexOf('- name: Validate source metadata');
  assert.ok(guard >= 0 && metadata > guard);
  assert.ok(workflow.indexOf('actions/setup-node@v6') < guard);
  assert.ok(workflow.indexOf('node --check scripts/verify-public-distribution.test.js') > guard);
});
