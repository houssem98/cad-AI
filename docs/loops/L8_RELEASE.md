# L8 Release

Phase 8 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Production readiness". Needs L6 and L7. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Do not declare the product production-ready merely because the frontend and API tests pass.`

Deciding rule, fixed before T1 starts: T0 to T5 and T7 are ticked (T7 added 2026-11-12 by the human, before T1 started), `npm run gate` exits 0, and the human's signoff line (T6) is in the Journal.

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint. Evidence: graph-lint exits 0.
- [x] T1 Readiness report. needs: T0. Write `docs/cad-agent/reports/PRODUCTION_READINESS.md` (new): one row per feature-matrix module with a capability word (I11) and the test name that backs it; no test means UNTESTED. Evidence: graph-lint exits 0, and a test fails when a matrix module has no row.
- [ ] T2 Parity. needs: T0. Every claim in `docs/cad-agent/research/PARITY_SPEC.md` (new) gets, in its readiness row, either a passing test name or UNSUPPORTED with the reason. Where REA holds comparable evidence for both products, run verify_reconstruction on that claim and quote the verdict. Evidence: a test fails when a parity claim has neither a test name nor UNSUPPORTED.
- [ ] T3 Security. needs: T0. API keys in the OS credential store, never in logs or the bundle; permission levels per tool; an audit trail of every operation; structured logs; rate and resource limits. Evidence: tests: a bundle scan finds no key pattern; an operation without permission is refused and logged.
- [ ] T4 Packaging. needs: T0. A local installer build. Signing and publishing are the human's (Escalate). Evidence: the build exits 0 and an e2e smoke test launches the installed app.
- [ ] T5 Independent check. needs: T1, T2, T3, T4. A council over the whole attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T6 (human) Signoff. needs: T5, T7. Evidence: the signoff line in the Journal.
- [ ] T7 Light theme. needs: T0. Added 2026-11-12 by the human, deferred from L4: a light theme that mirrors Graphite (L4 T1), with a toggle. Evidence: `cad-AI/e2e/palette.e2e.ts` passes with the light theme on, and the choice survives a reload.

## Journal
- 2026-11-14 · L8/T0 · started T0. L6 and L7 are ticked, so L8 is the active loop (driver rule 1).
- 2026-11-14 · L8/T0 · passed · gate green · commit see git log · graph-lint: "graph-lint: 30 docs · 208 citations (108 file, 0 line range, 98 literal, 2 planned)", "graph-lint: clean", exit=0. Gate: "graph-lint: clean", "clean-room-lint: clean", "gate-guard: clean · HEAD..working tree", "Tests  139 passed (139)", "88 passed in 22.08s", "holdout: 15 of 15 cases build their reference, pass every check, and catch every planted fault", "step2cad: 16 of 16 cases pass (13 to rebuild, 3 unsupported)", "drawing2cad self-check: 49 of 49 cases as expected, 200 of 200 planted faults caught", "holdout-retired-1 (seen, counts only): 12 of 12 cases as expected, 44 of 44 planted faults caught", "holdout-retired-2 (seen, counts only): 14 of 14 cases as expected, 50 of 50 planted faults caught", "47 passed (3.2m)", exit=0 · Direction: goal unchanged; L8 must not call the product ready on passing tests alone (its target) · Next: T1 Readiness report
- 2026-11-14 · L8/T1 · started T1.
- 2026-11-14 · L8/T1 · passed · gate green · commit see git log · `docs/cad-agent/reports/PRODUCTION_READINESS.md` has one row per matrix module: 13 PARTIALLY IMPLEMENTED, 2 UNSUPPORTED (Macro generation, Model selection), none PRODUCTION READY. `scripts/readiness-lint.mjs` joins the gate; before reading the report it drops the first module's row and must report "no row for module", else it fails. graph-lint: "graph-lint: 31 docs · 246 citations (111 file, 0 line range, 133 literal, 2 planned)", "graph-lint: clean". Gate: "readiness-lint: 15 matrix modules, 15 with a row, 0 problem(s)", "clean-room-lint: clean", "gate-guard: clean · HEAD..working tree", "Tests  139 passed (139)", "88 passed in 22.20s", "holdout: 15 of 15 cases build their reference, pass every check, and catch every planted fault", "step2cad: 16 of 16 cases pass (13 to rebuild, 3 unsupported)", "drawing2cad self-check: 49 of 49 cases as expected, 200 of 200 planted faults caught", "47 passed (2.6m)", exit=0. Two earlier gate runs overlapped and failed on memory, not on T1: one with "MemoryError" in the worker's build123d import (2 of 139 vitest), the other with "viewport renders each of the six states distinctly" not rendering in 5000ms (1 of 47 e2e); the rerun alone passed both · Direction: goal unchanged; the report calls nothing ready, so the target holds · Next: T2 Parity
