# L4 Workspace

Phase 3 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Premium CAD desktop experience". Needs L2. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Implement loading, empty, error, running, completed and cancelled states.`

Deciding rule, fixed before T2 starts: T0 to T5 are ticked, `npm run gate` exits 0 with the Playwright suite inside it, and the human's signoff line (T6) is in the Journal.

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint and refresh citations L2 changed. Evidence: graph-lint exits 0.
- [x] T1 (human) Name and direction. needs: T0. The product name (anything but the reference's) and one art direction from the roadmap's Phase 3 brief. Evidence: the decision lines in the Journal.
- [x] T2 Shell. needs: T1. The desktop window with chat, viewport, feature tree, properties, tasks and history panels; every panel renders loading, empty, error, running, completed and cancelled distinctly. Add the Playwright suite to `npm run gate`. Evidence: e2e: each state of each panel renders and its screenshot differs from the others.
- [x] T3 Viewport. needs: T2. Render the kernel's tessellation (glTF from the worker, through a tessellate request this task adds to the worker protocol in `docs/cad-agent/architecture/API_CONTRACTS.md`) with orbit, pan and zoom, always labeled as a preview (I3). Evidence: e2e: a fixture part loads, the canvas is not blank, the preview label is present.
- [x] T4 Tree and properties. needs: T2. Both bound to the adapter's inspect output. Evidence: e2e against a fixture part: the tree lists its features, and the properties panel shows volume and bounding box taken from the execution record (its inspection's volume_mm3 and bbox_mm, `cad-AI/src/services/cad/cadStore.ts`).
- [ ] T5 Independent check. needs: T3, T4. A council with the states and clean-room items of the attack list, plus keyboard reachability and icon-only buttons with no name. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T6 (human) Signoff. needs: T5. Visual quality judged at 1440 × 900 and 1280 × 720. Evidence: the signoff line in the Journal.

