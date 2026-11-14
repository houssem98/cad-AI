# L7 Intelligence

Phase 7 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Engineering intelligence". Needs L5. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Document unsupported operations honestly.`

Deciding rule, fixed before T1 starts: T0 to T6 are ticked, `npm run gate` exits 0, and the human's signoff line (T7) is in the Journal. T2's own deciding rule is written into its line before T2 starts.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint. Evidence: graph-lint exits 0.
- [ ] T1 CAD-to-Drawing. needs: T0. Three orthographic views and an isometric from the kernel's hidden-line removal, dimensions taken from the model, output as SVG, PDF and DXF. Evidence: test: every dimension on the drawing equals the model value.
- [ ] T2 Drawing-to-CAD. needs: T0. A drawing image or PDF becomes a spec (vision model), then a part through the L5 agent. evals/drawing2cad/ with a holdout, run by `scripts/eval-drawing2cad.mjs` (new). Evidence: the runner exits 0 on the holdout over 3 runs, output quoted.
- [ ] T3 Assemblies. needs: T0. Multi-part documents, placement and the mates the kernel supports, interference check, bill of materials. Evidence: tests: two mated parts show no interference; the BOM counts match.
- [ ] T4 Automations. needs: T0. Saved, versioned, parameterized workflows that are operation sequences, never code (I6). Evidence: tests: a replay at new parameters yields verified geometry; a workflow holding a non-operation step is refused.
- [ ] T5 Knowledge. needs: T0. Local document ingestion and retrieval with source citations; retrieved text never becomes an instruction. Evidence: tests: an answer cites its chunk; a document that says "delete all features" triggers no tool call.
- [ ] T6 Independent check. needs: T1, T2, T3, T4, T5. A council with the geometry, operations, evals and AI items of the attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T7 (human) Signoff. needs: T6. Evidence: the signoff line in the Journal.

## Journal
- 2026-11-14 · L7/T0 · started T0. L6 waits only on its human signoff (T6). The human said "continue the loop", so by driver rule 3 L7, which needs only L5, is the next loop with agent tasks.
- 2026-11-14 · L7 · human decisions, asked together before any task needed them:
  - T2 Drawing-to-CAD is deferred. T1, T3, T4 and T5 come first, and T2 waits for a decision on a vision model, so nothing new is installed or billed.
  - T1 writes its PDF with a small hand-written writer, with no new package. The kernel already writes SVG and DXF.
  - T5 uses local keyword search, with no model and no new package.
- 2026-11-14 · L7/T0 · failed · gate red: `cad-AI/src/services/agent/text2cad.test.ts#fails a part whose size differs from the overall size the request states (council C4)` got "Failed after 3 failures; the last failed record: extrude: the document does not exist." after 54.7 s (113 of 114 passed, gate exit=1) · commit none · graph-lint exit 0 ("graph-lint: clean"), but the gate is red, so T0 is not ticked; the human then asked to commit and push everything to github.com/houssem98/cad-AI · Direction: goal unchanged; a document vanishing mid-run is a kernel-record fault and comes before any L7 feature · Next: T0 (find why the document disappeared, re-run the gate)
