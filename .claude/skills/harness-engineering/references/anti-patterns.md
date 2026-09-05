# Harness Engineering — Anti-Patterns and Failure Modes

Read this before proposing anything an agent could optimize against, or when diagnosing why an existing harness is producing bad results.

## Gaming and reward hacking

Assume an agent optimizing hard against a metric will learn to exploit the harness rather than solve the underlying problem, especially over many iterations. Concretely guard against:

- **An agent editing both the work and its own evaluation.** If the agent can modify the test suite, the grading rubric, or the CI config it's being judged against, it can "pass" by weakening the check instead of fixing the code. Lock evaluation/rubric files out of the agent's write scope, or require a separate reviewer (human or different agent) for changes to eval code.
- **Self-graded metrics with no external check.** A scalar the agent both produces and grades itself against is not a feedback loop, it's a suggestion. Prefer deterministic, externally-verifiable checks (tests passing, types checking, a lint rule) over agent self-assessment wherever possible.
- **Verbose content that pleases a judge but doesn't help.** If an LLM grader rewards longer or more elaborate output, agents will produce longer, more elaborate, less useful output. Design rubrics to penalize this directly.
- **Auto-merge on agent-authored tests.** Tests the same agent wrote to validate its own change are weaker evidence than pre-existing or independently-written tests. Don't treat "my own new tests pass" as sufficient for auto-merge on anything non-trivial.

Mitigations that generalize: lock down evaluation code/rubrics separately from the work being evaluated; report per-dimension scores rather than one opaque scalar so gaming is easier to spot; preserve rejected attempts/logs rather than letting the agent overwrite history; route any change to governance/evaluation logic itself through human review regardless of how routine other changes are.

## Documentation and context failures

- **Bloated top-level docs.** An AGENTS.md/CLAUDE.md that tries to explain everything gets skimmed, not read, and crowds out context budget the agent needs for the actual task. Symptom: agent behavior doesn't reflect what's in the doc even though it's "right there." Fix is usually to cut, not add — move detail to references loaded on demand.
- **Stale docs that contradict the code.** Worse than no documentation, because the agent trusts it. If nothing keeps docs and code in sync (a check, a habit, a gardening pass), assume they will drift.
- **Explaining "how" when the doc should say "what must be true."** Prescriptive implementation instructions age badly and constrain unnecessarily; invariants age well and leave room for the agent to do better work inside them.

## Feedback loop failures

- **Flaky or slow tests treated as feedback.** If a test fails for reasons unrelated to the change half the time, both humans and agents learn to ignore failures — including real ones. Fixing flakiness is usually higher leverage than adding more tests.
- **Vague failure messages.** "Build failed" with no detail teaches an agent to guess-and-check rather than diagnose. Feedback needs to be specific enough to act on directly.
- **Reaching for an inferential check (an LLM judge or review agent) where a computational one would do.** Inferential checks are slower, costlier, and themselves gameable — an agent can often satisfy a vague judge's rubric without actually fixing the problem. If a type checker, linter, or test would catch it, use that first; save the judge for things that genuinely need judgment.

## Context and delegation failures

- **Letting the main thread do a subagent's job.** Reading a huge log file, exploring an unfamiliar part of the codebase, or grinding through a long search directly in the main conversation burns the context budget the actual decision-making needs later in the session. If the harness has subagents available, route open-ended exploration through one and bring back a summary — this is a context-management move, not just a parallelism one.

## Review and merge failures

- **Applying throughput-first merge philosophy indiscriminately.** "Corrections are cheap, waiting is expensive" is only true where rollback is genuinely cheap and blast radius is genuinely contained. It's actively dangerous applied uniformly to production infra, payments, migrations, or anything touching real user data. Match the review/merge philosophy to actual reversibility, not to a general vibe of "agents are fast now."
- **Adding agent-to-agent review or heavy tiered review before volume justifies it.** This is pure process overhead on a low-volume project and will slow things down for no benefit — a common mistake when applying "scale-stage" practices to a project that isn't at that stage.

## Over-scaffolding failures

- **Building the full harness into a brand-new repo before any agent has actually failed at anything.** All ten pillars, day one, on a project with no history of what actually goes wrong, is cargo cult, not preparation — it burns effort on guessed problems and produces docs/checks nobody has validated against a real failure. Start with the irreducible core (short AGENTS.md, fast feedback loop, plan-before-you-build habit) and let the rest accrete from observed friction.
- **Treating harness scaffolding as done once it exists**, with no check on whether it actually reduced the failure it was meant to prevent. See "Evaluating the Harness Itself" in `references/pillars.md` — a harness change with no evidence it helped is a pillar-5 cleanup candidate, not a permanent fixture.

## Security and supply-chain risk (skills and third-party harness pieces specifically)

- **Installing third-party skills without reading them.** A skill can look benign on the surface and still contain a later step that fetches and executes something malicious, or hidden instructions (e.g. invisible Unicode) not visible on casual read. Review skill contents — not just the README — before installing or recommending one, especially from an unfamiliar source.
- **Treating a skill as static after install.** An upstream repo can be compromised after you've already adopted it. Pin versions / review diffs on updates rather than auto-pulling latest.

## General diagnosis heuristic

When a harness isn't producing good results, check in this order before adding new infrastructure: 0. Is there actually a failure to diagnose, or is this a fresh repo with no track record yet? Don't manufacture a diagnosis where none exists — see "Over-scaffolding failures" above.

1. Is the feedback loop actually fast and specific, or does it just look like it should be?
2. Is the always-loaded doc actually being read, or is it too long/stale to trust?
3. Is the failure a missing constraint (agent _could_ do the wrong thing) or a missing feedback signal (agent _did_ the wrong thing and didn't find out)? These need different fixes — constraints prevent, feedback loops catch.
4. Only after those are ruled out, consider heavier additions (review tiers, multi-agent coordination, new memory systems) — these solve scale problems, not signal problems.
