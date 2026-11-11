# L3 Kernel

Phase 4 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Real CAD adapter", on the kernel L2 T1 chose. Needs L2. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Execute a basic modeling operation.`

Deciding rule, fixed before T1 starts: T0 to T6 are ticked, `npm run gate` exits 0 with every geometry test inside it, and the human's signoff line (T7) is in the Journal.

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint and refresh citations L2 changed. Evidence: graph-lint exits 0.
- [x] T1 Adapter contract. needs: T0. The interface in `docs/roadmap/MECAGENT_ROADMAP.md#Define a common CAD adapter interface:` plus a capability manifest; an operation an adapter lacks returns a typed unsupported result. One contract suite parameterized over adapters. Evidence: the suite passes against a test double, and fails against a double that claims an operation it lacks; an adapter called directly with an operation it lacks returns unsupported (`docs/cad-agent/architecture/CAD_ADAPTERS.md`).
- [x] T2 Geometry operations. needs: T1. New part; sketch (rectangle, circle, polyline); extrude, cut, hole, fillet, chamfer; modify a dimension; assign material; inspect (valid, volume, area, bounding box, face and edge counts, feature list). Evidence: tests: a 120 × 80 × 10 mm plate with four Ø6 through holes is a valid solid whose volume equals the analytic value within 0.01 %, bounding box within 0.001 mm, four cylindrical faces; changing thickness to 12 rebuilds to the new analytic volume.
- [x] T3 Export round trip. needs: T2. STEP and native export, re-import and compare. Evidence: tests: export then re-import keeps volume within 0.01 % and the bounding box; a corrupted STEP is refused with an error record.
- [x] T4 Executor and records. needs: T1. Schema validation before any kernel call; per-operation timeout and cancellation; one persisted execution record per operation with every field of `docs/roadmap/MECAGENT_ROADMAP.md#Every CAD operation must produce an execution record containing:`. No path runs model-written code (I6). Evidence: tests: invalid parameters refused before the kernel is called; an operation past its timeout is cancelled and recorded; a failed operation is recorded with its error; an operation type `script` is refused; a refused proposal has a record; after a cancel or a timeout the document's revision and inspection equal its checkpoint; an operation left running at server start is restored and recorded (`docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md`).
- [x] T5 Headless milestone. needs: T2, T3, T4. A fixed operation sequence, no model: enclosure 120 × 80 × 40 mm, 2 mm shell, four M3 bosses, separate lid. Evidence: test: both parts valid, volumes equal the analytic values within 0.05 %, STEP round trip holds, every operation has a record.
- [x] T6 Independent check. needs: T5. A council with the geometry, operations, records and adapters items of the attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [x] T7 (human) Signoff. needs: T6. The human opens the T5 STEP files in any viewer. Evidence: the signoff line in the Journal.

