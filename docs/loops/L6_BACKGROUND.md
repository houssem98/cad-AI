# L6 Background

Phase 6 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Background CAD task engine". Needs L5. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Every completed task must have a verified output artifact.`

Deciding rule, fixed before T1 starts: T0 to T5 are ticked, `npm run gate` exits 0, and the human's signoff line (T6) is in the Journal.

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint. Evidence: graph-lint exits 0.
- [ ] T1 Job engine. needs: T0. States from `docs/roadmap/MECAGENT_ROADMAP.md#Define job states:` persisted in SQLite; workers in a separate process; the routes are `docs/cad-agent/architecture/API_CONTRACTS.md#| POST /api/jobs |` and its rows, and the store is the L3 SQLite store (`cad-AI/src/services/cad/cadStore.ts`). Evidence: tests: a worker killed mid-job leaves the job FAILED or resumed, never stuck RUNNING; a hung worker under a live server is FAILED within 15 s; a job past its maximum duration ends with `timeout` (`docs/cad-agent/architecture/AGENT_ORCHESTRATION.md`); a duplicate submission with the same idempotency key runs once; cancel reaches CANCELLED and stops the worker; a reconnecting client sees the same status.
- [ ] T2 Text-to-CAD job. needs: T1. The L5 agent (`cad-AI/src/services/agent/text2cad.ts`) as a job; COMPLETED only with a verified STEP, its records, and a report that is not incomplete (L5 T8 found a part built without four requested holes). Evidence: test: a job whose artifact fails verification ends FAILED.
- [ ] T3 STEP-to-CAD. needs: T1. Import a STEP file through the kernel's import operation (`cad-AI/worker/adapter_kernel.py#import_document = create_part`), inspect it, rebuild prismatic parts (planar faces, cylindrical holes) as an editable feature sequence; anything else is reported UNSUPPORTED. Evidence: evals/step2cad/ with at least 10 fixtures: rebuilt volume within 0.1 % and the same bounding box; a freeform fixture returns unsupported.
- [ ] T4 Tasks dashboard. needs: T1. List, progress, cancel, download. Evidence: e2e: submit, watch progress, cancel one, download another.
- [ ] T5 Independent check. needs: T2, T3, T4. A council with the jobs and geometry items of the attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T6 (human) Signoff. needs: T5. Evidence: the signoff line in the Journal.

## Journal
- 2026-11-12 · L6/T0 · started T0 (L5 closed by the human, so L6 is the active loop by driver rule 1)
- 2026-11-12 · L6/T0 · passed · gate green · commit loop(L6/T0) (this entry's own commit), cad-AI 8663a69 · Evidence: "graph-lint: 30 docs · 201 citations (108 file, 0 line range, 90 literal, 3 planned)", "graph-lint: clean". Three task lines were made precise against what L5 left, adding one check and removing none. T1 names the job routes in API_CONTRACTS §3 and the L3 store. T2 names the agent (`cad-AI/src/services/agent/text2cad.ts`) and adds one check: a job is COMPLETED only if the agent's report is not incomplete, the gap L5 T8 found. T3 names the kernel's import operation. The first gate failed only on memory: 6 kernel tests, with "MemoryError" and "worker_crashed" at 1.34 GB RAM free, while the human's Chrome and cad-AI server were running. The fix is in how tests run, not what they check: cad-AI's `npm test` is now `vitest run --maxWorkers=2`, so at most two test files start kernel workers at once. Same tests, same assertions. Gate after it: "graph-lint: clean", "clean-room-lint: clean", "gate-guard: clean · HEAD..working tree", vitest "Tests  69 passed (69)", pytest "55 passed in 21.39s", self-check 25 of 25 and 15 of 15, Playwright "32 passed (2.3m)" · Direction: still the goal; every completed job must have a verified artifact · Next: T1 Job engine
