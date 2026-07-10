#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const sourceTarball = path.join(repoRoot, 'dist', 'traecnclaw-0.3.0.tgz');
const outputDir = path.join(repoRoot, 'npm-package');
const publicRepository = 'https://github.com/Luckycat133/traecnclaw-mcp-skill';
const nodeShebang = '#!/usr/bin/env node\n';

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }

  return result.stdout.trim();
}

if (!fs.existsSync(sourceTarball)) {
  throw new Error(`Missing source tarball: ${sourceTarball}`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traecnclaw-npm-'));

try {
  run('tar', ['-xzf', sourceTarball, '-C', tempDir], repoRoot);

  const packageDir = path.join(tempDir, 'package');
  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  delete packageJson.private;
  packageJson.homepage = `${publicRepository}#readme`;
  packageJson.repository = {
    type: 'git',
    url: `git+${publicRepository}.git`
  };
  packageJson.bugs = {
    url: `${publicRepository}/issues`
  };
  packageJson.publishConfig = {
    access: 'public'
  };

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  for (const binPath of Object.values(packageJson.bin || {})) {
    const absoluteBinPath = path.join(packageDir, binPath);
    const source = fs.readFileSync(absoluteBinPath, 'utf8');
    if (!source.startsWith('#!')) {
      fs.writeFileSync(absoluteBinPath, `${nodeShebang}${source}`);
    }
    fs.chmodSync(absoluteBinPath, 0o755);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const packOutput = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', outputDir], packageDir));
  const packed = packOutput[0];
  const packedPath = path.join(outputDir, packed.filename);
  const packedManifest = JSON.parse(run('tar', ['-xOf', packedPath, 'package/package.json'], repoRoot));

  if (packedManifest.private === true) {
    throw new Error('Repacked npm manifest is still private');
  }
  if (packedManifest.repository?.url !== `git+${publicRepository}.git`) {
    throw new Error('Repacked npm manifest has the wrong repository URL');
  }

  for (const binPath of Object.values(packedManifest.bin || {})) {
    const packedSource = run('tar', ['-xOf', packedPath, `package/${binPath.replace(/^\.\//, '')}`], repoRoot);
    if (!packedSource.startsWith('#!/usr/bin/env node')) {
      throw new Error(`Repacked npm bin is missing a Node shebang: ${binPath}`);
    }
  }

  console.log(JSON.stringify({
    package: `${packedManifest.name}@${packedManifest.version}`,
    tarball: path.relative(repoRoot, packedPath),
    bytes: packed.size,
    integrity: packed.integrity,
    access: packedManifest.publishConfig.access,
    repository: packedManifest.repository.url
  }, null, 2));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
