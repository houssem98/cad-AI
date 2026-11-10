# L2 Architecture

Phase 2 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Target architecture". Needs L1. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Do not begin implementation until all design decisions are documented and their dependencies are understood.`

Deciding rule, fixed before T2 starts: T0 to T4 are ticked, `npm run gate` exits 0 with typecheck and tests inside it, and the human's signoff line (T5) is in the Journal.

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint, re-read the L1 research docs and `docs/cad-agent/CAD_AI_TRUTH_AUDIT.md`, and re-check the audit against cad-AI's current commit. Evidence: graph-lint exits 0.
- [x] T1 (human) Stack. needs: T0. Decide, and so approve the listed dependencies (I9). The product is cad-AI (`docs/LOOP_CONVENTIONS.md#Product codebase`), so the default is its existing stack, per I13. (1) App: recommended keep cad-AI's React 19, TypeScript, Vite and Express server (`cad-AI/package.json#"express": "^4.21.2"`); live CAD access comes later through a local companion process (L9). (2) First kernel: recommended build123d on OpenCascade in a Python 3.12 worker that the Express server calls, free, headless and STEP-native, so geometry tests run inside the gate; the SolidWorks adapter follows in L9. Alternative: opencascade.js in Node, one language but a large WebAssembly build. (3) Model: recommended keep Gemini (`cad-AI/package.json#"@google/genai": "^3.0.0"`), key in an environment variable; alternative the Claude API. (4) Store: SQLite file. (5) Tests: Vitest, Playwright, pytest. (6) Model API spend cap per loop for evals. Evidence: the decision lines in the Journal.
- [x] T2 Architecture docs. needs: T1. Write under docs/cad-agent/architecture: `docs/cad-agent/architecture/SYSTEM_ARCHITECTURE.md` (new), `docs/cad-agent/architecture/AGENT_ORCHESTRATION.md` (new), `docs/cad-agent/architecture/CAD_ADAPTERS.md` (new), `docs/cad-agent/architecture/DATABASE_DESIGN.md` (new), `docs/cad-agent/architecture/API_CONTRACTS.md` (new), `docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md` (new). Each subsystem: responsibility, interface, data contract, errors, tests; plus the agent state machine, job lifecycle and execution lifecycle. Each design choice cites the research row it answers. Evidence: graph-lint and clean-room-lint exit 0.
- [ ] T3 Operation protocol. needs: T2. In cad-AI, turn the typed IR in `cad-AI/src/services/cad/cadOperationIR.ts` into one operation schema shared by TypeScript and Python (JSON Schema as the single source) carrying `docs/roadmap/MECAGENT_ROADMAP.md#Every CAD action must have:`. Extend `npm run gate` to run cad-AI's typecheck, unit tests and pytest, and clean-room-lint over cad-AI's tracked files. Evidence: tests: a valid operation passes; a missing target, an unknown type, a missing unit and an extra field are each refused; `npm run gate` exits 0.
- [ ] T4 Independent check. needs: T3. A council on the architecture docs and the schema with the operations, records and adapters items of the attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T5 (human) Signoff. needs: T4. Evidence: the signoff line in the Journal.

## Journal
- 2026-11-10 · L2/T0 · started T0
- 2026-11-10 · L2/T0 · passed · gate green · commit loop(L2/T0) (this entry's own commit) · cad-AI HEAD is f46cc70, the commit `docs/cad-agent/CAD_AI_TRUTH_AUDIT.md` was read at, and its working tree is clean (0 changed files), so the audit's findings still describe the code; graph-lint resolves every literal citation into cad-AI and the research docs. The L1 research docs were re-read at T11 and signed off at T12 this session; their T11 corrections (18 parity lines now "our design", hop totals 11/35/29) carry into T2 · Direction: still the goal; design starts from the corrected research · Next: T1 Stack (human)

  ```
  cad-AI HEAD f46cc70 · audit read at f46cc70 · cad-AI dirty lines=0
  graph-lint: 24 docs · 170 citations (69 file, 1 line range, 90 literal, 10 planned)
  graph-lint: clean
  graph-lint exit=0
  ```
- 2026-11-10 · L2/T1 · passed · gate green · commit loop(L2/T1) (this entry's own commit) · human stack decision in chat ("go for slie and start the loop", after choosing DeepSeek and comparing SQLite with Supabase on Docker), which approves these dependencies under I9: (1) app: keep cad-AI's React 19, TypeScript, Vite and Express; (2) first kernel: build123d on OpenCascade in a Python 3.12 worker called by the Express server; (3) model: DeepSeek, which the human always uses, called through its OpenAI-compatible HTTP API with plain fetch (no new SDK), key in the DEEPSEEK_API_KEY environment variable, behind one model-client module; this replaces the recommended Gemini, so the existing Gemini client is swapped out in the task that builds the model client; (4) store: one SQLite file behind one storage module, chosen over Supabase on Docker because about 1.4 GB of RAM is free and the gate must not depend on running containers; Supabase stays the upgrade path when cloud or several users are needed; (5) tests: Vitest, Playwright, pytest; (6) model API spend cap for evals: $10 per loop · Direction: still the goal; the stack is fixed, so T2 can design against it · Next: T2 Architecture docs
- 2026-11-10 · L2/T2 · started T2 (written in the same tick as the result: the started line was not written before the docs, a recovery-rule slip; no other file was touched)
- 2026-11-10 · L2/T2 · passed · gate green · commit loop(L2/T2) (this entry's own commit) · wrote six docs under docs/cad-agent/architecture: `docs/cad-agent/architecture/SYSTEM_ARCHITECTURE.md` (stack, processes: UI, Express server, Python kernel worker over stdio JSON lines, L9 .NET sidecar on the same protocol; cross-cutting rules; typed error list), `docs/cad-agent/architecture/API_CONTRACTS.md` (operation envelope with every roadmap action field and no extra fields, worker wire protocol, our own HTTP and SSE routes, the DeepSeek model client with the $10 cap), `docs/cad-agent/architecture/AGENT_ORCHESTRATION.md` (agent state machine with ASK, AWAIT_APPROVAL and at most two replans; job lifecycle with heartbeat, idempotency and restart rules), `docs/cad-agent/architecture/CAD_ADAPTERS.md` (adapter interface, capability manifest, kernel, SolidWorks and test-double adapters), `docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md` (execution lifecycle, record fields, verification tolerances) and `docs/cad-agent/architecture/DATABASE_DESIGN.md` (SQLite tables, WAL, migrations). Each design cites the matrix rows and parity claims it answers and the downstream task that tests it. clean-room-lint was re-run after staging, because it scans tracked files only; the "mecagent" hits are the roadmap's file name in citations · Direction: still the goal; the docs fix every interface L3 to L7 build against · Next: T3 Operation protocol

  ```
  graph-lint: 30 docs · 205 citations (91 file, 1 line range, 103 literal, 10 planned)
  graph-lint: clean
  graph-lint exit=0
  clean-room-lint: 36 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  clean-room-lint exit=0
  ```
