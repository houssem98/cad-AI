# Technical Unknowns

L1 T9, written 2026-11-08. This file collects every open question from the L1 research, says what would answer each one and whether our build needs the answer, and ends with the roadmap's Phase 1 closing summary. Sources: `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md`, `docs/cad-agent/research/ARCHITECTURE_OBSERVED.md`, `docs/cad-agent/research/ELECTRON_GRAPH.md`, `docs/cad-agent/research/SIDECAR_PROTOCOL.md`, `docs/cad-agent/research/USER_JOURNEYS.md` and `docs/cad-agent/research/OBSERVATION_LOG.md`.

REA's residual-unknown registry is empty: list_unknowns returned 0 entries (that call was not exported as evidence; only the T9 Journal entry records it), because L1 kept its unknowns in the research docs and never recorded them in REA. The audit_residual_unknowns workflow was rendered. Its probes (verify, update or record an unknown) act on registry entries, so with an empty registry there was nothing for them to check; the list below is built from the docs instead.

## Unknowns

"Needed" asks whether our build has to know the answer. Our product is a clean-room build that matches behaviour, so most of the reference's internals are not needed.

| # | Unknown | Where it was raised | What would answer it | Needed |
|---|---|---|---|---|
| U1 | The real screens, the renderer routes and their order | Electron graph, renderer | Parsing the renderer root chunk with more analyzer memory than 1800 MiB, or a human walkthrough | No. Our interface is our own design (L4); parity is graded on behaviour |
| U2 | Where the model choice travels and how usage is counted | Electron graph, feature map row 12; matrix chain 12 | The same root chunk, or a walkthrough | No. The public behaviour (six tiers, a default tier, plan limits, usage in settings) is enough for T10 to decide whether we match it |
| U3 | The backend's base address | Electron graph, hosts | A runtime capture, which the inspector fuse blocks | No. We never call the reference's servers (I8) |
| U4 | Where crash reports and realtime updates go | Electron graph, hosts | A runtime capture | No |
| U5 | How a main-process handler passes a request to the sidecar | Matrix, T5 section | A runtime capture, or reading the bodies of the minified handlers | No. Our wiring is designed in L2 T2 |
| U6 | Which SolidWorks calls run, in what order, with what timeouts, and what happens when SolidWorks is busy or shows a dialog | Sidecar protocol, API surface and lifecycle | A licensed SolidWorks and runtime observation | Partly, for L9, which takes call sequences from the public SolidWorks API documentation and its own tests, not from the reference |
| U7 | How sketches and features are created, since no SolidWorks feature-creating member is among the referenced interop members | Sidecar protocol, API surface | The same as U6 | No. L3 and L9 build features from public kernel and SolidWorks API documentation |
| U8 | When the agent asks a question instead of building, and what it does with a missing dimension | User journeys 1 and 4 | A walkthrough | No. Our rule I12 decides: a missing dimension is always asked for |
| U9 | How the agent checks its own result | Matrix row 1; user journeys 1 | A walkthrough or a capture | No. Our rule I3 decides: the kernel's own inspection |
| U10 | How a STEP rebuild is checked | Matrix row 5; user journeys 5 | A walkthrough | No. L6 T3 sets our bar: volume within 0.1 % and the same bounding box |
| U11 | The error texts and failure screens the user sees | User journeys 14 | A walkthrough | No. We write our own copy (I7) |
| U12 | What the 30 renderer calls with no resolved main handler do | Electron graph, IPC channels | Reading those handlers or a capture | No |
| U13 | What the global keyboard and mouse hook is used for | Electron graph, modules | A capture | No. It belongs to the collection feature we do not copy |
| U14 | Which task type each of the two task-creation channels serves | Matrix row 7 | A walkthrough | No |
| U15 | What the STEP viewer page's inline script does | Electron graph, renderer | A static read of that script | No |
| U16 | Whether background tasks keep running after the app closes, and when outputs expire | User journeys 10 (unverified public text) | A walkthrough | Partly. L6 sets our own job lifetime: jobs persist and survive a restart |
| U17 | How assemblies are checked, for example for interference | Matrix row 6 (not described) | A walkthrough with SolidWorks | No. L7 T3 defines our checks |
| U18 | Whether the .NET code runs inside the shell's process or in a child process | Architecture, open items | Partly answered: the in-process bridge import is CONFIRMED (T3) and a separate runner process is INFERRED (T4); the runtime split needs a capture | No |

