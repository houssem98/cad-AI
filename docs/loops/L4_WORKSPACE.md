# L4 Workspace

Phase 3 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Premium CAD desktop experience". Needs L2. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Implement loading, empty, error, running, completed and cancelled states.`

Deciding rule, fixed before T2 starts: T0 to T5 are ticked, `npm run gate` exits 0 with the Playwright suite inside it, and the human's signoff line (T6) is in the Journal.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L2 changed. Evidence: graph-lint exits 0.
- [ ] T1 (human) Name and direction. needs: T0. The product name (anything but the reference's) and one art direction from the roadmap's Phase 3 brief. Evidence: the decision lines in the Journal.
- [ ] T2 Shell. needs: T1. The desktop window with chat, viewport, feature tree, properties, tasks and history panels; every panel renders loading, empty, error, running, completed and cancelled distinctly. Add the Playwright suite to `npm run gate`. Evidence: e2e: each state of each panel renders and its screenshot differs from the others.
- [ ] T3 Viewport. needs: T2. Render the kernel's tessellation (glTF from the worker) with orbit, pan and zoom, always labeled as a preview (I3). Evidence: e2e: a fixture part loads, the canvas is not blank, the preview label is present.
- [ ] T4 Tree and properties. needs: T2. Both bound to the adapter's inspect output. Evidence: e2e against a fixture part: the tree lists its features, and the properties panel shows volume and bounding box taken from the execution record.
- [ ] T5 Independent check. needs: T3, T4. A council with the states and clean-room items of the attack list, plus keyboard reachability and icon-only buttons with no name. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T6 (human) Signoff. needs: T5. Visual quality judged at 1440 × 900 and 1280 × 720. Evidence: the signoff line in the Journal.

## Journal
