# Loop Conventions

Read every tick together with the active ledger. The global rules in `~/.claude/LOOP_SPEC.md` and `~/.claude/LOOP_STANDARD.md` win on conflict.

"The reference" below means the product the human asked to match (MecAgent). Our product never carries its name.

## Invariants

- I1 No fake completion. Tick a task only when its Evidence command exited 0 this tick and the output is quoted in the Journal. Code that looks right is not evidence.
- I2 The maker does not grade itself. Independent-check tasks run as a council of fresh agents that did not build the work (Council protocol below); a finding counts only as a reproducible failing test or a corrected row.
- I3 No kernel evidence, no geometry claim. A part, feature or export exists only when the adapter's own inspection confirms it: valid solid, volume and bounding box within the task's tolerance, and for exports a re-import that matches. Model text, a log line or a viewport render is not evidence (`docs/roadmap/MECAGENT_ROADMAP.md#Never report successful geometry creation unless the actual CAD application confirms it.`, `docs/roadmap/MECAGENT_ROADMAP.md#A browser 3D preview must never be presented as proof that a native CAD model has been created.`).
- I4 A gate may grow and never shrinks in the change that claims it green. `node scripts/gate-guard.mjs` runs inside the gate. Removing or weakening an assertion, a tolerance, or an eval case is an escalation that names it and why it no longer grades anything real.
- I5 Cite what you claim. Every statement about current code in a doc or ledger cites `path#literal` copied from a file read this tick, or a whole `path`. Never write a citation you did not just read. Mark files a task will create with ` (new)`. Files of the reference install live outside the repo: name them in plain text, never in a code span, because graph-lint checks every path-shaped code span.
- I6 Typed operations only. The model proposes operations; the schema validates them; the executor runs them through an adapter. No path evaluates model-written code, and macros are stored operation sequences, not scripts (`docs/roadmap/MECAGENT_ROADMAP.md#The LLM must never directly execute arbitrary CAD code.`).
- I7 Clean room. Raw investigation output (REA results, captures, screenshots of the reference UI, strings, any extracted or decompiled content) lives only in `.rea/`, which git ignores. Research docs describe behavior in our own words. Build loops (L3 and later) read `docs/cad-agent/research/`, never `.rea/`. No reference name, logo, icon, copy, prompt text or asset enters the product (`docs/roadmap/MECAGENT_ROADMAP.md#Do not copy proprietary source code, branding, private assets, or confidential information.`). `scripts/clean-room-lint.mjs` enforces the file rules in the gate; distinctive strings seen in the reference (prompt text, copy) go in `.rea/fingerprints.txt`, one per line, at least 12 characters, and may appear nowhere in the repo; distinctive reference identifiers (IPC channels, type, route and message names) go in `.rea/identifiers.txt`, at least 8 characters, and may appear in research docs but never in product code. Never list generic words or the product name in either file.
- I8 No bypass. Never defeat authentication, licensing, code signing, Electron fuses or anti-tamper, never intercept the reference's server traffic, and stay inside the scope the human set in L1 T0 (`docs/roadmap/MECAGENT_ROADMAP.md#Do not bypass application protections, authentication or access restrictions.`).
- I9 No new dependency, service or infrastructure without a failing test that needs it and the human's approval. The L2 T1 stack decision approves the packages it lists.
- I10 Secrets (model API keys, the reference account) never enter the repo, logs, reports or a bundle.
- I11 Status words. Journal: passed, failed, blocked, skipped, not tested. Research evidence: CONFIRMED, INFERRED, UNKNOWN. Capability: PRODUCTION READY, PARTIALLY IMPLEMENTED, MOCKED, UNTESTED, UNSUPPORTED (`docs/roadmap/MECAGENT_ROADMAP.md#Classify every feature as:`).
- I12 Honest limits. An adapter that lacks an operation returns a typed unsupported result; the UI never shows a success the record does not hold; a missing dimension is asked for, never guessed (`docs/roadmap/MECAGENT_ROADMAP.md#Do not infer missing engineering dimensions or tolerances without communicating uncertainty.`).
- I13 Smallest safe change: improve code in place, no rewrites, one task per tick.

## Gate

`npm run gate` runs graph-lint, clean-room-lint and gate-guard, in that order. It grows as the stack lands: L2 T3 adds typecheck, unit tests and pytest; L4 T2 adds the Playwright suite. Every tick needs it green.

If the rtk hook mangles `npm` output, run the same command through `rtk proxy` and quote the raw output. Never `cd` before the gate. After a browser or Electron check, stop only the processes that tick started.

## Product codebase

Product code lives in `cad-AI/`: the human's own app (React 19, TypeScript, Vite, an Express server, Gemini) in a separate git repo, remote origin github.com/houssem98/cad-AI, which this repo gitignores. Build loops (L2 T3 onward) change it in place, per I13, and never start a second codebase. The starting list of missing parts is `docs/cad-agent/CAD_AI_TRUTH_AUDIT.md`. A part leaves that list only when kernel or test evidence is quoted in a Journal, never because a cad-AI document says it is done. Commits to cad-AI follow the Commits rules below, made inside `cad-AI/` with its own git; pushing to its remote is an escalation. I7 applies to cad-AI product code from L2 T3, when the gate grows to cover it.