None of the 18 blocks L2 or any build loop. Only U6 and U16 touch our work: L9 answers U6 from public SolidWorks documentation, and L6 sets our own job lifetime for U16.

## Chain hop labels

Each matrix row's chain (T5) has five hops: UI, IPC, main handler, sidecar and SolidWorks. Each hop gets one label, by three rules fixed before counting:

1. A hop takes the weakest label among the facts it needs: UNKNOWN is weaker than INFERRED, which is weaker than CONFIRMED.
2. The IPC hop takes the T3 feature-map label, which grades the link between the module and its code area.
3. A hop the chain cell does not state takes T5's general finding. Row 14's handler hop is UNKNOWN on that basis.

| Row | UI | IPC | Handler | Sidecar | SolidWorks |
|---|---|---|---|---|---|
| 1 CAD Agent | UNKNOWN | CONFIRMED | UNKNOWN | INFERRED | UNKNOWN |
| 2 CAD document context | UNKNOWN | CONFIRMED | UNKNOWN | INFERRED | INFERRED |
| 3 Feature tree | UNKNOWN | CONFIRMED | UNKNOWN | INFERRED | INFERRED |
| 4 Text-to-CAD | UNKNOWN | INFERRED | UNKNOWN | INFERRED | UNKNOWN |
| 5 STEP-to-CAD | UNKNOWN | INFERRED | UNKNOWN | UNKNOWN | UNKNOWN |
| 6 Assembly intelligence | UNKNOWN | INFERRED | UNKNOWN | INFERRED | UNKNOWN |
| 7 Drawing-to-CAD | INFERRED | INFERRED | INFERRED | INFERRED | INFERRED |
| 8 CAD-to-Drawing | CONFIRMED | CONFIRMED | UNKNOWN | INFERRED | INFERRED |
| 9 Macro generation | UNKNOWN | CONFIRMED | UNKNOWN | INFERRED | UNKNOWN |
| 10 Background Tasks | INFERRED | CONFIRMED | INFERRED | INFERRED | INFERRED |
| 11 General Knowledge | INFERRED | CONFIRMED | INFERRED | INFERRED | INFERRED |
| 12 Model selection | UNKNOWN | UNKNOWN | INFERRED | INFERRED | INFERRED |
| 13 File management | UNKNOWN | CONFIRMED | UNKNOWN | INFERRED | INFERRED |
| 14 Error handling | UNKNOWN | CONFIRMED | UNKNOWN | INFERRED | INFERRED |
| 15 User experience | UNKNOWN | CONFIRMED | UNKNOWN | INFERRED | INFERRED |

## Closing summary

The roadmap's Phase 1 asks for these totals at the end.

- Total features investigated: 15 modules, plus the first-run journey.
- Existence: all 15 modules are CONFIRMED to exist by the public pages, which is the matrix label column.
- Mechanism: the 75 hops above.

Totals: 11 CONFIRMED, 35 INFERRED, 29 UNKNOWN, over 75 chain hops (15 modules × 5 hops).

- **Confirmed:** the link from module to channel group for 10 modules (for row 8 only the renderer call is CONFIRMED; no main handler was found), and a page-level UI reference for 1 (drawings).
- **Inferred:** the sidecar route for 14 modules, the SolidWorks calls for 10, and the backend's role for drawing-to-part tasks, background tasks, knowledge and model choice.
- **Unknown:** 11 of the 15 UI hops, 11 of the 15 handler bodies, and the SolidWorks calls for building, macros and assemblies.

The weak layers are the UI and the handlers. Both need runtime evidence, which T6 (fuse) and T7 (skipped) did not produce.

## Missing features in our repository

cad-AI's state comes from `docs/cad-agent/CAD_AI_TRUTH_AUDIT.md` (its findings are cited by number) and from lines read this tick. Priorities are the roadmap's P0 to P3 table.

