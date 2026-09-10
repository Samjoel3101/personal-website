#!/usr/bin/env node
/**
 * PreToolUse gate for Edit/Write/MultiEdit/NotebookEdit.
 *
 * This repo is worktree-first (docs/WORKTREE-WORKFLOW.md): every change is made
 * on a fresh branch inside a linked git worktree, never in the primary checkout
 * and never on `main`. That rule is worthless as prose alone — an agent skims
 * it and edits `main` anyway — so this hook enforces it mechanically.
 *
 * It denies (exit 2) when a write targets a file inside this repo while the
 * working copy is the primary checkout OR sits on `main`. Writes outside the
 * repo (the session scratchpad) are always allowed. The escape hatch
 * VALLEY_ALLOW_MAIN_WRITES=1 lets a write through with a warning, for the two
 * legitimate cases: editing the harness/hooks themselves, and a true hotfix.
 *
 * Node stdlib only. Fails open on anything unexpected — a broken gate that
 * blocks every edit is worse than a missing one.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

function allow(message) {
  if (message) process.stderr.write(`${message}\n`);
  process.exit(0);
}

function deny(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

/** Realpath the nearest ancestor that exists, so a not-yet-created file resolves. */
function realpathOfNearest(path) {
  let current = resolve(path);
  while (!existsSync(current) && dirname(current) !== current) current = dirname(current);
  return realpathSync(current);
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  allow();
}

const filePath = payload?.tool_input?.file_path;
const cwd = payload?.cwd || process.cwd();
if (!filePath) allow();

let repoRoot;
try {
  repoRoot = realpathSync(git(cwd, ['rev-parse', '--show-toplevel']));
} catch {
  allow(); // not a git repo — not our concern
}

const absTarget = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
const target = realpathOfNearest(absTarget);
if (target !== repoRoot && !target.startsWith(`${repoRoot}/`)) {
  allow(); // outside the repo (scratchpad, home dir) — always fine
}
const relTarget = relative(repoRoot, absTarget) || '.';

let isPrimary = true;
let branch = '(unknown)';
try {
  const gitDir = realpathSync(resolve(cwd, git(cwd, ['rev-parse', '--git-dir'])));
  const commonDir = realpathSync(resolve(cwd, git(cwd, ['rev-parse', '--git-common-dir'])));
  isPrimary = gitDir === commonDir;
  branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
} catch {
  allow(); // can't tell where we are — don't block
}

if (!isPrimary && branch !== 'main') allow(); // already in a feature worktree

const where = isPrimary ? 'the primary checkout' : 'a linked worktree';
if (process.env.VALLEY_ALLOW_MAIN_WRITES === '1') {
  allow(
    [
      `[require-worktree] WARNING: writing to ${where} on branch \`${branch}\` with`,
      'VALLEY_ALLOW_MAIN_WRITES=1. Legitimate only for harness/hook edits or a true hotfix.',
    ].join(' '),
  );
}

deny(
  [
    `[require-worktree] Blocked write to ${relTarget}`,
    '',
    `This repo is worktree-first. You are on \`${branch}\` in ${where}; changes never`,
    'land here. Create an isolated worktree on a fresh branch and redo the edit there:',
    '',
    '    npm run wt:new -- <slug>       # ../personal-website-worktrees/<slug> on branch claude/<slug>',
    '    cd ../personal-website-worktrees/<slug>',
    '',
    'Then run `npm run check` there, push, and open a PR. See docs/WORKTREE-WORKFLOW.md.',
    '',
    'Escape hatch (harness/hook edits or a true hotfix only): set VALLEY_ALLOW_MAIN_WRITES=1',
  ].join('\n'),
);
