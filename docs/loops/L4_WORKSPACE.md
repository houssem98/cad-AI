# L4 Workspace

Phase 3 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Premium CAD desktop experience". Needs L2. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Implement loading, empty, error, running, completed and cancelled states.`

Deciding rule, fixed before T2 starts: T0 to T5 are ticked (and T7 and T8, which the human added on 2026-11-12; the rule gained two tasks and lost nothing), `npm run gate` exits 0 with the Playwright suite inside it, and the human's signoff line (T6) is in the Journal.

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint and refresh citations L2 changed. Evidence: graph-lint exits 0.
- [x] T1 (human) Name and direction. needs: T0. The product name (anything but the reference's) and one art direction from the roadmap's Phase 3 brief. Evidence: the decision lines in the Journal.
- [x] T2 Shell. needs: T1. The desktop window with chat, viewport, feature tree, properties, tasks and history panels; every panel renders loading, empty, error, running, completed and cancelled distinctly. Add the Playwright suite to `npm run gate`. Evidence: e2e: each state of each panel renders and its screenshot differs from the others.
- [x] T3 Viewport. needs: T2. Render the kernel's tessellation (glTF from the worker, through a tessellate request this task adds to the worker protocol in `docs/cad-agent/architecture/API_CONTRACTS.md`) with orbit, pan and zoom, always labeled as a preview (I3). Evidence: e2e: a fixture part loads, the canvas is not blank, the preview label is present.
- [x] T4 Tree and properties. needs: T2. Both bound to the adapter's inspect output. Evidence: e2e against a fixture part: the tree lists its features, and the properties panel shows volume and bounding box taken from the execution record (its inspection's volume_mm3 and bbox_mm, `cad-AI/src/services/cad/cadStore.ts`).
- [x] T5 Independent check. needs: T3, T4. A council with the states and clean-room items of the attack list, plus keyboard reachability and icon-only buttons with no name. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T6 (human) Signoff. needs: T5, T7, T8. Visual quality judged at 1440 × 900 and 1280 × 720. Evidence: the signoff line in the Journal.
- [x] T7 Layout at 1280 × 720. needs: T5. Added 2026-11-12 by the human. At 1280 × 720 and 1440 × 900, no tab or button label wraps to a second line, the chat's suggestion chips stay inside the chat panel, and every sidebar module can be reached. Evidence: e2e at both sizes: each tab and button label is one line high, no visible element crosses its panel's edge (a row meant to scroll scrolls inside its panel), and each sidebar module is visible or scrolls into view.
- [ ] T8 Graphite palette. needs: T5. Added 2026-11-12 by the human. The dark direction T1 chose: near-black neutral greys, one steel-blue accent, status colours only for states, no gradients or glow, all from one token set. Evidence: e2e at / and /?part=plate: every visible element's computed text, background and border colour is a neutral grey or one of the tokens (the accent and the success, warning and error colours), and no visible element has a gradient background or a coloured blurred shadow.

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
- 2026-11-11 · L4/T5 · started T5 (council: maker Opus; members Sonnet, Sonnet, Haiku with one identical prompt; chairman Sonnet)
- 2026-11-11 · L4/T5 · passed · gate green · commit loop(L4/T5) (this entry's own commit; cad-AI commit a575222) · Members: Sonnet, Sonnet and Haiku, read-only, with one identical prompt (scope T2 to T4; the states and clean-room items of the attack list, plus keyboard reachability and icon-only buttons with no name). Stage 1: 15, 13 and 17 items. Stage 2: each member checked the other two reports; 44 of 45 items confirmed, and R1-8's count of 15 unnamed controls on load was refuted in part, because those buttons are named by their title. Stage 3: chairman Sonnet, 23 deduplicated items (9 high, 10 medium, 4 low), listed below. Maker: the failing checks came first (new `cad-AI/e2e/honesty.e2e.ts`, `cad-AI/e2e/a11y.e2e.ts` and `cad-AI/e2e/no-webgl.e2e.ts`; panels, viewport and inspector specs extended; red run 18 failed, 6 passed), then one fix round. Rejected, with reasons: C10, because the preview and inspect routes are documented as owed to L5 in `docs/cad-agent/architecture/API_CONTRACTS.md` and the e2e stubs stand in for them until the server owns the executor; C17, because running and cancelled states come from L5 requests and L6 jobs, and T2's fixture already proves each state renders; C20, because `title` is a valid accessible-name source and this task targets buttons with no name, which C12 covers. Escalated: C23, the reference product's name in the human's own cad-AI docs (`cad-AI/docs/roadmap/roadmap2_91174d5c.md`, `cad-AI/docs/roadmap/01_PRODUCT_GAP_ANALYSIS.md`, `cad-AI/docs/roadmap/00_REPOSITORY_TRUTH_AUDIT.md`, `cad-AI/docs/benchmarks/CAD_EVALUATION_PLAN.md`, and the file name `cad-AI/docs/roadmap/roamdap_mecaiagent_a1c37327.md`); renaming or redacting them is the human's call. The first green attempt found two test faults, fixed without loosening a product claim. The viewport load check raced the first frame drawn after the mesh loads when the suite ran under load (it passed 3 of 3 alone), so it now polls the same centre-is-not-background assertion. Two equal damped Rotate drags ended 9 to 17 of about 373,000 pixels apart, so the Pan test compares views by the share of pixels changed: equal drags under 0.1 %, Pan against Rotate over 5 %, which is stronger than the old any-byte-differs check. Both tests then passed 3 of 3 repeats. Findings 2 and 7 of `docs/cad-agent/CAD_AI_TRUTH_AUDIT.md` cited the false strings T5 removed, so graph-lint failed; they now quote those strings as read at f46cc70 and cite the honest replacements. gate-guard on cad-AI's own diff: clean, with 2 assertions in viewport.e2e.ts rewritten at equal or greater strength. The fixes were not attacked by a second council round. Out of T5's workspace scope and still open: other mock modules (Overview, the Verification Center view, Integrations, the Export modal) still carry false claims, and the palette is not aligned to Graphite · Direction: still the goal; the workspace now claims only what a record backs and labels everything else demo or preview · Next: T6 (human) signoff at 1440 × 900 and 1280 × 720. C23, and whether to add an L4 task for the remaining false claims and the palette, wait on the human

  ```
  C1  high   honesty  live SolidWorks bridge claimed (ThreeCADViewport.tsx:587, TopNavigation.tsx:221, App.tsx help) · 3/3 · fixed: "No CAD application is connected"
  C2  high   honesty  chat, history and console claim verification against the loaded record; fabricated log lines · 3/3 · fixed: verdict from the record, demo labels, fake stats and logs removed
  C3  high   honesty  Approve & Execute is timers that report success and Euler verification (AICADAgentPanel.tsx:286-306) · 2/3 · fixed: demo flow, "Apply to preview", no verification claim
  C4  high   honesty  report modal says CERTIFIED PASS and 99.8 % with no record (VerificationReportModal.tsx:103) · 1/3 · fixed: rewritten as a demo report
  C5  high   honesty  default viewport has no Preview label, claims Parasolid B-Rep and an .SLDPRT · 3/3 · fixed: Preview label, demo model
  C6  high   honesty  CAD Workspace module never receives the record, falls back to invented data · 3/3 · fixed: module wired to the record
  C7  high   crash    no WebGL or a bad GLB unmounts the app; no error boundary · 2/3 · fixed: PanelFrame boundary, guarded renderer and parse
  C8  high   a11y     viewport not operable by keyboard · 3/3 · fixed: focusable, labelled, arrows pan, Shift+arrows orbit, +/- zoom
  C9  high   honesty  a failed /api/chat shows a canned reply as the model; Attach does nothing · 1/3 · fixed: offline-demo sender, Attach disabled with its reason
  C10 medium test     T3/T4 e2e pass on page.route stubs; server has no /api/documents route · 3/3 · rejected: routes owed to L5
  C11 medium test     panels completed check cannot tell content from the placeholder · 2/3 · fixed
  C12 medium a11y     Check button, dimension input, material and role selects, drawing close have no name · 3/3 · fixed
  C13 medium a11y     help, report and drawing overlays are not dialogs · 3/3 · fixed: Dialog.tsx (role, aria-modal, focus trap, Esc)
  C14 medium a11y     inspector and console tabs expose no selected state · 1/3 · fixed: tab roles, aria-selected
  C15 medium honesty  empty record or zero-triangle glTF renders as completed · 2/3 · fixed: empty state from data
  C16 medium binding  BOM tab ignores the loaded record · 1/3 · fixed: BOM empty with a document loaded
  C17 medium T2       panel states not driven by app state · 1/3 · rejected: running and cancelled come from L5 and L6
  C18 medium honesty  Select/Rotate/Pan tools do nothing · 1/3 · fixed: Pan makes a left drag pan
  C19 medium a11y     Copilot Role select has its focus ring removed · 1/3 · fixed
  C20 low    a11y     about 30 icon-only buttons named by title alone · 3/3 · rejected: title is a valid name
  C21 low    wording  "From the execution record" over store values; size readout not marked as mesh · 1/3 · fixed: headings split, "mesh bounds"
  C22 low    UX       Esc does not cancel a dimension edit · 1/3 · fixed
  C23 low    docs     reference product's name in the human's cad-AI docs · 2/3 · escalated to the human
  red first: e2e 18 failed, 6 passed
  graph-lint: 30 docs · 206 citations (105 file, 1 line range, 96 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 135 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
   Test Files  4 passed (4)
        Tests  43 passed (43)
  52 passed in 8.27s
  Running 24 tests using 1 worker
    24 passed (1.9m)
  gate exit=0
  repeat: a11y Pan/Rotate and viewport load, 3 each · 6 passed
  clean-room-lint after the cad-AI commit: 140 tracked files · clean
  ```
- 2026-11-12 · L4 · human decision in chat, multiple choice: before the T6 signoff, add T7 Layout at 1280 × 720 (console tab labels wrap to two lines, the chat's suggestion chips overflow, and the sidebar is cut off in the T5 screenshots) and T8 Graphite palette. The remaining false claims outside the workspace (Overview, the Verification Center view, Integrations, the Export modal) were offered and not chosen, so they stay deferred. C23 is left as is: the reference name sits in the human's own planning docs, which the app does not ship. The deciding rule gains T7 and T8, and T6 now needs them. The light theme in T1's direction has no task yet · Direction: still the goal · Next: T7 Layout
- 2026-11-12 · L4/T7 · started T7
- 2026-11-12 · L4/T7 · passed · gate green · commit loop(L4/T7) (this entry's own commit; cad-AI commit 845991b) · `cad-AI/e2e/layout.e2e.ts` was written first and checks / and /?part=plate at 1440 × 900 and 1280 × 720. No text run inside a visible button or tab may break onto a second line, and no control's content may be wider or taller than the control. No visible element may cross its panel (header, sidebar or a [data-panel] section) or its nearest clipping ancestor. Only vertical scrolling is allowed: a sideways overflow counts as a fault even inside a scroller. Every sidebar button must scroll into view and pass a trial click. Red first: 5 wrapped labels at 1440 (model selector, Live Voice, two deliverable-card subtitles, the Feature Tree tab) and 3 more at 1280 (the console tabs). After those were fixed, the demo viewport's toolbar and the close button of its document tab were cut off at 1280. A screenshot then showed overflows the first version of the check let pass, because it excused anything inside a scroller and never compared against the panel: the chat header ran past its 340 px panel at both sizes, the suggestion chips scrolled sideways behind a hidden scrollbar, and the Material select poked out of its card. The check was tightened before those fixes, then corrected once where it had flagged a chat avatar scrolled out of view inside the conversation. Fixes in cad-AI: whitespace-nowrap on those labels, truncated card subtitles, a chat header that wraps its controls onto a second row (right-aligned), wrapping suggestion chips, a Material select that shrinks to its card, a wrapping viewport toolbar, and a shorter tab-bar note ("demo model, not built by a CAD kernel", full sentence in its title) that truncates instead of crushing the document tab. The sidebar already scrolls (its scrollbar is hidden), so every module was already reachable. This machine had about 0.4 GB of RAM free: one global setup failed on an OpenBLAS allocation, and a cold dev server took up to 17 s to show the plate. So the new spec waits up to 30 s for the viewport and 10 s per trial click; these are waits, and no assertion was loosened. A 1280 × 720 screenshot was checked by eye after the fixes · Direction: still the goal · Next: T8 Graphite palette

  ```
  red first: e2e layout 4 failed (wrapped labels: gemini-3.8-flash, Live Voice, STEP AP242 ISO-10303 B-Rep, Python Script pywin32 bridge, Feature Tree; at 1280 also Operation History (4), Verification Results, Task Progress)
  graph-lint: 30 docs · 206 citations (105 file, 1 line range, 96 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 140 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
   Test Files  4 passed (4)
        Tests  43 passed (43)
  52 passed in 8.50s
  Running 28 tests using 1 worker
    28 passed (2.2m)
  gate exit=0
  gate-guard in cad-AI: clean
  clean-room-lint after the cad-AI commit: clean
  ```
