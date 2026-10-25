'use strict';

// Offline, read-only transition guard. No installs, Formula evaluation, network,
// private checkout, publishing or credential access. Review baseline changes as
// part of a complete, pinned release export, never a floating-main Skill sync.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { TextDecoder } = require('node:util');

const BASELINE = 'scripts/public-release-baseline.json';
const SKILL = '.codex/skills/traecnclaw-mcp/';
const PUBLIC_REPO = 'https://github.com/Luckycat133/traecnclaw-mcp-skill';
const CANONICAL_REPO = 'https://github.com/Luckycat133/TRAECNclaw';
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 5 * MAX_FILE_BYTES;
const EXECUTABLE_FILES = new Set([`${SKILL}scripts/setup-mcp.js`, `${SKILL}scripts/setup-mcp.test.js`]);

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

function readSnapshot(root) {
  root = path.resolve(root);
  const rootStat = fs.lstatSync(root);
  requireThat(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'Root must be a real directory');
  requireThat(fs.realpathSync(root) === root, 'Root must not traverse a symlink');
  const files = new Map();
  let bytes = 0;
  let entries = 0;
  function visit(directory, relative = '') {
    for (const name of fs.readdirSync(directory).sort()) {
      // Git's administrative directory is never distribution input.
      if (relative === '' && name === '.git') continue;
      requireThat(++entries <= 200, 'Distribution contains too many entries');
      const entry = relative ? `${relative}/${name}` : name;
      const absolute = path.join(directory, name);
      const stat = fs.lstatSync(absolute);
      requireThat(!stat.isSymbolicLink(), `Symlink is not allowed: ${entry}`);
      if (stat.isDirectory()) {
        requireThat(!['node_modules', 'dist', 'npm-package'].includes(name), `Forbidden directory: ${entry}`);
        visit(absolute, entry);
      } else {
        requireThat(stat.isFile(), `Non-regular file is not allowed: ${entry}`);
        const expectedExecutableBits = EXECUTABLE_FILES.has(entry) ? 0o111 : 0;
        requireThat((stat.mode & 0o7111) === expectedExecutableBits, `Unexpected executable or special mode: ${entry}`);
        requireThat(stat.size <= MAX_FILE_BYTES, `File exceeds size limit: ${entry}`);
        bytes += stat.size;
        requireThat(bytes <= MAX_TOTAL_BYTES, 'Distribution exceeds size limit');
        requireThat(fs.realpathSync(absolute) === absolute, `Path must not traverse a symlink: ${entry}`);
        const descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
        let content;
        try {
          const opened = fs.fstatSync(descriptor);
          requireThat(opened.isFile() && opened.ino === stat.ino && opened.dev === stat.dev && opened.size === stat.size,
            `File changed during validation: ${entry}`);
          content = fs.readFileSync(descriptor);
        } finally { fs.closeSync(descriptor); }
        requireThat(!content.includes(0), `Binary file is not allowed: ${entry}`);
        try { new TextDecoder('utf-8', { fatal: true }).decode(content); }
        catch { throw new Error(`Invalid UTF-8: ${entry}`); }
        files.set(entry, content);
      }
    }
  }
  visit(root);
  return files;
}

function blobHash(content) {
  return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
}