## Journal
- 2026-11-10 · L3/T0 · started T0
- 2026-11-10 · L3/T0 · passed · gate green · commit loop(L3/T0) (this entry's own commit) · graph-lint resolves every citation; L2 T4 had changed the design under four task lines that had not started, so they were refreshed, each only adding checks: L3 T1 (an adapter called directly with an operation it lacks returns unsupported), L3 T4 (a refused proposal has a record; after a cancel or timeout the revision and inspection equal the checkpoint; an operation left running at server start is restored and recorded), L5 T3 (consequential now means modify_dimension today, not the old delete and overwrite examples), L6 T1 (a hung worker under a live server fails within 15 s; a job past its maximum duration ends with timeout). No Gemini reference was left in L3 to L9. build123d is not installed (Python 3.12.10 has no build123d module); T1 runs on a test double and does not need it, but T2 does, and installing a CAD package is an escalation · Direction: still the goal; the kernel tasks now test the restore and record design L2 fixed · Next: T1 Adapter contract; before T2, the human approves installing build123d

  ```
  graph-lint: 30 docs · 205 citations (99 file, 1 line range, 101 literal, 4 planned)
  graph-lint: clean
  graph-lint exit=0
  gate exit=0
  ModuleNotFoundError: No module named 'build123d'
  ```
- 2026-11-10 · L3/T1 · started T1
- 2026-11-10 · L3/T1 · passed · gate green · commit loop(L3/T1) (this entry's own commit; cad-AI commit 5163396) · built in cad-AI/worker: the base adapter with the roadmap's interface plus health, capabilities and import_document (`cad-AI/worker/adapter.py`), whose `run()` returns a typed unsupported result for a type the manifest does not claim, an unlisted export format or an unimplemented method, and kernel_error for an engine exception; the contract suite (`cad-AI/worker/adapter_contract.py`): manifest shape, one ordered case per operation type (two for export, STEP and BREP), each result merged into its envelope and checked against the schema, a supported entry must succeed, an unclaimed one must return unsupported, inspect must return verification; an in-memory double that holds no geometry, so its inspect reports an invalid, empty body (`cad-AI/worker/adapter_double.py`). The test (`cad-AI/worker/test_adapter_contract.py`) was written first and failed at collection. Design rows added to `docs/cad-agent/architecture/CAD_ADAPTERS.md`, including that a created sketch, feature or artifact takes its operation's id. The fillet and chamfer cases use placeholder edge names that T2 must replace with names the kernel resolves · Direction: still the goal; the contract is the bar the kernel adapter must meet in T2 · Next: T2 Geometry operations, blocked until the human approves installing build123d

  ```
  full []
  partial []
  lying ['c03 extrude: claimed supported but returned unsupported', 'c05 cut: claimed supported but returned unsupported', 'c06 hole: claimed supported but returned unsupported', 'c08 fillet: claimed supported but returned unsupported', 'c09 chamfer: claimed supported but returned unsupported']
  overclaim ['manifest claims mate, which the schema does not define']
  graph-lint: 30 docs · 208 citations (102 file, 1 line range, 101 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 114 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
        Tests  20 passed (20)
  29 passed in 0.07s
  gate exit=0
  ```
- 2026-11-10 · L3/T4 · started T4 (T2 is first in order but waits on the human's approval to install build123d; T4 needs only T1 and runs on the test double)
- 2026-11-10 · L3/T4 · passed · gate green · commit loop(L3/T4) (this entry's own commit; cad-AI commit 8511fb2) · built the executor (`cad-AI/src/services/cad/executor.ts`), its SQLite store on the built-in node:sqlite module, so no new dependency (`cad-AI/src/services/cad/cadStore.ts`), the stdio worker client (`cad-AI/src/services/cad/cadWorker.ts`) and the Python worker loop (`cad-AI/worker/main.py`); the test double gained checkpoint save and load and test-only hang and fail switches. The lifecycle runs as designed: proposal check and schema before the worker sees anything, lengths to mm, preconditions, manifest, approval (consequential without an approver is denied), a second precondition check, one deadline over run and inspect, cancel or timeout kills and restarts the worker and reloads every document from its checkpoint, and each operation, refused ones included, gets a record committed in one transaction with the document change. The 8 tests were written first and failed on the missing module. Building it changed three design rows, now updated: the envelope id is kept (unique among succeeded operations in its document) and the server keys rows by its own uuid, because later operations name earlier ones; the worker protocol gained capabilities, inspect, save and load; documents.checkpoint and records.artifacts_json. Not done here and still owed: numbered migration files (tables are created in code), artifact sha256 (L3 T3), a test for the storage_error halt. After the run no worker process was left (the 3 python processes are another tool's) · Direction: still the goal; every operation now has a persisted record and a restore path before any real geometry exists · Next: T2 Geometry operations, which needs the human's approval to install build123d; T3 and T5 depend on T2, so without it the loop has no agent task left in L3

  ```
   ✓ executor > refuses invalid parameters before the kernel is called, with a record 200ms
   ✓ executor > refuses an operation type script 207ms
   ✓ executor > times out a hung operation, records it and restores the checkpoint 638ms
   ✓ executor > cancels a running operation, records it and restores the checkpoint 562ms
   ✓ executor > records a failed operation with its error and restores the checkpoint 212ms
   ✓ executor > restores and records an operation left running when the server stopped 370ms
   ✓ executor > denies a consequential operation when nobody approves it 218ms
   ✓ executor > keeps every roadmap record field and sends the kernel millimetres 214ms
  graph-lint: 30 docs · 211 citations (106 file, 1 line range, 100 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 119 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
        Tests  28 passed (28)
  29 passed in 0.07s
  gate exit=0
  ```
- 2026-11-10 · L3/T2 · started T2 (the human approved installing build123d in chat, multiple choice: "Approve install (Recommended)")
- 2026-11-10 · L3/T2 · passed · gate green · commit loop(L3/T2) (this entry's own commit; cad-AI commit 3b66e32) · build123d 0.13.0 installed (pip exit 0) and pinned in `cad-AI/worker/requirements.txt`. The kernel adapter (`cad-AI/worker/adapter_kernel.py`) keeps each document as its feature history and replays it on every change, so modify_dimension rebuilds and a failed operation changes nothing; edges are named feature:edge:n and found again by geometry after a rebuild; unknown sketches, edges or documents are precondition_failed. Tests (`cad-AI/worker/test_kernel_geometry.py`) were written first and failed at import. Kernel measurements: the 120 × 80 × 10 mm plate with four Ø6 through holes is one valid solid of 94869.0266 mm³ against the analytic 94869.0266 (relative error 1.5e-16, bar 1e-4), bounding box exactly ±60, ±40, 0 to 10 (bar 0.001 mm), four cylindrical faces; thickness 12 rebuilds to 113842.8320 mm³, analytic 113842.8320. The kernel also passes the adapter contract, where each step changes volume by its analytic amount (cut −141.372 = π·3²·5, hole −70.686 = π·1.5²·10, fillet −2.146 = (1 − π/4)·1²·10); the chamfer propagates along the tangent edge chain, OpenCascade's standard behaviour, now written in `docs/cad-agent/architecture/CAD_ADAPTERS.md`. Export and import stay unsupported in the manifest until T3. The worker takes `--adapter kernel` · Direction: still the goal; the first geometry claims are the kernel's own measurements · Next: T3 Export round trip

  ```
  plate t=10 volume 94869.0266 analytic 94869.0266 rel_err 1.53e-16
  bbox {'min': {'x': -60.0, 'y': -40.0, 'z': 0.0}, 'max': {'x': 60.0, 'y': 40.0, 'z': 10.0}} valid True cyl_faces 4 counts {'solids': 1, 'faces': 10, 'edges': 24}
  plate t=12 volume 113842.8320 analytic 113842.8320 rel_err 2.56e-16 zmax 12.000000
  graph-lint: 30 docs · 212 citations (108 file, 1 line range, 99 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 122 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
        Tests  28 passed (28)
  34 passed in 4.86s
  gate exit=0
  ```
- 2026-11-10 · L3/T3 · started T3
- 2026-11-10 · L3/T3 · passed · gate green · commit loop(L3/T3) (this entry's own commit; cad-AI commit edf00d9) · kernel export (`cad-AI/worker/adapter_kernel.py`) writes STEP or BREP, re-imports the file and succeeds only when volume matches within 0.01 % and the bounding box within 0.001 mm, else verification_failed; import starts a new document from the file and refuses one with no solid. A probe found two engine behaviours the tests now pin: a corrupted STEP imports as an empty compound without raising, and OpenCascade prints the parse error to the process's native stdout, which would have corrupted the worker protocol; `cad-AI/worker/main.py` now gives the protocol its own copy of stdout and points file descriptor 1 at stderr, and the executor test proves a corrupted STEP ends as kernel_error with a record instead of worker_crashed. The executor resolves an import's artifact id to the stored path (an unknown id is precondition_failed before the worker is called), hashes each exported file itself and stores it in a new artifacts table; import, like new_part, needs a document that does not yet exist. The kernel manifest now claims step and brep, and the contract passes with them. Tests (`cad-AI/worker/test_kernel_export.py` and one executor case) were written first and failed. Design rows updated in CAD_ADAPTERS, API_CONTRACTS and DATABASE_DESIGN (record_artifacts dropped: each record lists artifact id and sha256) · Direction: still the goal; an export now counts only after its own re-import matches · Next: T5 Headless milestone

  ```
  step succeeded 29901 bytes sha 05cac68cb416 reimport vol 94869.0266 rel_err 1.53e-16 bbox max {'x': 60.0, 'y': 40.0, 'z': 10.0} cyl 4
  brep succeeded 7038 bytes sha fe224af567bd reimport vol 94869.0266 rel_err 1.53e-16 bbox max {'x': 60.0, 'y': 40.0, 'z': 10.0} cyl 4
  graph-lint: 30 docs · 212 citations (108 file, 1 line range, 99 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 123 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
        Tests  29 passed (29)
  38 passed in 6.59s
  gate exit=0
  ```
- 2026-11-10 · L3/T5 · started T5
- 2026-11-10 · L3/T5 · passed · gate green · commit loop(L3/T5) (this entry's own commit; cad-AI commit 11c19c8) · the milestone test (`cad-AI/src/services/cad/milestone.test.ts`) runs a fixed typed sequence, no model, through the executor on the kernel worker. The schema has no shell operation and no offset sketch plane, so the 2 mm shell is the 120 × 80 × 40 box, a through cut of 116 × 76, and a fused 2 mm floor; four Ø6 bosses 10 mm tall at (±52, ±32) carry Ø2.5 M3 tap holes 6 mm deep (the hole's depth of 36 is measured from the part's top face, as the kernel row in CAD_ADAPTERS states); the lid is a 2 mm plate with four Ø3.4 clearance holes. Both are one valid solid at the analytic volume to every printed digit (bar 0.05 %), with the bounding box expected; each STEP export re-imports into a new document at the same volume and bounding box; all 30 operations have a succeeded record. The test passed on its first run, because T1 to T4 had already built every step it uses; this task added no product code. The STEP files are copied to cad-AI/milestone-out (ignored by cad-AI's git) for the human's T7 check · Direction: still the goal; the program's first end-to-end claim, request to verified STEP, holds without a model · Next: T6 Independent check (council)

  ```
  enclosure: 49778.9690 mm3, analytic 49778.9690, STEP back 49778.9690
  lid: 19127.3664 mm3, analytic 19127.3664, STEP back 19127.3664
  records: 30 operations, 30 records
   ✓ headless milestone > builds a valid enclosure and lid at their analytic volumes, round-trips STEP, and records every operation 19136ms
  graph-lint: 30 docs · 212 citations (108 file, 1 line range, 99 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 124 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
   Test Files  3 passed (3)
        Tests  30 passed (30)
  38 passed in 7.58s
  gate exit=0
  ```
- 2026-11-10 · L3/T6 · started T6 (council: maker Opus; members Sonnet, Sonnet, Haiku with one identical prompt; chairman Sonnet; full protocol including peer review)
- 2026-11-11 · L3/T6 · passed · gate green · commit loop(L3/T6) (this entry's own commit; cad-AI commit c17ca96) · the earlier tick left only its started line, so the council ran again from the start. Members: Sonnet, Sonnet and Haiku, read-only, with one identical prompt (scope T1 to T5; the geometry, operations, records and adapters items of the attack list). Stage 1: 13, 11 and 14 items (12, 9 and 12 reproduced by probe). Stage 2: each member checked the other two reports under shuffled labels; all 38 items were confirmed by both, none refuted, none unsure. Stage 3: chairman Sonnet, 20 deduplicated items (4 high, 9 medium, 7 low), listed below. Maker: each item was written as a failing test first (11 pytest and 12 vitest cases red), or as a corrected design row, then fixed in one round. Rejected parts, with reasons: C14's code change, because cut, hole and a second material assignment append a history entry and change none, so Restore removes them whole (the doc line that said they "only add geometry" is corrected instead); C12's executor half, because new_part makes only parts and no type makes another kind until L7 (row corrected); C11's deadline on the approval wait, because the user decides how long to think and cancel now ends the wait. One added test (an inspect that hangs past the deadline) passed on its first run: the path already worked, so it adds coverage, not a fix. A multibody part is now UNSUPPORTED and fails verification. Design rows corrected in EXECUTION_AND_VERIFICATION, CAD_ADAPTERS, API_CONTRACTS (no cancel message and no progress line; capabilities also returns calls) and DATABASE_DESIGN (storage_error lasts until restart). gate-guard on cad-AI's own diff: clean, one assertion rewritten at greater strength (toHaveProperty to toBeTruthy plus errorDetails null). The fixes were not attacked by a second council round · Direction: still the goal; the executor now refuses a geometry claim its own inspection does not back, which is I3 enforced in code, not only in tests · Next: T7 (human) signoff: open the T5 STEP files in cad-AI/milestone-out in any viewer

  ```
  C1  high   geometry   succeeded recorded for an invalid, empty or unchanged solid (executor.ts:115-127) · 3/3 · fixed: verify step, kernel no-op cut/hole check
  C2  high   records    exceptions escape execute() with no record (approve throws; manifest call outside try) · 3/3 · fixed
  C3  high   records    pending and awaiting_approval rows unrecorded after restart (cadStore.ts:72) · 3/3 · fixed: recorded cancelled
  C4  high   operations approval fails open on any answer but 'denied' (executor.ts:98-99) · 2/3 · fixed: only approved or auto run
  C5  medium records    cadCommand null on timeout, cancel, crash (executor.ts:110) · 3/3 · fixed: calls map from capabilities
  C6  medium geometry   import never checks stored sha256 (executor.ts:86-89) · 2/3 · fixed: precondition_failed "changed"
  C7  medium geometry   polyline extrude direction follows winding (adapter_kernel.py:156) · 2/3 · fixed: clockwise reversed
  C8  medium geometry   two disjoint solids reported valid (adapter_kernel.py:36) · 1/3 · fixed: executor needs exactly one solid
  C9  medium operations execute not serialised, replies cross (cadWorker.ts:52) · 3/3 · fixed: one request at a time
  C10 medium records    storage failure returns no code; halted never cleared (executor.ts:74,182-184) · 3/3 · fixed: storage_error returned; row corrected
  C11 medium operations cancel ignored during approval wait; save without signal (executor.ts:98,118) · 1/3 · fixed; approval deadline rejected
  C12 medium adapters   contract does not prove document kinds (adapter_contract.py:53) · 3/3 · fixed in contract; executor half rejected
  C13 medium adapters   contract accepts export with no file or re-import; double does it · 2/3 · fixed: contract and executor; double claims no export or import
  C14 low    operations CONSEQUENTIAL holds only modify_dimension · 2/3 · rejected, doc row corrected
  C15 low    record lacks end time; failed export drops its measurement · 3/3 · fixed
  C16 low    worker runs unvalidated operations (main.py:22-23) · 1/3 · fixed: worker validates
  C17 low    hole with neither depth nor through_all ends kernel_error (adapter_kernel.py:181) · 1/3 · fixed: precondition_failed
  C18 low    doc lists a cancel message and progress lines main.py lacks; validated never written · 3/3 · row corrected; validated now written
  C19 low    weak tests: toHaveProperty, features-only restore, no inspect-deadline test · 2/3 · fixed: stronger assertions, new test
  C20 low    new_part or import wipes an existing document at adapter level; session methods unimplemented · 1/3 · fixed; session row UNTESTED until L9
  red first: pytest 11 failed, 39 passed · vitest executor 12 failed, 6 passed
  graph-lint: 30 docs · 212 citations (108 file, 1 line range, 99 literal, 4 planned)
  graph-lint: clean
  clean-room-lint: 124 tracked files · 0 fingerprints · 241 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
   Test Files  3 passed (3)
        Tests  39 passed (39)
  50 passed in 9.25s
  gate exit=0
  ```
- 2026-11-11 · L3/T7 · started T7
- 2026-11-11 · L3/T7 · passed · gate green · commit loop(L3/T7) (this entry's own commit) · the human opened cad-AI/milestone-out/enclosure.step and lid.step (rebuilt by the T6 gate run) and wrote in chat: "T7 ok, looks right". No viewer was named. With T0 to T7 ticked and the gate green, the deciding rule holds; ticking the L3 loop line is the human's (driver rule 4) · Direction: still the goal; the program's first end-to-end claim now has the human's eyes on it as well as the kernel's measurements · Next: L4 Workspace, first unticked agent task
