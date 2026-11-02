#!/usr/bin/env node
// One-time setup: checks Node, installs Ollama if missing, and builds the security scanner.
// Asks before installing anything. Use --yes to accept every prompt.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assumeYes = process.argv.includes('--yes');
const problems = [];

const run = (command, args, options = {}) =>
  spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options })
    .status === 0;
const has = (command, args = ['--version']) =>
  spawnSync(command, args, { stdio: 'ignore' }).status === 0;

async function confirm(question) {
  if (assumeYes) return true;
  if (!process.stdin.isTTY) {
    console.log(
      `  ${question} — skipped (not interactive). Re-run with --yes to accept.`,
    );
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`  ${question} [Y/n] `))
    .trim()
    .toLowerCase();
  rl.close();
  return answer === '' || answer === 'y' || answer === 'yes';
}

console.log('AGENTGATE setup\n');

console.log('1. Node.js');
const major = Number(process.versions.node.split('.')[0]);
if (major < 24) {
  console.log(
    `  Node ${process.versions.node} is too old. Use Node 24 (nvm install 24 && nvm use).`,
  );
  process.exit(1);
}
console.log(`  OK (${process.versions.node})`);

console.log('\n2. Ollama (runs local models)');
if (has('ollama')) {
  console.log('  OK (installed)');
} else if (process.platform === 'darwin' && has('brew')) {
  if (
    (await confirm('Install Ollama with Homebrew?')) &&
    run('brew', ['install', 'ollama'])
  ) {
    console.log('  Installed.');
  } else problems.push('Ollama is not installed. Run: brew install ollama');
} else {
  console.log(
    '  Not installed. Download it from https://ollama.com/download, then re-run this setup.',
  );
  problems.push('Ollama is not installed: https://ollama.com/download');
}

console.log('\n3. Security scanner (LLM Guard)');
const python = join(root, 'scanner', '.venv', 'bin', 'python');
if (existsSync(python) && has(python, ['-c', 'import llm_guard'])) {
  console.log('  OK (installed)');
} else if (
  await confirm(
    'Install the scanner now? It is a one-time download of about 2 GB (Python packages)',
  )
) {
  if (run('sh', ['scanner/setup.sh']))
    console.log(
      '  Installed. Its model downloads on first start (about 700 MB).',
    );
  else problems.push('The scanner install failed; see the messages above.');
} else
  problems.push(
    'The scanner is not installed, so tasks and documents stay blocked. Run: npm run setup',
  );

console.log('');
if (problems.length > 0) {
  console.log('Setup is incomplete:');
  for (const problem of problems) console.log(`  - ${problem}`);
  process.exit(1);
}
console.log('All set. Start the app with:  npm start');