function verifySnapshot(files) {
  function text(name) {
    requireThat(files.has(name), `Missing file: ${name}`);
    return files.get(name).toString('utf8');
  }
  function json(name) {
    try { return JSON.parse(text(name)); }
    catch (error) {
      if (error.message.startsWith('Missing file:')) throw error;
      throw new Error(`Invalid JSON: ${name}`);
    }
  }
  const baseline = json(BASELINE);
  requireThat(baseline.version === '0.6.0', 'Transition baseline must remain 0.6.0');
  requireThat(baseline.sourceRevision === '40bcf7707ed9b0ff7938aea8e511d0b87d300705', 'Transition source revision changed');
  requireThat(baseline.tarballUrl === `${PUBLIC_REPO}/releases/download/v0.6.0/traecnclaw-0.6.0.tgz`, 'Unexpected release URL');
  requireThat(baseline.tarballSha256 === 'ae7c2a9170e4525bb2b0bab8f9009c8a19ce7b68ff298bbceccc9e6fbbeb9f33', 'Unexpected release SHA-256');
  requireThat(Array.isArray(baseline.allowedFiles) && new Set(baseline.allowedFiles).size === baseline.allowedFiles.length,
    'Invalid file allowlist');
  const allowed = new Set(baseline.allowedFiles);
  for (const name of files.keys()) {
    requireThat(!/(^|\/)(?:dist|npm-package|node_modules)(\/|$)|\.(?:tgz|zip|mcpb)$/i.test(name), `Generated artifact is not allowed: ${name}`);
    requireThat(allowed.has(name), `Unexpected public file: ${name}`);
  }
  for (const name of allowed) {
    requireThat(typeof name === 'string' && !name.startsWith('/') && !name.split('/').some(part => !part || part === '.' || part === '..'), 'Unsafe allowlist path');
    text(name);
  }

  const manifest = json('release-manifest.json');
  requireThat(manifest.version === baseline.version && manifest.sourceRevision === baseline.sourceRevision, 'Release identity mismatch');
  requireThat(manifest.repository === PUBLIC_REPO && manifest.canonicalRepository === CANONICAL_REPO, 'Repository identity mismatch');
  requireThat(manifest.skillPath === SKILL.slice(0, -1), 'Skill path changed');
  requireThat(manifest.marketplaces?.npm?.package === '@luckycat133/traecnclaw', 'npm package identity mismatch');
  requireThat(manifest.marketplaces?.homebrew?.formula === 'Luckycat133/tap/traecnclaw', 'Homebrew identity mismatch');

  const source = text('SOURCE_REVISION');
  for (const line of [`Canonical repository: ${CANONICAL_REPO}`, `Canonical commit: ${baseline.sourceRevision}`,
    `Canonical release: v${baseline.version}`, 'Canonical path: skills/traecnclaw-mcp']) {
    requireThat(source.split('\n').filter(item => item === line).length === 1, 'SOURCE_REVISION mismatch');
  }
  const readme = text('README.md');
  requireThat(readme.includes(`Generated from canonical TRAECNclaw ${baseline.version} at commit \`${baseline.sourceRevision}\``), 'README provenance mismatch');
  requireThat(readme.includes(`@luckycat133/traecnclaw@${baseline.version}`) && !readme.includes('@traecnclaw/traecnclaw'), 'README npm identity mismatch');
  requireThat(readme.includes('(docs/HOMEBREW-MIGRATION.md)'), 'Missing migration link');

  const contracts = json(`${SKILL}references/mcp-tool-contracts.json`);
  requireThat(manifest.contractVersion === 5 && contracts.contractVersion === 5, 'Contract version mismatch');
  requireThat(manifest.toolCount === 20 && contracts.toolCount === 20 && contracts.tools?.length === 20, 'Tool count mismatch');
  requireThat(new Set(contracts.tools.map(tool => tool.name)).size === 20, 'Duplicate tool names');
  for (const tool of contracts.tools) {
    requireThat(typeof tool.name === 'string' && /^traecn_[a-z_]+$/.test(tool.name) && tool.inputSchema?.type === 'object', 'Invalid tool schema');
  }

  const formula = text('Formula/traecnclaw.rb');
  const values = key => [...formula.matchAll(new RegExp(`^  ${key} "([^"]+)"$`, 'gm'))].map(match => match[1]);
  requireThat(JSON.stringify(values('url')) === JSON.stringify([baseline.tarballUrl]), 'Formula release URL mismatch');
  requireThat(JSON.stringify(values('sha256')) === JSON.stringify([baseline.tarballSha256]), 'Formula SHA-256 mismatch');

  const pins = baseline.pinnedBlobs;
  requireThat(pins && typeof pins === 'object' && !Array.isArray(pins), 'Invalid pinned blobs');
  const protectedFiles = [...allowed].filter(name => name.startsWith('.codex/') ||
    ['SOURCE_REVISION', 'release-manifest.json', 'Dockerfile', 'glama.json', 'Formula/traecnclaw.rb',
      '.github/workflows/sync-canonical.yml'].includes(name));
  requireThat(Object.keys(pins).length === protectedFiles.length, 'Incomplete pinned blobs');
  for (const name of protectedFiles) {
    requireThat(/^[0-9a-f]{40}$/.test(pins[name]) && blobHash(files.get(name)) === pins[name], `Pinned public bytes changed: ${name}`);
  }
  return { version: manifest.version, fileCount: files.size, pinnedFileCount: protectedFiles.length,
    toolCount: contracts.tools.length, installsRun: false, networkUsed: false };
}

