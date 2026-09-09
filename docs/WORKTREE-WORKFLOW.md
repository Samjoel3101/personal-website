# Worktree-first workflow

Every change to this repo — a feature, a bug fix, a refactor, a doc edit — is
made on a **fresh branch inside its own linked git worktree**, cut from
up-to-date `origin/main`. The primary checkout stays on `main` and stays clean;
nobody edits files there.

This is enforced, not just asked for. `.claude/hooks/require-worktree.mjs` is a
`PreToolUse` hook (wired in `.claude/settings.json`) that blocks
`Edit`/`Write`/`MultiEdit`/`NotebookEdit` on any file inside the repo whenever
the working copy is the primary checkout **or** sits on `main`. Edits outside
the repo (the scratchpad) are unaffected.

## Why

- **Isolation.** A worktree has its own working directory and its own branch, so
  parallel tasks never collide in one checkout and a half-finished change never
  sits on `main`.
- **A clean baseline is always one `cd` away.** The primary checkout stays on
  `main` — useful for comparisons, screenshots, and cutting the next branch.
- **Review parallelism.** A fresh-context session can review a branch in another
  worktree without disturbing the one that wrote it.

## The loop

### 1. Create the worktree

```bash
npm run wt:new -- <slug>
```

`<slug>` is a short kebab-case name for the work (`wind-shader`,
`fix-floating-reeds`). The script:

- `git fetch origin`,
- creates branch `claude/<slug>` from `origin/main`,
- adds a worktree at `../personal-website-worktrees/<slug>` (sibling of the
  primary checkout),
- runs `npm install` there.

Then move into it:

```bash
cd ../personal-website-worktrees/<slug>
```

### 2. Do the work

Branch naming is `claude/<slug>` — the `wt:new` script sets this; don't rename
it. Write a short plan (PR description or a scratch note) before non-trivial
work, per `CLAUDE.md`.

### 3. Check

```bash
npm run check
```

Lint, format, boundaries, assets, tests, build — all of it, in the worktree.
Must be green before you push.

### 4. Push and open a PR

```bash
git push -u origin claude/<slug>
gh pr create --fill   # or write a title/body
```

End the PR body with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

<session link>
```

End commit messages with the trailers this repo uses:

```
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: <session link>
```

### 5. Review, merge

Get the PR reviewed (a fresh session in the primary checkout or another worktree
is ideal — it isn't anchored to the reasoning that wrote the code). Then:

```bash
gh pr merge --squash --delete-branch
```

### 6. Tear down

```bash
cd -                      # back to the primary checkout
npm run wt:rm -- <slug>   # removes the worktree, deletes the local branch
```

`npm run wt:list` shows what worktrees exist if you lose track.

## The escape hatch

Setting `VALLEY_ALLOW_MAIN_WRITES=1` in the environment lets a write through even
in the primary checkout or on `main`, printing a warning instead of blocking.

It is legitimate in exactly two cases:

1. **Editing the harness itself** — the hook, `.claude/settings.json`,
   `scripts/worktree.sh`, or this doc. A worktree cut from `origin/main`
   wouldn't have your in-progress hook changes, so this work is done on a branch
   in the primary checkout.
2. **A true hotfix** — production is broken and the worktree ceremony is real
   time lost.

Everything else goes through a worktree. If you find yourself reaching for the
env var for ordinary feature work, stop and run `npm run wt:new` instead.
