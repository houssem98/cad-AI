# L2 Architecture

Phase 2 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Target architecture". Needs L1. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Do not begin implementation until all design decisions are documented and their dependencies are understood.`

Deciding rule, fixed before T2 starts: T0 to T4 are ticked, `npm run gate` exits 0 with typecheck and tests inside it, and the human's signoff line (T5) is in the Journal.

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint, re-read the L1 research docs and `docs/cad-agent/CAD_AI_TRUTH_AUDIT.md`, and re-check the audit against cad-AI's current commit. Evidence: graph-lint exits 0.
- [x] T1 (human) Stack. needs: T0. Decide, and so approve the listed dependencies (I9). The product is cad-AI (`docs/LOOP_CONVENTIONS.md#Product codebase`), so the default is its existing stack, per I13. (1) App: recommended keep cad-AI's React 19, TypeScript, Vite and Express server (`cad-AI/package.json#"express": "^4.21.2"`); live CAD access comes later through a local companion process (L9). (2) First kernel: recommended build123d on OpenCascade in a Python 3.12 worker that the Express server calls, free, headless and STEP-native, so geometry tests run inside the gate; the SolidWorks adapter follows in L9. Alternative: opencascade.js in Node, one language but a large WebAssembly build. (3) Model: recommended keep Gemini (`cad-AI/package.json#"@google/genai": "^3.0.0"`), key in an environment variable; alternative the Claude API. (4) Store: SQLite file. (5) Tests: Vitest, Playwright, pytest. (6) Model API spend cap per loop for evals. Evidence: the decision lines in the Journal.
- [x] T2 Architecture docs. needs: T1. Write under docs/cad-agent/architecture: `docs/cad-agent/architecture/SYSTEM_ARCHITECTURE.md` (new), `docs/cad-agent/architecture/AGENT_ORCHESTRATION.md` (new), `docs/cad-agent/architecture/CAD_ADAPTERS.md` (new), `docs/cad-agent/architecture/DATABASE_DESIGN.md` (new), `docs/cad-agent/architecture/API_CONTRACTS.md` (new), `docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md` (new). Each subsystem: responsibility, interface, data contract, errors, tests; plus the agent state machine, job lifecycle and execution lifecycle. Each design choice cites the research row it answers. Evidence: graph-lint and clean-room-lint exit 0.
- [x] T3 Operation protocol. needs: T2. In cad-AI, turn the typed IR in `cad-AI/src/services/cad/cadOperationIR.ts` into one operation schema shared by TypeScript and Python (JSON Schema as the single source) carrying `docs/roadmap/MECAGENT_ROADMAP.md#Every CAD action must have:`. Extend `npm run gate` to run cad-AI's typecheck, unit tests and pytest, and clean-room-lint over cad-AI's tracked files. Evidence: tests: a valid operation passes; a missing target, an unknown type, a missing unit and an extra field are each refused; `npm run gate` exits 0.
- [x] T4 Independent check. needs: T3. A council on the architecture docs and the schema with the operations, records and adapters items of the attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [x] T5 (human) Signoff. needs: T4. Evidence: the signoff line in the Journal.

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
- 2026-11-10 · L2/T3 · started T3 (no new dependency beyond the T1-approved list: the validator reads the JSON Schema file with our own code; the human did not answer the ajv question)
- 2026-11-10 · L2/T3 · blocked · gate red: clean-room-lint, 2 cad-AI files · commit loop(L2/T3) blocked (this entry's own commit; the T3 work stays uncommitted in both trees for the next tick to finish) · built, uncommitted: one JSON Schema as single source (cad-AI/schema/cad-operation.schema.json (new)) with every roadmap action field, units on every length and no extra fields; dependency-free validators reading that file in TypeScript (cad-AI/src/services/cad/operationSchema.ts (new)) and Python (cad-AI/worker/operation_schema.py (new)); one shared case file both suites run (cad-AI/schema/operation-cases.json (new)): Vitest 5 passed, pytest 5 passed. cad-AI deps installed with --legacy-peer-deps (its own esbuild and @tailwindcss/vite peer conflict; tsc then exits 0), Vitest added as T1 approved, a package-lock.json created, resolveJsonModule set in its tsconfig. The gate grew: cad-AI typecheck, Vitest and pytest, and clean-room-lint now also scans cad-AI's tracked files, with cad-AI/docs and cad-AI root .md files treated as docs like the root repo's. That scan found 2 files cad-AI serves to users that name the reference product: cad-AI/public/assets/aistudio/roadmap2_91174d5c.md and cad-AI/public/assets/aistudio/roamdap_mecaiagent_a1c37327.md. The loop did not write them, so moving or deleting them is the human's decision (escalation). Tests were written with the code, not before it · Direction: still the goal; the operation protocol works in both languages, and the gate now guards the product · Next: human decides on the 2 files (recommended: move both to cad-AI/docs/roadmap/, out of the served folder), then T3 finishes

  ```
  PASS (5) FAIL (0)
  Pytest: 5 passed
  clean-room-lint: 103 tracked files · 0 fingerprints · 241 identifiers
     ✗ cad-AI/public/assets/aistudio/roadmap2_91174d5c.md: product code names the reference product
     ✗ cad-AI/public/assets/aistudio/roamdap_mecaiagent_a1c37327.md: product code names the reference product
  gate exit=1
  ```
- 2026-11-10 · L2/T3 · passed · gate green · commit loop(L2/T3) (this entry's own commit; cad-AI commit 9cd9803) · human decision in chat: "move them". The two served files were moved with git mv from cad-AI/public/assets/aistudio/ to cad-AI/docs/roadmap/ (no reference to either in cad-AI), so they no longer ship and nothing was deleted. The T3 work from the blocked entry was then committed in cad-AI: the schema, both validators, the shared case file, both test files, the test script, Vitest, the package lock, resolveJsonModule, and __pycache__/ in cad-AI's .gitignore. Here: the gate now also runs cad-AI typecheck, Vitest and pytest, and clean-room-lint scans cad-AI's tracked files (110 files now, 36 before) · Direction: still the goal; the protocol is real code under the gate · Next: T4 Independent check (council)

  ```
  graph-lint: 30 docs · 199 citations (91 file, 1 line range, 103 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 110 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
   Test Files  1 passed (1)
        Tests  5 passed (5)
  5 passed in 0.04s
  gate exit=0
  ```
- 2026-11-10 · L2/T4 · started T4 (council: maker Opus; members Sonnet, Haiku, Haiku; chairman Sonnet; the human's L1 T11 composition, reused because the human asked the loop to run automatically)
- 2026-11-10 · L2/T4 · passed · gate green · commit loop(L2/T4) (this entry's own commit; cad-AI commit f3cf756) · the first council launch broke the protocol (three different prompts, and one member on Opus once the maker had switched to Opus), so it was stopped and none of its reports were used; the valid run gave one identical prompt to members Sonnet, Sonnet and Haiku (the Conventions' composition for an Opus maker, which the started line above misstated) with chairman Sonnet. The human waived the peer-review stage for this task in chat ("goto chariman now"), so the chairman re-checked every item against the code itself. Counts: 54 raw items (19, 19, 16), 22 merged, 21 confirmed, 1 unsure, 5 sub-claims refuted. Every item below was reproduced, as a failing test then a fix in cad-AI or as a corrected doc row, or its sub-claim was rejected with a reason. The tests were written first and failed for the reasons given (12 Vitest cases red, pytest could not import the proposal check) before the fix. About 7 agent runs used (3 discarded, 3 members, 1 chairman) · Direction: still the goal; the protocol now refuses forged results and bad dimensions, and the design states restore, write-ahead records and one deadline before any kernel code exists · Next: T5 Signoff (human); also waiting on the human: the uncommitted .serena/ line in .gitignore, which the loop did not write

  Chairman's list (severity, agreement, how reproduced; "test" names a case in the shared case file, "row" a corrected doc row):
  1. High 3/3. TS validator treats inherited key names as schema properties. Test: "extra field named like a built-in key is refused", "built-in key name inside params is refused"; fix: own-key lookups.
  2. High 3/3. Cancel, timeout or failed verification leaves the document changed. Row: EXECUTION_AND_VERIFICATION step 7 Restore from the checkpoint, exits from inspecting; API_CONTRACTS cancel message only for queued operations.
  3. High 3/3. Record written only after the run; a storage failure kept in memory as kernel_error. Row: step 8 write-ahead, storage_error, fail closed, restore on server start; DATABASE_DESIGN Errors.
  4. High 3/3. Refused proposals and model errors have no record. Row: the operations table stores every proposal and each refusal gets a record; requests.error_json.
  5. High 3/3. Approval keyed on types that do not exist; auto-accept undefined. Row: step 3, consequential means it changes or removes earlier work (modify_dimension today); chats.auto_accept; approval decision in the record.
  6. Medium 3/3. Timeout covers Run only. Row: one deadline over run, inspect and verify; 30 s, 120 s for import and export.
  7. Medium 2/3. Job heartbeat checked only at start; no maximum duration. Row: watchdog every 5 s, 10 min maximum, no automatic retry.
  8. Medium 3/3. Executor-owned fields accepted on input; result, verification and error untyped. Test: "proposal claiming success is refused", "proposal carrying verification is refused", "unknown error code is refused", "verification without its fields is refused", "complete verification passes"; fix: proposal check, typed verification and error. Unsure sub-claim (the worker's result line carries status) kept as a row: the worker reports, the executor writes.
  9. Medium 3/3. Refuse-on-changed-document not enforced. Test: "precondition without a value is refused"; row: the executor adds its own revision check and re-checks before Run.
  10. Medium 3/3. Revision before and after cannot be stored. Row: records.document_id, revision_before, revision_after. Unsure sub-claim rejected: "actual CAD command" is the call our side sends with parameters in mm; engine internals go in the engine message.
  11. Medium 3/3. Manifest claims more than the tests prove. Row: example exports STEP only, no units entry, supported only with a passing contract case.
  12. Medium 3/3. Unsupported path underspecified. Row: a missing entry, document kind or export is unsupported; the adapter also returns it; the contract suite calls adapters directly.
  13. Medium 2/3. Engine output lost on a worker crash. Row: stdout carries protocol only; the stderr tail is kept on worker_crashed.
  14. Medium 2/3. A stock JSON Schema validator skips params. Row: API_CONTRACTS, only our two validators gate operations; the sidecar receives validated envelopes.
  15. Low 3/3. Python raises on a type that is not a string. Test: "type that is a list is refused"; fix: string check before the lookup.
  16. Low 3/3. The error lists disagree. Row: one list of 11 codes in SYSTEM_ARCHITECTURE, the others point to it, the schema's code enum matches.
  17. Low 2/3. Lifecycle states missing from the status enum. Test: "awaiting approval is a status"; row: the diagram uses enum values only.
  18. Low 2/3. Zero, negative and infinite lengths pass. Test: "zero length is refused", "negative length is refused", "infinite length is refused", "negative coordinate is allowed", and a pytest-only NaN case; fix: exclusiveMinimum and a finite check.
  19. Low 2/3. id is not checked as a uuid. Row: the server assigns the uuid. Unsure sub-claim rejected: approval cannot be reused through a repeated id, because ids are server-assigned primary keys.
  20. Low 2/3, unsure. Free-form string parameters. Row: string parameters are resolved by lookup, never parsed or evaluated; an unknown identifier is precondition_failed.
  21. Low 1/3. Jobs have no approval state. Row: jobs use the same executor; a consequential operation fails the job with approval_denied unless auto-accept covers it.
  22. Low 1/3. The envelope rule conflicts with the session methods. Row: CAD_ADAPTERS limits the rule to operation methods. Unsure sub-claim rejected: OBSERVE reads the last inspect record, not the adapter.
  Refuted by the chairman and not acted on: verification field missing (it exists, unstructured, now typed by item 8); the design permits running model code (AGENT_ORCHESTRATION forbids it); the manifest example lists every operation supported (it elides them); kernel, timeout and cancel exits unrecorded (the intent was stated; item 4 covers the real gap); a forged success framed as an adapter result (it is item 8).

  ```
  before fix: Failed Tests 12 · AssertionError: expected [] to include '/constructor'
  after fix:  Tests  20 passed (20) · 21 passed in 0.09s · tsc --noEmit clean
  raw JSON probe: TS ["/__proto__"] ["/type"] ["/preconditions/0/valueOf"] · PY ["/__proto__"] ["/type"] ["/preconditions/0/valueOf"]
  graph-lint: 30 docs · 203 citations (96 file, 1 line range, 102 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 110 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
  gate exit=0
  ```
- 2026-11-10 · L2/T5 · passed · gate green · commit loop(L2/T5) (this entry's own commit) · human signoff in chat, after the T4 result and the L3 to L9 outlook were reported: "signoff line and  tick the L2 line ans cotinue the loop to L3". The deciding rule holds: T0 to T4 are ticked, `npm run gate` exits 0 with cad-AI typecheck, Vitest and pytest inside it, and this signoff line is in the Journal. On the human's instruction the loop ticked the L2 line in `docs/LOOP_GRAPH.md`. Budget: 11 of 12 entries · Direction: still the goal; the design is fixed and the protocol is under the gate, so geometry work starts · Next: L3 T0 Re-verify