## Journal
- 2026-11-10 · L4/T0 · started T0 (L3 T2, T3 and T5 wait on the human's approval to install build123d, so by driver rule 3 this sibling loop takes the tick)
- 2026-11-10 · L4/T0 · passed · gate green · commit loop(L4/T0) (this entry's own commit) · graph-lint resolves every citation; this ledger cited only the roadmap, so nothing L2 changed broke it. Two task lines were made precise against what L2 and L3 settled, adding no check and removing none: T3 names the tessellate request it must add to the worker protocol, and T4 names the record fields the properties panel reads (volume_mm3 and bbox_mm of the inspection). The roadmap's Phase 3 brief gives one design direction (professional engineering software, neutral industrial palette, dark and light themes, no excessive gradients or glow), so T1 asks the human for the name and a concrete direction inside that brief · Direction: still the goal; the workspace will show only what records hold · Next: T1 Name and direction (human). With L3 T2 also waiting on the human (build123d), no loop has an agent task, so the loop stops here and escalates (driver rule 3)

  ```
  graph-lint: 30 docs · 211 citations (107 file, 1 line range, 99 literal, 4 planned)
  graph-lint: clean
  graph-lint exit=0
  ```
- 2026-11-10 · L4/T1 · passed · gate green · commit loop(L4/T1) (this entry's own commit) · human decision in chat, multiple choice: name "MechForge", the name cad-AI's server already prints (`cad-AI/server.ts#MechForge AI Enterprise server running on port`); direction "A Graphite": dark first, near-black neutral greys, one steel-blue accent, and a light theme that mirrors it, inside the roadmap's Phase 3 brief (neutral industrial palette, dark and light themes, no excessive gradients or glow). In the same answers the human approved installing build123d for L3 and committing the .serena/ line in .gitignore · Direction: still the goal; the shell is styled to the brief, and states come from records · Next: T2 Shell (L3 T2 goes first by driver rule 1)
- 2026-11-11 · L4/T2 · started T2 (L3 closed, so L4 is the active loop by driver rule 1)
- 2026-11-11 · L4/T2 · passed · gate green · commit loop(L4/T2) (this entry's own commit; cad-AI commit 24b467b) · each of the six panels now sits in one frame (`cad-AI/src/components/workspace/PanelFrame.tsx`) that shows the panel's own content when completed and, for the other five states, a body with its own icon, title, tone and ARIA role (status, or alert for error). Chat, viewport, history and a new tasks panel beside history are framed in `cad-AI/src/App.tsx`; properties and feature tree are framed inside their inspector tabs (`cad-AI/src/components/inspector/RightInspectorPanel.tsx`). States live in `cad-AI/src/components/workspace/panelViews.ts`: development builds read them from the URL (?panels=tree:error), which is how the e2e suite drives them, and production builds ignore it (unit test). Defaults keep today's content in five panels; tasks starts empty because the job engine is L6. This task did not make that content honest: the chat, history and inspector still show the mock successes the truth audit lists (findings 2 and 7), which the record bindings in T3, T4 and L5 replace. The e2e suite (`cad-AI/e2e/panels.e2e.ts`, `cad-AI/playwright.config.ts`) was written first and failed on all six panels ("element(s) not found"). It now loads each panel in each state at 1440 × 900, checks data-status and the state's role, and requires all 15 pairs of screenshots per panel to differ. It runs on the installed Chrome (channel chrome), so no browser was downloaded. @playwright/test 1.65.0 (approved in L2 T1) was installed with --legacy-peer-deps, because npm refused on an existing conflict (esbuild 0.25 pinned while vite 8 asks for 0.27 or 0.28 as an optional peer); the lockfile only gained lines. The suite is the last step of `npm run gate`. Two screenshots of the running app were checked by eye: the default workspace renders as before, and a mixed-state URL shows five distinct state bodies. Gaps noticed, not fixed: the properties state body sits at the top of its tab instead of centred, and the cad-workspace module's panels are not framed · Direction: still the goal; the shell can now show each state from a record, and T3 and T4 bind the viewport and inspector to kernel output · Next: T3 Viewport

  ```
  red first: 6 failed · Error: expect(locator).toHaveAttribute(expected) failed · Error: element(s) not found
  graph-lint: 30 docs · 210 citations (107 file, 1 line range, 98 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 125 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
   Test Files  4 passed (4)
        Tests  41 passed (41)
  50 passed in 9.49s
  Running 6 tests using 1 worker
    6 passed (48.5s)
  gate exit=0
  clean-room-lint after the cad-AI commit: 130 tracked files · clean
  ```
- 2026-11-11 · L4/T3 · started T3
- 2026-11-11 · L4/T3 · passed · gate green · commit loop(L4/T3) (this entry's own commit; cad-AI commit 74669ad) · the worker protocol gained a tessellate request (`cad-AI/worker/main.py`; kernel side in `cad-AI/worker/adapter_kernel.py`): build123d's export_gltf writes a binary glTF of the rebuilt solid, which a probe showed is in metres and Y-up (the node rotates the kernel's Z-up), about 83 KB for the plate; a document with no solid is precondition_failed, and the test double, which has no geometry, answers unsupported. `Executor.preview` returns it through the serial queue (`cad-AI/src/services/cad/executor.ts`). The viewport renders it in a new component, `cad-AI/src/components/cad/KernelPreview.tsx`: three's GLTFLoader, OrbitControls (left drag orbits, right drag pans, wheel zooms), a camera fitted to the bounding sphere, a size readout converted back to the kernel's axes and millimetres, and a Preview label that is always on. `cad-AI/src/App.tsx` loads it for ?part=<document id> from GET /api/documents/:id/preview, with the viewport panel loading, then completed or error. Without a part, the old procedural viewport still shows. Tests written first and seen failing: 2 pytest (tessellate GLB bounds 0.12 × 0.08 × 0.01 m; no solid and double refused), 1 vitest ("ex.preview is not a function") and 2 e2e. The e2e global setup (`cad-AI/e2e/global-setup.ts`) builds the 120 × 80 × 10 plate with four Ø6 holes through the real executor and kernel and writes its GLB; the suite (`cad-AI/e2e/viewport.e2e.ts`) serves that file on the route and checks: completed status, size 120.00 × 80.00 × 10.00 mm, over 100 triangles, the Preview label, more than 50 colours with the centre unlike the background, and a changed render after an orbit, a pan and a zoom; a 404 shows the error state with the server's message. Loading the executor under Playwright's Node ESM needed an import attribute on the schema JSON (`cad-AI/src/services/cad/operationSchema.ts`). A screenshot showed the first camera framing too tight; the fitted camera was checked by eye after restarting Vite, since DISABLE_HMR turns off its file watching. Owed: the server does not serve the preview route yet, because it does not own an executor until L5 (row added to `docs/cad-agent/architecture/API_CONTRACTS.md`); the properties and tree panels still show mock values next to the real preview, which T4 binds · Direction: still the goal; the viewport shows kernel geometry and says it is only a preview · Next: T4 Tree and properties

  ```
  red first: pytest 2 failed, 4 passed · vitest TypeError: ex.preview is not a function · e2e 2 failed (size attribute element not found; status completed, expected error)
  graph-lint: 30 docs · 210 citations (107 file, 1 line range, 98 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 130 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
   Test Files  4 passed (4)
        Tests  42 passed (42)
  52 passed in 7.85s
  Running 8 tests using 1 worker
    8 passed (47.9s)
  gate exit=0
  clean-room-lint after the cad-AI commit: 133 tracked files · clean
  ```
- 2026-11-11 · L4/T4 · started T4
- 2026-11-11 · L4/T4 · passed · gate green · commit loop(L4/T4) (this entry's own commit; cad-AI commit 3097bec) · `Executor.view` (`cad-AI/src/services/cad/executor.ts`) returns the document's revision, material and features (ids from the adapter's inspect, types from the succeeded operations) and the inspection (valid, volume_mm3, bbox_mm, counts) with the operation row id of the last succeeded record (`lastInspection` and `succeededTypes` in `cad-AI/src/services/cad/cadStore.ts`; type `DocumentView` in `cad-AI/src/types/cad.ts`). For ?part=<id>, `cad-AI/src/App.tsx` loads it from GET /api/documents/:id/inspect beside the preview and puts properties and tree into loading, then completed or error. With a document loaded, the inspector's two tabs render `cad-AI/src/components/inspector/RecordInspector.tsx` instead of the mock values. Without one, the old mock content stays. Tests written first and seen failing: 1 vitest ("ex.view is not a function"; it now also checks that the view's inspection equals the record's validationResult.inspection) and 2 e2e (volume element not found; status completed, expected error). The e2e global setup writes the kernel plate's view next to its GLB. `cad-AI/e2e/inspector.e2e.ts` first checks that this fixture is the analytic plate (box 120.00 × 80.00 × 10.00, volume within 1e-4 of 120·80·10 − 4π·3²·10). It then checks the properties panel shows that volume and box and the record's operation id, and no Mounting_Bracket. The tree must list p new part, s rectangle sketch, x extrude, h hole, and a refused inspect must put both panels in their error state. A first run failed because JSX drops the whitespace between the two spans in a tree row; a `{' '}` fixed it. A screenshot of both tabs was checked by eye (volume 94869.03 mm³, 1 · 10 · 24 solids, faces and edges, as L3 T2 measured). The design row for the route is updated in `docs/cad-agent/architecture/API_CONTRACTS.md`; the server still serves neither route until L5 · Direction: still the goal; for a loaded part, the inspector now shows only what the record holds · Next: T5 Independent check (council). The human has not yet answered whether to add an L4 task for removing false claims and aligning the palette; T5's states and clean-room review will run either way

  ```
  red first: vitest TypeError: ex.view is not a function · e2e 2 failed (expected "94869.03 mm³", element not found; expected error, received completed)
  graph-lint: 30 docs · 209 citations (106 file, 1 line range, 98 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 133 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
   Test Files  4 passed (4)
        Tests  43 passed (43)
  52 passed in 8.39s
  Running 10 tests using 1 worker
    10 passed (51.5s)
  gate exit=0
  clean-room-lint after the cad-AI commit: 135 tracked files · clean
  ```
