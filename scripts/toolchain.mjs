import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = join(root, 'test/scratch');
const deps = join(scratch, 'toolchain');
const action = process.argv[2];
const run = (bin, args, cwd = root) => {
  const result = spawnSync(bin, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
// The assignment disallows modifying node_modules outside its disposable scratch area.
// A conventional npm ci installation also works when rebuilding outside that restriction.
if (action === 'setup') {
  mkdirSync(deps, { recursive: true });
  cpSync(join(root, 'package.json'), join(deps, 'package.json'));
  if (existsSync(join(root, 'package-lock.json'))) cpSync(join(root, 'package-lock.json'), join(deps, 'package-lock.json'));
  run('npm', [existsSync(join(root, 'package-lock.json')) ? 'ci' : 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', join(scratch, 'npm-cache')], deps);
  cpSync(join(deps, 'package-lock.json'), join(root, 'package-lock.json'));
  process.exit(0);
}
const modules = existsSync(join(root, 'node_modules/vite')) ? join(root, 'node_modules') : join(deps, 'node_modules');
if (!existsSync(modules)) throw new Error('Run npm run setup first (or npm ci).');
const project = join(scratch, 'project');
mkdirSync(project, { recursive: true });
for (const name of ['src', 'tests', 'public', 'index.html', 'tsconfig.json', 'vite.config.ts', 'package.json']) {
  rmSync(join(project, name), { recursive: true, force: true });
  cpSync(join(root, name), join(project, name), { recursive: true });
}
if (!existsSync(join(project, 'node_modules'))) symlinkSync(modules, join(project, 'node_modules'), 'dir');
if (action === 'typecheck') run(process.execPath, [join(modules, 'typescript/bin/tsc'), '--noEmit', '-p', join(project, 'tsconfig.json')]);
else if (action === 'build') {
  const { build } = await import(pathToFileURL(join(modules, 'vite/dist/node/index.js')));
  await build({ root: project, build: { outDir: join(root, 'dist'), emptyOutDir: true } });
} else if (action === 'preview') {
  const { preview } = await import(pathToFileURL(join(modules, 'vite/dist/node/index.js')));
  const server = await preview({ root: project, build: { outDir: join(root, 'dist') }, preview: { host: '127.0.0.1', port: 4173 } });
  server.printUrls();
} else if (action === 'interactions') {
  run(process.execPath, ['--import', pathToFileURL(join(modules, 'tsx/dist/loader.mjs')).href, join(project, 'tests/dom-interactions.tsx')], project);
} else if (action === 'test') {
  run(process.execPath, ['--import', pathToFileURL(join(modules, 'tsx/dist/loader.mjs')).href, '--test', ...JSON.parse(readFileSync(join(root, 'tests/manifest.json'), 'utf8')).map(p => resolve(root, p))]);
} else throw new Error('Expected setup, build, typecheck, preview, test or interactions.');