| Priority | Component | The reference (research) | cad-AI today | Loop that closes it |
|---|---|---|---|---|
| P0 | CAD connectivity | Finds a running SolidWorks, starts a runner, about 15 typed controller groups | Desktop bridge always succeeds and is never started (audit finding 6) | L9, which needs a licence; L3 first, on a free kernel |
| P0 | Document intelligence | Active document, selection and feature tree read as data | Feature tree is fixed demo data (`cad-AI/src/components/inspector/RightInspectorPanel.tsx#featureTree = INITIAL_FEATURE_TREE,`) | L3 T2 inspection, L4 T4, L9 T1 |
| P0 | CAD tool execution | Typed operations with records | Timers stand in for execution (audit finding 2) | L3 T4, L5 T3 |
| P0 | Verification engine | Effect report, document fingerprint, result record | Constants stand in for checks (audit finding 3) | L3 |
| P1 | Live AI agent | Prepare, send, streamed progress, questions, confirmation, cancel, rerun | Was one Gemini chat route, an approve card and timers; since L5 T5 and T7 the server's agent routes (`cad-AI/src/services/agent/routes.ts`) stream plan, records, questions and approvals, with cancel; the Gemini route was removed | L5 |
| P1 | Text-to-CAD | Live and as a background task | Model text returned unchecked, canned output without a key (audit finding 8) | L5, L6 T2 |
| P1 | STEP-to-CAD | Attach a STEP file, get a native part | No import; the STEP export is invalid (audit finding 5) | L3 T3, L6 T3 |
| P1 | Background tasks | Server-side tasks with updates, cancel, retry, download | Was a fixed demo list; since L6 T4 the dashboard reads the job engine's store every second (`cad-AI/src/components/views/BackgroundTasksView.tsx#const t = setInterval(load, 1000);`), cancels live jobs and downloads a COMPLETED job's verified STEP (`cad-AI/src/services/jobs/jobRoutes.ts#router.get('/api/jobs/:id/step'`). No retry: a failed job is submitted again | L6 |
| P2 | Drawing-to-CAD | Image or PDF to an editable part | Since L7 T2, a DXF of a rectangular plate with through holes along Z reads into a spec (`cad-AI/worker/drawing_read.py#def read_drawing(path):`) that the agent builds and the kernel verifies; SVG, PDF, images and other shapes are unsupported, and no upload exists in the UI | L7 T2 |
| P2 | CAD-to-Drawing | Wizard to a dimensioned drawing | Since L7 T1, three orthographic views and an isometric from the kernel's hidden-line removal, dimensioned from its inspection, as SVG, DXF and PDF (`cad-AI/worker/drawing.py#def draw(part, folder):`); no wizard or route in the UI | L7 T1 |
| P2 | Automation library | Saved macros with categories and sharing | Since L7 T4 and T8, versioned workflows of typed operations saved on disk (`cad-AI/src/services/automation/workflows.ts#{ flag: 'wx' }`) and replayed through the executor from the Automation Studio (`cad-AI/src/services/automation/routes.ts#router.post('/api/workflows/:id/replay'`); no categories, sharing or editor in the UI | L7 T4, T8 |
| P3 | Other CAD adapters | Listed as coming | None | No loop, as the roadmap advises |
| none | General knowledge | Document folders used as context | Not inspected | L7 T5 |
| none | Model selection | Six tiers, plan limits, usage | One model since L5 T5, which removed the panel's three Gemini choices (`cad-AI/src/services/model/modelClient.ts#export const MODEL = 'deepseek-flash';`) | No task; T10 decides |
| none | Chat history, accounts, file attachments | Sessions, sign-in and plans, attachment strip | No storage, no sign-in route in cad-AI/server.ts | No task; T10 decides |

## Priorities checked against the roadmap

- **P0 execution, verification and document intelligence come first.** L3 builds them on our own kernel, in the roadmap's order.
- **P1 and P2 follow in the roadmap's order.** P1 is L5 and L6, P2 is L7.
- **P3 has no loop.** This matches the roadmap's advice not to build every adapter at once.
- **One conflict: P0 CAD connectivity.** The roadmap's strongest recommendation is a real SolidWorks connection first. Our graph runs that last, in L9, outside the program target of L8, because no SolidWorks is installed (`docs/LOOP_GRAPH.md#Why the kernel comes before SolidWorks`). Recommendation: once a licence exists (L9 T0), the human moves L9 ahead of L8, so the program does not finish without it.
