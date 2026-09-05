# Harness Engineering — Long-Running and Multi-Session Agents

Read this file when the work at hand can't fit in one context window or one sitting: a large greenfield build, a multi-day migration, anything where the agent (or a series of agent sessions) needs to pick up work it didn't just do. This is pillars 6 and 7 (plans as artifacts, externalized state) made concrete, plus the context-management side of pillar 9.

The patterns below are drawn from observed failure modes in long-running coding agents: agents that try to "one-shot" an entire project and run out of context mid-way, and agents that declare a task done after partial progress because nothing forced them to check.

**Contents:** [The two-phase pattern](#the-two-phase-pattern) · [State that survives a session boundary](#state-that-survives-a-session-boundary) · [The session-start sequence](#the-session-start-sequence) · [Work in checkpointable increments](#work-in-checkpointable-increments) · [Verify before declaring done](#verify-before-declaring-done) · [Context window mechanics](#context-window-mechanics) · [When to add multi-agent specialization](#when-to-add-multi-agent-specialization)

---

## The two-phase pattern

Split the work into a **setup phase** that runs once and a **steady-state phase** that repeats across sessions:

- **Setup (once):** establish the environment — scaffold the project, write the initialization script, generate the full feature/requirement list, make the first commit. This phase gets its own prompt; don't reuse the steady-state prompt for it, since the two have almost nothing in common (one is "build the skeleton," the other is "make one more increment against an existing skeleton").
- **Steady state (repeated):** each session picks up where the last one left off, makes incremental progress on one unit of work, and leaves the repo in a state the next session (or a human) can pick up cleanly.

Trying to collapse these into one undifferentiated loop is what produces both failure modes at once: the agent either tries to do setup-scale work every session (re-deciding architecture repeatedly) or treats the first session like steady-state and never actually finishes bootstrapping.

## State that survives a session boundary

A fresh context window knows nothing except what's in the repo. Give it enough to reconstruct state without replaying the whole history:

- **A structured requirement/feature list**, one entry per unit of work, each marked passing/failing with enough detail (test steps, acceptance criteria) that a new session can pick the next one without guessing. Prefer a **structured format like JSON over free-form markdown** for this file specifically — it makes editing more deliberate and harder to "helpfully" reword or quietly delete, which matters because **an agent editing or removing an existing test/requirement to make it pass is a correctness bug, not a shortcut.** Treat this file as something the agent appends to and flips flags in, not something it rewrites.
- **A running progress log** (e.g. `claude-progress.txt` or equivalent) — plain narration of what was tried, what worked, what didn't, written at the end of each session. This is cheap to write and disproportionately useful to the next session.
- **Git history itself**, with descriptive commit messages — the log a new agent gets for free if commits are atomic and explain *why*, not just *what*. This is externalized memory pillar 7 already gives you; don't let long-running work be the exception that skips it.
- **An initialization script** (`init.sh` or equivalent) that starts whatever needs to be running (dev server, database, watchers) — write it once during setup, and have every session run it rather than re-deriving the incantation from scratch each time.

## The session-start sequence

Every steady-state session should open with the same small ritual before writing any code:

1. Confirm where it is (working directory, branch).
2. Read the progress log and recent git history to reconstruct what's already true.
3. Read the requirement/feature list and pick the highest-priority incomplete item — not just the easiest one.
4. Run the init script to get the environment into a known state.
5. Run whatever end-to-end verification exists *before* starting new work, to confirm the previous session's claimed progress actually holds up. Don't take the last session's word for it.

This costs a small, fixed amount of tokens and saves far more by preventing duplicated work or building on a broken assumption.

## Work in checkpointable increments

- Scope each session to one unit of work (one feature, one migration step), not "as much as fits."
- Commit at the end of the increment with a message that explains the change, not just labels it.
- Leave the repo **merge-ready** at the session boundary: no known-broken state, no half-finished refactor blocking the next session, documentation updated if behavior changed. A session that runs out of context mid-refactor with the repo in a broken state has made the next session's job harder than if it had stopped one step earlier and committed.

## Verify before declaring done

The single highest-leverage habit: don't mark a unit of work complete because the code compiles or the happy path looks right in isolation. Run the same kind of check a human would — an end-to-end test, a browser automation pass, an actual invocation of the changed behavior — before flipping the status in the feature list.

Be honest about the limits of automated verification. Some categories of bug are genuinely invisible to the tools available (a native OS dialog a browser-automation tool can't see, a visual regression a text-based check can't catch). When a category like this is known, say so explicitly in the harness rather than letting silence imply "verified" — flag it for human spot-checking instead of letting the agent self-certify past a blind spot.

## Context window mechanics

Long-running work runs into the context window as a hard constraint, not just a soft inconvenience — quality degrades as it fills, and a session that tries to push through a nearly-full window rather than checkpointing tends to produce worse output than one that stops and hands off cleanly. Concretely:

- Prefer **compaction** (summarizing older parts of the conversation) over letting the window fill and degrade silently, where the harness supports it.
- Use **structured handoff artifacts** (the progress log and feature list above) so a new session reconstructs state from a few files instead of needing the old transcript at all — this is what actually makes compaction safe.
- Delegate context-hungry side-quests (reading a large log, exploring an unfamiliar module) to a subagent so the main session's window stays available for the actual decision-making. See pillar 9.

## When to add multi-agent specialization

Splitting the work across specialized agents — one that writes, one that tests, one that does periodic cleanup — can help once a project is large enough that context and role-switching overhead are themselves a bottleneck. It's not a default: a single generalist agent working the session-start sequence above is simpler to reason about and sufficient for most projects. Treat multi-agent specialization the same way as agent-to-agent review (pillar 8) — justified by observed scale, not adopted preemptively.