// These are checkout-only maintenance paths introduced by public main
// 8757117a39801649ca91cbc50ea1537534e83783. This is an exact inventory, not
// a directory ignore rule or permission to put maintenance files in a release.
// Link text is checked with readlink only; link targets are never traversed.
const CHECKOUT_MAINTENANCE = Object.freeze({
  ".agents/SKILLS.md": {"mode": "100644"},
  ".agents/hooks.json": {"mode": "100644"},
  ".agents/hooks/README.md": {"mode": "100644"},
  ".agents/hooks/project_context.py": {"mode": "100644"},
  ".agents/hooks/source.json": {"mode": "100644"},
  ".agents/hooks/test_project_context.py": {"mode": "100644"},
  ".agents/rules/generated-mirror-maintenance.md": {"mode": "100644"},
  ".agents/skills/github-actions/.clawhub/origin.json": {"mode": "100644"},
  ".agents/skills/github-actions/SKILL.md": {"mode": "100644"},
  ".agents/skills/github-actions/_meta.json": {"mode": "100644"},
  ".agents/skills/github-actions/debugging-playbook.md": {"mode": "100644"},
  ".agents/skills/github-actions/memory-template.md": {"mode": "100644"},
  ".agents/skills/github-actions/performance-tuning.md": {"mode": "100644"},
  ".agents/skills/github-actions/release-patterns.md": {"mode": "100644"},
  ".agents/skills/github-actions/security-model.md": {"mode": "100644"},
  ".agents/skills/github-actions/setup.md": {"mode": "100644"},
  ".agents/skills/github-actions/skill-card.md": {"mode": "100644"},
  ".agents/skills/github-actions/workflow-patterns.md": {"mode": "100644"},
  ".agents/skills/mcp-builder/LICENSE.txt": {"mode": "100644"},
  ".agents/skills/mcp-builder/SKILL.md": {"mode": "100644"},
  ".agents/skills/mcp-builder/reference/evaluation.md": {"mode": "100644"},
  ".agents/skills/mcp-builder/reference/mcp_best_practices.md": {"mode": "100644"},
  ".agents/skills/mcp-builder/reference/node_mcp_server.md": {"mode": "100644"},
  ".agents/skills/mcp-builder/reference/python_mcp_server.md": {"mode": "100644"},
  ".agents/skills/mcp-builder/scripts/connections.py": {"mode": "100644"},
  ".agents/skills/mcp-builder/scripts/evaluation.py": {"mode": "100644"},
  ".agents/skills/mcp-builder/scripts/example_evaluation.xml": {"mode": "100644"},
  ".agents/skills/mcp-builder/scripts/requirements.txt": {"mode": "100644"},
  ".agents/skills/traecnclaw-mcp": {"mode": "120000","target": "../../.codex/skills/traecnclaw-mcp"},
  ".agents/skills/traecnclaw-mirror-maintenance/SKILL.md": {"mode": "100644"},
  ".claude/hooks/README.md": {"mode": "100644"},
  ".claude/hooks/project_context.py": {"mode": "100644"},
  ".claude/hooks/source.json": {"mode": "100644"},
  ".claude/hooks/test_project_context.py": {"mode": "100644"},
  ".claude/settings.json": {"mode": "100644"},
  ".claude/skills/github-actions": {"mode": "120000","target": "../../.agents/skills/github-actions"},
  ".claude/skills/mcp-builder": {"mode": "120000","target": "../../.agents/skills/mcp-builder"},
  ".claude/skills/traecnclaw-mcp": {"mode": "120000","target": "../../.agents/skills/traecnclaw-mcp"},
  ".claude/skills/traecnclaw-mirror-maintenance": {"mode": "120000","target": "../../.agents/skills/traecnclaw-mirror-maintenance"},
  ".codex/hooks.json": {"mode": "100644"},
  ".codex/hooks/README.md": {"mode": "100644"},
  ".codex/hooks/mirror_edit_context.py": {"mode": "100644"},
  ".codex/hooks/test_project_context.py": {"mode": "100644"},
  ".codex/skills/github-actions": {"mode": "120000","target": "../../.agents/skills/github-actions"},
  ".codex/skills/mcp-builder": {"mode": "120000","target": "../../.agents/skills/mcp-builder"},
  "AGENTS.md": {"mode": "100644"},
  "CLAUDE.md": {"mode": "100644"},
  "GEMINI.md": {"mode": "100644"},
});
const CHECKOUT_BASELINE_BLOB = '130437d9e907cacb8e2816c39b8807355dc05ee2';

function checkedDirectory(absolute, label) {
  const stat = fs.lstatSync(absolute);
  requireThat(stat.isDirectory() && !stat.isSymbolicLink(), `Directory must not be a symlink: ${label}`);
  requireThat((stat.mode & 0o7000) === 0, `Unexpected special directory mode: ${label}`);
  requireThat(fs.realpathSync(absolute) === absolute, `Path must not traverse a symlink: ${label}`);
}

