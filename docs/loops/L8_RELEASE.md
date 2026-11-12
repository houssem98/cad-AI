# L8 Release

Phase 8 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Production readiness". Needs L6 and L7. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Do not declare the product production-ready merely because the frontend and API tests pass.`

Deciding rule, fixed before T1 starts: T0 to T5 and T7 are ticked (T7 added 2026-11-12 by the human, before T1 started), `npm run gate` exits 0, and the human's signoff line (T6) is in the Journal.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint. Evidence: graph-lint exits 0.
- [ ] T1 Readiness report. needs: T0. Write `docs/cad-agent/reports/PRODUCTION_READINESS.md` (new): one row per feature-matrix module with a capability word (I11) and the test name that backs it; no test means UNTESTED. Evidence: graph-lint exits 0, and a test fails when a matrix module has no row.
- [ ] T2 Parity. needs: T0. Every claim in `docs/cad-agent/research/PARITY_SPEC.md` (new) gets, in its readiness row, either a passing test name or UNSUPPORTED with the reason. Where REA holds comparable evidence for both products, run verify_reconstruction on that claim and quote the verdict. Evidence: a test fails when a parity claim has neither a test name nor UNSUPPORTED.
- [ ] T3 Security. needs: T0. API keys in the OS credential store, never in logs or the bundle; permission levels per tool; an audit trail of every operation; structured logs; rate and resource limits. Evidence: tests: a bundle scan finds no key pattern; an operation without permission is refused and logged.
- [ ] T4 Packaging. needs: T0. A local installer build. Signing and publishing are the human's (Escalate). Evidence: the build exits 0 and an e2e smoke test launches the installed app.
- [ ] T5 Independent check. needs: T1, T2, T3, T4. A council over the whole attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T6 (human) Signoff. needs: T5, T7. Evidence: the signoff line in the Journal.
- [ ] T7 Light theme. needs: T0. Added 2026-11-12 by the human, deferred from L4: a light theme that mirrors Graphite (L4 T1), with a toggle. Evidence: `cad-AI/e2e/palette.e2e.ts` passes with the light theme on, and the choice survives a reload.

## Journal
