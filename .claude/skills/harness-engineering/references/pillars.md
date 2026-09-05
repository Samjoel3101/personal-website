# Harness Engineering — Pillars in Detail

Read this file when you're actually applying one of these pillars to a real project — not as upfront study. Each section gives: what it means, what it looks like concretely, and signals for when it matters more or less.

**Contents:** [1. Repository as System of Record](#1-repository-as-system-of-record) · [2. Map, not Manual](#2-map-not-manual) · [3. Tight Feedback Loops](#3-tight-feedback-loops) · [4. Enforced Architecture, Local Autonomy](#4-enforced-architecture-local-autonomy) · [5. Continuous Garbage Collection](#5-continuous-garbage-collection) · [6. Plans as First-Class Artifacts](#6-plans-as-first-class-artifacts) · [7. Externalized State and Session Continuity](#7-externalized-state-and-session-continuity) · [8. Review That Scales](#8-review-that-scales) · [9. Constraints, Observability, and Tool Discipline](#9-constraints-observability-and-tool-discipline) · [10. Codebase Harnessability](#10-codebase-harnessability) · [Evaluating the Harness Itself](#evaluating-the-harness-itself)

---

## 1. Repository as System of Record

**What it means:** Anything an agent needs to know to do the work correctly — architecture decisions, naming conventions, "why we don't do X here," known footguns, deployment quirks — should live in the repo in a form the agent can read. If a human has to explain something to an agent that isn't written down anywhere, that's a harness gap: write it down, once, and it never needs re-explaining.

**Concretely:**
- Architecture and conventions in versioned markdown (AGENTS.md, ARCHITECTURE.md, ADRs), not Slack threads or tribal knowledge.
- "Corrections become permanent" — anytime an agent makes a mistake that a human corrects, that correction becomes a doc update or a lint rule, not a one-off chat message.
- Decisions and their rationale, not just the current state — future agents (and humans) need to know *why*, or they'll "fix" it back.

**Matters more when:** the project has real history/scar tissue, multiple contributors (human or agent), or has been burned by repeated re-explaining of the same context.
**Matters less when:** a small, young, single-owner project where conventions are still forming — premature documentation here just goes stale.

---

## 2. Map, not Manual

**What it means:** Progressive disclosure. The always-loaded entry point (AGENTS.md/CLAUDE.md) should be a short map — what exists, where to find it, which doc to read for what — not an attempt to explain the whole system inline. Depth lives in linked reference files loaded only when relevant.

**Concretely:**
- Keep the top-level agent doc short (rough guideline: well under a few hundred lines; some well-regarded examples are under 60 lines). If it's growing past that, split into references and link out.
- Organize reference docs by when they're needed ("read `references/deploy.md` when deploying"), not just by topic.
- Avoid restating things that are already discoverable by reading the code — the map should point, not duplicate.
- Prefer AGENTS.md as the top-level file — it's the emerging cross-tool convention (OpenAI, Google, Cursor, and other tooling read it too, not just Claude). Where a project genuinely needs Claude-Code-specific instructions on top, keep CLAUDE.md thin and pointing back at AGENTS.md rather than forking the same content into two files that will drift out of sync.

**Matters more when:** context budget is tight, the project is large, or you notice agents skimming/ignoring a bloated doc.
**Matters less when:** the project is genuinely small enough that one short file covers everything — don't invent hierarchy for its own sake.

---

## 3. Tight Feedback Loops

**What it means:** The agent should learn immediately and unambiguously whether an action worked. Fast tests, type checks, linters, a build that fails loudly and specifically. Autonomy is only safe to extend as far as feedback is fast and hard to misread.

**Concretely:**
- Fast, deterministic tests over slow or flaky ones — flaky tests actively erode trust and get ignored (by humans and agents alike).
- Errors should be specific enough to act on, not just "something failed."
- If feedback is currently slow (long CI, manual QA), that's the highest-leverage place to invest before adding more autonomy elsewhere.
- Prefer **computational** checks (tests, type checks, linters — fast, deterministic, cheap to run) over **inferential** ones (an LLM review agent or judge — slower, costlier, more nuanced, and easier for an agent to game since its output is itself a judgment call rather than a fact). Reach for an inferential check only where deterministic tooling genuinely can't tell: taste, architectural fit, prose quality. Don't spend an LLM judge on something a type checker already covers.

**Matters more when:** agents are making non-trivial changes with real risk of silent breakage, or you're trying to extend how much an agent can do unsupervised.
**Matters less when:** the task surface is narrow and low-risk (e.g., doc generation) where a bad output is cheap and obvious.

---

## 4. Enforced Architecture, Local Autonomy

**What it means:** Hard invariants (module boundaries, dependency direction, "this layer must not import that layer," public API stability) should be enforced mechanically — by lint rules, import-boundary checks, CI gates — not by hoping the agent remembers a prompt instruction. Inside those bounds, give the agent real freedom in *how* to implement.

**Concretely:**
- Tell agents what must be true (invariants), not how to get there (implementation prescriptions) — this preserves useful agent creativity while still preventing architecture drift.
- Encode the invariant as a check that fails CI, not just a sentence in a doc — docs get skimmed, checks don't.
- Distinguish "must never happen" (mechanical enforcement) from "house style" (a doc is enough).
- Concrete mechanisms to reach for: pre/post-tool-use hooks that block a disallowed action outright (e.g. writing to a protected path), import-boundary lint rules (dependency-cruiser, import-linter, and equivalents) that fail the build on a layering violation, and CODEOWNERS or branch protection on files that must not be casually edited — eval suites, CI config, migration scripts.

**Matters more when:** you've seen actual architecture drift or boundary violations from agent-authored changes.
**Matters less when:** the project is small enough that there's no meaningful boundary to violate yet.

---

## 5. Continuous Garbage Collection

**What it means:** Agents generate code, docs, and scaffolding fast — faster than most teams historically accumulated cruft. Cleanup has to be encoded as a recurring, low-effort process, not a manual chore someone eventually gets to.

**Concretely:**
- A periodic "gardening" task (agent-run or scheduled) that finds dead code, stale docs referencing removed features, or duplicated scaffolding.
- Lint rules that catch obvious cruft (unused exports, orphaned files) automatically.
- Treat harness docs themselves as subject to this — a stale AGENTS.md that contradicts the code is worse than no AGENTS.md.

**Matters more when:** agent-generated throughput is high, or you've already noticed drift between docs and reality.
**Matters less when:** the project is small and low-velocity — this can wait until it's actually a problem.

---

## 6. Plans as First-Class Artifacts

**What it means:** For anything beyond a trivial change, the plan the agent intends to execute should be written down and versioned — not left implicit in a chat transcript that vanishes at the end of the session.

**Concretely:**
- A plan file or PR description written *before* or alongside the change, reviewable independently of the diff.
- This is what makes work resumable across sessions and reviewable by another agent or human without replaying the whole conversation.
- Doesn't need heavy process — a short markdown plan committed alongside the change is often enough.

**Matters more when:** changes are multi-step, multi-session, or multiple agents/humans need to coordinate on the same work.
**Matters less when:** changes are small and single-shot — don't force process onto a one-line fix.

For the concrete mechanics of plan-then-execute across sessions (feature lists, session-start onboarding, merge-ready checkpoints), see `references/long-running-agents.md`.

---

## 7. Externalized State and Session Continuity

**What it means:** Long or multi-session agent work must survive the loss of conversational context. The filesystem and git are durable memory; use them to let a new session reconstruct where things stand.

**Concretely:**
- Progress files, handoff notes, structured "what was tried and what failed" logs — written to the repo, not just implied in chat.
- Git history itself is a form of this — clear, atomic commits let a new agent reconstruct intent from `git log`.
- For genuinely long-running tasks, checkpoint state explicitly rather than assuming the task fits in one context window.

**Matters more when:** tasks span multiple sessions, multiple agents hand off work, or a single task can exceed one context window.
**Matters less when:** work is always short, single-session, single-agent — this is solving a problem that doesn't exist yet.

See `references/long-running-agents.md` for the concrete pattern (progress files, session-start sequence, checkpointing) rather than just the principle.

---

## 8. Review That Scales

**What it means:** Human review works fine at low volume. As agent-generated throughput grows, human review becomes the bottleneck, and the review process itself needs to be re-engineered — tiered risk-based review, agent-to-agent review, or auto-merge for trivial/reversible changes.

**Concretely:**
- Classify changes by risk/reversibility; auto-merge or fast-track the low-risk tier, escalate the rest.
- Agent-to-agent review (one agent reviews another's PR against the encoded architecture/conventions) only pays off once volume is high enough that it's not just added overhead.
- "Corrections are cheap, waiting is expensive" — favor a philosophy where a bad merge is easy to revert over a philosophy where everything is gated on slow review, *if and only if* rollback is genuinely cheap in this project.
- Parallelism helps review quality, not just throughput: a fresh-context agent reviewing a diff isn't anchored to the reasoning that produced it, the way the agent that just wrote the code is. A writer/reviewer split (one agent writes, a different fresh-context agent reviews) or git worktrees for isolated parallel sessions on the same repo both exploit this — but only once there's enough volume to justify the coordination overhead.

**Matters more when:** PR/change volume from agents is genuinely high and human review is the visible bottleneck.
**Matters less when:** volume is low — added review infrastructure here is pure overhead. Also matters less/differently in domains where rollback is *not* cheap (payments, infra, anything touching production data) — don't recommend throughput-first merging there regardless of volume.

---

## 9. Constraints, Observability, and Tool Discipline

**What it means:** Three things that bound and make legible what the agent can do: constraints (permission tiers — read-only vs. financial vs. destructive — and what's simply off-limits), observability (reasoning and tool calls should be inspectable, not a black box), and context/tool economy (don't let tool outputs or tool lists flood the context window).

**Concretely:**
- A permission/risk matrix: what can the agent read, write, execute, and where — with destructive or financial actions requiring explicit escalation.
- Sandboxing as a separate layer from permissions: for anything touching secrets, production data, or the network, run in an isolated environment (container, VM, restricted filesystem/network) rather than relying solely on the agent choosing not to overreach.
- Tool call offloading: large outputs (logs, search results) get written to a file; the agent reads a summary and pulls detail on demand rather than the full output living in context.
- Subagents as context firewalls: a research-heavy or token-hungry subtask (reading a huge log, exploring an unfamiliar part of the codebase) can be delegated to a subagent that does the digging and returns a summary, so the main thread's context stays focused on decisions rather than raw exploration.
- Cache-friendly context: keep the stable parts of a prompt (system prompt, tool definitions, early context) in a consistent order and position so they hit the prompt cache instead of being invalidated by small changes earlier in the context.
- Progressive tool/skill loading: short descriptions visible upfront, full instructions loaded only when a tool/skill is actually invoked — avoids frontloading context with twenty tools' worth of instructions the task doesn't need.
- Observability: reasoning and tool calls should be inspectable after the fact — trajectory logs, decision traces, cost/token tracking per task — not just a final diff with no record of how the agent got there.

**Matters more when:** the agent has access to anything destructive, financial, or hard to reverse, or context window pressure is visibly degrading output quality.
**Matters less when:** the agent's action space is already narrow and low-risk (e.g., a read-only research tool).

---

## 10. Codebase Harnessability

**What it means:** The code itself is part of the harness, not just the docs and checks layered on top of it. A codebase's own structure determines how tractable it is for an agent to navigate, reason about, and change safely — independent of how good the surrounding docs are. Reported harness-driven differences in agent accuracy on the same task run as high as several-fold, and a meaningful share of that comes from the code, not the prompt.

**Concretely:**
- Strong typing and clear interfaces give an agent (and its tools — type checkers, IDE-style navigation) something mechanical to check itself against, instead of relying on inferring intent from usage.
- Small, well-named files and functions are easier for an agent to load, grep, and reason about within a limited context window than a handful of thousand-line files.
- Clear module boundaries and colocated tests mean an agent touching one area doesn't have to load unrelated context to understand the blast radius of a change.
- Dead code and orphaned abstractions cost an agent more than they cost a human skimming — an agent doesn't know to ignore them and may faithfully extend a pattern that was already on its way out (see pillar 5).

**Matters more when:** the codebase is large enough that navigation itself is a bottleneck, or agents are frequently touching code they haven't "seen" in the current session.
**Matters less when:** the codebase is already small and simple enough that navigation was never the problem.

A codebase that's already illegible to humans is illegible to agents too — no amount of documentation fixes that. When the diagnosis in pillar 1 keeps pointing at "the agent couldn't find/understand X," the fix is sometimes to restructure the code, not to write more about it.

---

## Evaluating the Harness Itself

Harness changes are also engineering changes — treat them with the same skepticism you'd want an agent to apply to its own claims of success. Before considering a pillar "done," have some concrete signal that it actually helped, not just that it exists:

- **Task success rate before/after** — did the specific failure mode that motivated the change actually stop recurring?
- **Correction frequency** — is a human (or reviewing agent) still catching the same class of mistake as often as before?
- **Time-to-green** — for feedback-loop changes, did the time from "agent starts" to "CI green" actually improve, or did it just move the friction somewhere else (e.g., a stricter gate that now needs manual override every time)?

This is an open problem in the field, not a solved one — there's no standard harness-quality metric yet. Don't let that be an excuse to skip measurement entirely; a rough before/after read on the failure mode you targeted is enough to tell cargo cult from a real fix. If a change can't point to any evidence it helped after reasonable use, that's a signal for pillar 5 (garbage collection), not a reason to add more on top of it.
