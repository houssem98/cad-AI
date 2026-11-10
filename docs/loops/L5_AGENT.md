# L5 Agent

Phase 5 of `docs/roadmap/MECAGENT_ROADMAP.md`, "AI CAD agent". Needs L3 and L4. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Do not claim successful execution based on an LLM response.`

Deciding rule, pre-registered now and never edited after T1 is ticked: on the holdout, at least 12 of 15 cases pass every binary check in each of 3 independent runs with the live model; every missing-dimension case in the holdout yields a clarification question and no part; T0 to T7 are ticked, `npm run gate` exits 0, and the human's signoff line (T8) is in the Journal. With n = 15, one case is 6.7 points, so a single-run gain of one case is noise; that is why all three runs must clear the bar.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L3 and L4 changed. Evidence: graph-lint exits 0.
- [ ] T1 Eval set. needs: T0. Under evals/text2cad/, at least 40 cases: a natural-language request and its binary checks (valid solid, bounding box within 0.05 mm, volume within 0.5 %, hole count, minimum feature count), 8 of them missing a dimension with the expected result "asks". Split 25 improvement, 15 holdout in evals/text2cad/holdout/, which only the runner reads. Runner `scripts/eval-text2cad.mjs` (new) exits non-zero below the deciding rule. Evidence: the baseline run (no agent yet) exits 1, output quoted.
- [ ] T2 Spec extraction. needs: T1. Request to a typed engineering spec; units explicit; a missing or contradictory dimension becomes a question, never a guess (I12). Evidence: tests on recorded model responses: "make a bracket" asks for dimensions; "plate 4 in by 3 in by 0.25 in" converts to mm exactly.
- [ ] T3 Tool loop. needs: T2. Model tools map one to one onto adapter operations through the L3 executor; consequential operations (as defined in `docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md`: modify_dimension today, and any delete, overwrite or close type once added) wait for approval; the loop follows `docs/roadmap/MECAGENT_ROADMAP.md#Agent execution loop:`. Evidence: tests on recorded responses: a tool call with bad parameters is refused by the schema and the refusal goes back to the model; an approval-gated operation waits.
- [ ] T4 Verify and recover. needs: T3. Inspect after every operation; on failure replan at most twice, then report failure; the final report quotes execution records, never the model's own claim. Evidence: test: an injected kernel failure ends in status failed with no success text.
- [ ] T5 Chat wiring. needs: T3. The chat panel streams the plan, operation progress and records, with a trace view per request. Evidence: e2e on recorded responses: a request shows its plan, each operation and the final record.
- [ ] T6 Holdout run. needs: T4, T5. Run the deciding analysis unmodified. Evidence: `node scripts/eval-text2cad.mjs --holdout --runs 3` exits 0, output quoted.
- [ ] T7 Independent check. needs: T6. A council with the specs, operations, evals and AI items of the attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T8 (human) Signoff. needs: T7. The human asks for three parts of their own. Evidence: the signoff line in the Journal.

## Journal