// Check every selected path's parents again immediately before opening it.
// This complements the inventory traversal and O_NOFOLLOW on the file itself.
function readCheckoutFile(root, entry) {
  const parts = entry.split('/');
  let parent = root;
  checkedDirectory(parent, '.');
  for (const part of parts.slice(0, -1)) {
    parent = path.join(parent, part);
    checkedDirectory(parent, path.relative(root, parent));
  }
  const absolute = path.join(root, entry);
  const stat = fs.lstatSync(absolute);
  requireThat(stat.isFile() && !stat.isSymbolicLink(), `Distribution file must be regular, not a symlink: ${entry}`);
  const expectedExecutableBits = EXECUTABLE_FILES.has(entry) ? 0o111 : 0;
  requireThat((stat.mode & 0o7111) === expectedExecutableBits, `Unexpected executable or special mode: ${entry}`);
  requireThat(stat.size <= MAX_FILE_BYTES, `File exceeds size limit: ${entry}`);
  requireThat(fs.realpathSync(absolute) === absolute, `Path must not traverse a symlink: ${entry}`);
  const descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  let content;
  try {
    const opened = fs.fstatSync(descriptor);
    requireThat(opened.isFile() && opened.ino === stat.ino && opened.dev === stat.dev &&
      opened.size === stat.size && opened.mode === stat.mode, `File changed during validation: ${entry}`);
    content = fs.readFileSync(descriptor);
    requireThat(content.length === stat.size, `File changed during validation: ${entry}`);
  } finally { fs.closeSync(descriptor); }
  requireThat(!content.includes(0), `Binary file is not allowed: ${entry}`);
  try { new TextDecoder('utf-8', { fatal: true }).decode(content); }
  catch { throw new Error(`Invalid UTF-8: ${entry}`); }
  return content;
}

function readCheckout(root) {
  root = path.resolve(root);
  checkedDirectory(root, '.');
  const baselineBytes = readCheckoutFile(root, BASELINE);
  // Do not let an edited checkout baseline silently classify additional public
  // files as distribution. A later release must review this adapter as well.
  requireThat(blobHash(baselineBytes) === CHECKOUT_BASELINE_BLOB, 'Checkout distribution baseline changed');
  const distribution = new Set(JSON.parse(baselineBytes).allowedFiles);
  const directories = new Set();
  for (const name of [...distribution, ...Object.keys(CHECKOUT_MAINTENANCE)]) {
    const parts = name.split('/');
    for (let length = 1; length < parts.length; length++) directories.add(parts.slice(0, length).join('/'));
  }
  const files = new Map();
  const maintenanceFiles = [];
  let entries = 0;
  let bytes = 0;
  function visit(directory, relative = '') {
    checkedDirectory(directory, relative || '.');
    for (const name of fs.readdirSync(directory).sort()) {
      if (relative === '' && name === '.git') continue;
      requireThat(++entries <= 200, 'Checkout contains too many entries');
      const entry = relative ? `${relative}/${name}` : name;
      const absolute = path.join(directory, name);
      if (directories.has(entry)) {
        checkedDirectory(absolute, entry);
        visit(absolute, entry);
      } else if (distribution.has(entry)) {
        const content = readCheckoutFile(root, entry);
        bytes += content.length;
        requireThat(bytes <= MAX_TOTAL_BYTES, 'Distribution exceeds size limit');
        files.set(entry, content);
      } else {
        const expected = Object.hasOwn(CHECKOUT_MAINTENANCE, entry) ? CHECKOUT_MAINTENANCE[entry] : null;
        requireThat(expected, `Unexpected checkout path: ${entry}`);
        const stat = fs.lstatSync(absolute);
        if (expected.mode === '120000') {
          requireThat(stat.isSymbolicLink(), `Maintenance link required: ${entry}`);
          requireThat(fs.readlinkSync(absolute) === expected.target, `Maintenance link target changed: ${entry}`);
        } else {
          requireThat(stat.isFile() && !stat.isSymbolicLink(), `Maintenance file must be regular: ${entry}`);
          requireThat((stat.mode & 0o7111) === 0, `Unexpected maintenance mode: ${entry}`);
          requireThat(stat.size <= MAX_FILE_BYTES, `Maintenance file exceeds size limit: ${entry}`);
        }
        maintenanceFiles.push(entry);
      }
    }
  }
  visit(root);
  for (const name of distribution) requireThat(files.has(name), `Missing file: ${name}`);
  return { files, maintenanceFiles };
}

function verifyCheckout(root) {
  const { files, maintenanceFiles } = readCheckout(root);
  return { ...verifySnapshot(files), excludedMaintenanceFileCount: maintenanceFiles.length };
}

function main(args) {
  const checkout = args[0] === '--checkout';
  if (checkout) args = args.slice(1);
  requireThat(args.length === 0 || (args.length === 2 && args[0] === '--root' && args[1]),
    'Usage: node scripts/verify-public-distribution.js [--checkout] [--root DIRECTORY]');
  const root = args.length ? args[1] : path.resolve(__dirname, '..');
  return checkout ? verifyCheckout(root) : verifySnapshot(readSnapshot(root));
}

if (require.main === module) {
  try { console.log(JSON.stringify(main(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(`Public distribution validation failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { readSnapshot, verifySnapshot, readCheckout, verifyCheckout, blobHash, main, MAX_FILE_BYTES, CHECKOUT_MAINTENANCE };