## Commits

After a task is ticked, stage only the files that task changed, commit locally with the message `loop(L<n>/T<n>): <what changed>`, and put the short hash in the Journal entry. Never push, never amend, never rebase. Adding a remote is an escalation.

## Recovery

Each tick starts from disk: the ledger and git. Write `started T<n>` in the Journal before changing anything. If a tick finds a `started` line with no result and the working tree has changes, finish or revert only the files that task touched, then continue. Any other uncommitted change the loop did not write is an escalation.

## Stop, checked every tick

- Target: the active loop's signoff task is ticked and the gate passed this tick. The program's target is L8 ticked.
- Budget: the active loop's budget in `docs/LOOP_GRAPH.md`.
- Stall: 3 consecutive ticks with no verdict change and no new failure mode; the same gate failing twice without new evidence; a test weakened to get a pass; a dependency the repo cannot provide. Stall is neither failure nor done. Stop, write the Journal entry, escalate, and do not schedule another tick.

## Escalate: halt and ask, do not decide

- push, deploy, publish, sign, or any call to an external service, except read-only GETs of the reference's public website and user guide, and model API calls inside the L2 T1 spend cap
- any file entering the repo that the loop did not write and has not read
- installing software: CAD packages, SDKs, runtimes, or any package L2 T1 did not approve
- credentials: `.env*`, any token or key, the reference account
- spend above the active loop's cap
- anything in I7 or I8, or any investigation step outside the L1 T0 scope
- running the reference app on anything but non-confidential sample files
- deleting a feature, a screen, an eval case or a test
- removing or weakening an assertion, a tolerance or a deciding rule
- anything unverifiable this tick

## Cadence

120 seconds between ticks, because the next tick is the agent's own work. Not for polling.

## Drift

The prompt restates the goal every tick and each Journal entry ends with a Direction line. It is drift when ticks polish the UI while a geometry or verification task waits, when a tolerance loosens to turn a test green, when a feature appears because the reference has it but no ledger task names it, or when research prose starts paraphrasing reference internals instead of observed behavior.

## Judged steps

Prefer checks with exit codes: geometry is measured, not judged. Where a model must judge (independent checks), state the judge models and n; the Council protocol satisfies this with two members and a chairman. Eval holdouts are read only by their runner script; the maker never opens a holdout case while tuning. Each deciding rule is written in its ledger before the task that tunes against it starts, and never edited after.

## Council protocol

1. Members. Two fresh read-only agents on Opus 5.5, each with the identical prompt: the task's scope, the attack list below, and the instruction to report only disagreements, each with a `path:line` and a verbatim code quote. Independence comes from a fresh context that did not build the work; the human chose one model over several on 2026-11-11 to save tokens, accepting less model diversity. Fable is not used, no credit.
2. Chairman. One more fresh agent on Opus 5.5 merges both reports into one deduplicated list ordered by severity, with each item's agreement count (1/2 or 2/2); it opens the cited code to settle an item the two reports disagree on, and marks it confirmed or refuted with a quote.
3. Maker. Reproduces each item before acting: a failing test or a corrected row, or a rejection with its reason in the Journal.

The Journal records member and chairman models, item counts after each stage, and every rejected item with its reason. A council costs about three agent runs against the loop's budget.

## Reporting

A failed gate is a real result. If a capability cannot be made real at reasonable cost, mark it UNSUPPORTED and say so. If every remaining task is blocked, say the work is finished for now and recommend stopping.

## Writing journal entries

`- YYYY-MM-DD · L<n>/T<n> · <passed|failed|blocked|skipped|not tested> · gate <green | red: what> · commit <hash | none> · <what happened, one line> · Direction: <is the goal still the goal?> · Next: <task>`

## Attack list for independent checks

- geometry: success reported with no kernel inspection; a tolerance looser than the task states; volume or bounding box not compared; an export never re-imported; an invalid solid accepted
- operations: an operation run without schema validation; model-written code executed; a consequential operation (delete, overwrite) run without approval; a timeout not enforced; a cancelled operation leaving the document changed and unrecorded
- records: an operation with no execution record; a record missing a field from `docs/roadmap/MECAGENT_ROADMAP.md#Every CAD operation must produce an execution record containing:`; an error swallowed
- specs: a missing dimension filled by a guess; mm and inch confused; an ambiguous request built instead of questioned
- evals: a holdout case read while tuning; a deciding rule edited after data; one run reported as a stable result
- adapters: an unsupported operation returning success; a capability manifest that claims more than the contract tests prove
- jobs: a job lost on restart; a duplicate submission run twice; COMPLETED with no verified artifact; cancel ignored
- states: loading, empty, error, running, completed and cancelled not distinct; a preview presented as proof
- clean room: a reference name, string, asset or prompt in the product; a research claim marked CONFIRMED with no source; invented internals presented as observed
- AI: a knowledge document carrying instructions that trigger a tool call; an API key in a log or bundle; a user file sent to an external service without consent
