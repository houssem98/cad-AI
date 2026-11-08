# User Journeys

L1 T8, written 2026-11-08. This file describes how a user moves through each module of the reference, in our own words. It has two sources only: the public homepage and user guide, as summarised in `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md` (T1), and the static REA reads in `docs/cad-agent/research/ELECTRON_GRAPH.md` (T3), `docs/cad-agent/research/SIDECAR_PROTOCOL.md` (T4) and the matrix's chain cells (T5). There is no runtime layer: T6 runtime capture was skipped because a fuse blocks it, and the human skipped the T7 walkthrough with 0 runs (`docs/cad-agent/research/OBSERVATION_LOG.md`). So no matrix label was upgraded in T8.

Each step carries a label and its source: "public" is the public pages, "static" is the REA reads of the shipped app. CONFIRMED means the source states it or the shipped code holds it, INFERRED is our reading, and UNKNOWN is what only running the app would show. Static facts prove that code exists, never that a step runs.

## 0. First run and connection

1. The user installs a Windows desktop app per user; it updates itself. CONFIRMED, static (T2).
2. They sign in with email and password plus two-factor, or with a Microsoft account, and accept terms. CONFIRMED that these flows exist, static (T3); the screens are UNKNOWN.
3. They choose their CAD software in settings; SolidWorks 2024 to 2026 is the only native target. CONFIRMED, public and static.
4. The app looks for running SolidWorks sessions and lets the user pick one. INFERRED, static (T3 instance channels, T4 discovery and attach).
5. The header shows whether SolidWorks and the agent are connected. CONFIRMED, public.
6. Without SolidWorks the user is sent to background tasks with STEP output. CONFIRMED, public.

## 1. CAD Agent

1. The user types a request with dimensions, optionally picks a model, and sends it. CONFIRMED, public.
2. The app prepares the request, sends it, and streams progress back as a task list. CONFIRMED that prepare, send and progress updates exist, static (T5); the progress list itself is public.
3. When a step would change the model, the user is asked to confirm unless auto-accept is on. CONFIRMED, public; the confirm request and its answer are separate messages, static (T5).
4. The agent can also ask the user a question and wait for the answer. CONFIRMED that it exists, static (T3); when it asks is UNKNOWN.
5. The user can cancel a run or rerun it. CONFIRMED that it exists, static (T3).
6. The result is changes in the open SolidWorks session plus a chat answer, with macro cards when relevant. CONFIRMED, public. How the agent checks its own result is UNKNOWN.

## 2. CAD document context

1. The user opens a part or assembly in SolidWorks. CONFIRMED, public.
2. The header shows the active document's name, with a reload control for when it is stale. CONFIRMED, public.
3. The app reads the active part's details through its bridge and does extra work on the reply. CONFIRMED, static (T5).
4. Prompts can refer to the current selection, such as a face or components. CONFIRMED, public; how the selection is read is UNKNOWN.

## 3. Feature tree

1. Parts the agent builds or rebuilds arrive as native parts with a feature tree. CONFIRMED, public.
2. The app can read the open part's feature tree as structured data. CONFIRMED, static (T5).
3. The user can ask for features to be renamed from their geometry. CONFIRMED, public; any other editing of the tree is not described.

## 4. Text-to-CAD

1. The user describes a part with dimensions and features, or attaches a spec sheet as a PDF or photo. CONFIRMED, public.
2. Live: the agent models it feature by feature in the open session, with the progress list. CONFIRMED, public.
3. Background: the same request runs as a task and returns a STEP file, with no SolidWorks needed. CONFIRMED, public.
4. Text that is ambiguous or has no dimensions is a stated limit. CONFIRMED, public; whether the agent then asks or refuses is UNKNOWN.

## 5. STEP-to-CAD

1. The user attaches a supplier STEP file and asks for an editable native part. CONFIRMED, public.
2. The file travels to the agent through a workspace upload. INFERRED, static (T5).
3. The result is a native part with a feature tree. CONFIRMED, public; how the rebuild is checked is UNKNOWN.

## 6. Assembly intelligence

1. With an assembly open, the user asks for a new part designed in its context and mated to it. CONFIRMED, public.
2. The same mode covers exploded views, equations and global variables, configurations, motion studies, materials on every part with mass update, and renaming that keeps references. CONFIRMED, public.
3. The app can search for related CAD files, and the sidecar has an assembly controller. CONFIRMED that both exist, static (T3, T4); that this module uses them is INFERRED.

## 7. Drawing-to-CAD

1. The user switches to background tasks, picks the drawing-to-part task, and uploads a PNG, JPEG or PDF drawing. CONFIRMED, public; the size and page limits are unverified.
2. The task shows in a list with its status and an activity log. CONFIRMED, public.
3. When it is done, the user downloads an editable part for SolidWorks or a STEP file for other CAD. CONFIRMED, public.
4. A task stuck on pending is handled by reading the log, cancelling and resubmitting. Unverified, public.

## 8. CAD-to-Drawing

1. Either the user starts a background task, or runs a four-step project wizard: drawing standard, units and sheets; datums and critical surfaces picked on the 3D model; then material, process and finish per part. CONFIRMED, public.
2. The output is a dimensioned drawing with views, sections and dimensions on the smallest sheet that fits. CONFIRMED, public; the sheet rule is unverified.
3. The app manages drawing projects, templates and examples, part uploads and a monthly allowance, and has its own drawing window. CONFIRMED, static (T3).
4. The guide warns that quality depends on a fully defined model and that tolerances need review before release. CONFIRMED, public.

## 9. Macro generation

1. The user picks macro mode, or just asks, and the agent writes a macro in about half a minute to a few minutes. CONFIRMED, public.
2. A macro card offers run and save to favourites. While it runs, the run button becomes a stop button, and a status line reports success. CONFIRMED, public.
3. Saved macros live in a library with categories, reordering and sharing with the company or by link. CONFIRMED, static (T3).
4. The sidecar runs a macro as a program in its separate runner and can cancel it. CONFIRMED as message types, static (T4); the link to this button is INFERRED.
5. On an error, the user pastes it back into chat for a fix. Unverified, public.

## 10. Background Tasks

1. The user switches the header to background mode, picks a task type, attaches files and submits. CONFIRMED, public.
2. They can leave; the task list shows each task's status, an activity log, a cancel action and a running count. CONFIRMED, public; that tasks continue after the app closes is unverified.
3. The app receives task updates pushed from its main process and offers retry and download. CONFIRMED, static (T3).
4. Results such as parts, images and STEP files are downloaded and can be opened in SolidWorks; outputs expire on a shown date. CONFIRMED that downloads and open-in-SolidWorks exist, static (T3); the expiry is unverified.
5. The work itself runs on the vendor's backend. INFERRED, static (T3 task paths).

## 11. General Knowledge

1. The user adds a folder of their own documents, such as standards, materials or supplier data. CONFIRMED, public.
2. Before sending, they pick that folder or all folders, or turn on background knowledge for every request. CONFIRMED, public.
3. Chips above the chat show how many documents are in context. CONFIRMED, public.
4. The app has folder, file, import, upload and progress actions, plus files attached to a single chat. CONFIRMED, static (T3).

## 12. Model selection

1. The user picks a model tier from a selector next to the send button. CONFIRMED, public.
2. Six tiers run from a top tier down to a fast one; a middle-high tier is the default; the free plan gets two middle tiers. CONFIRMED, public.
3. Remaining runs per model show in account settings. CONFIRMED, public.
4. Where the choice travels is UNKNOWN: nothing in the main or preload code names it, and the renderer root chunk could not be parsed (T3, T5). INFERRED that it rides inside the agent request to the backend.

## 13. File management

1. The user attaches files through a plus menu, or drops them, and they wait in a strip above the request bar. CONFIRMED, public; the drop is CONFIRMED static (T5).
2. Accepted types are spec sheets, PDFs, drawings, photos and STEP files. CONFIRMED, public.
3. Files attached to a chat can be removed one by one or as a group. CONFIRMED, static (T3).
4. Size limits match rows 7 and 11 (unverified); no storage quota is described. Public.

## 14. Error handling

1. A step that would change the model asks first. CONFIRMED, public.
2. The app can reconnect to SolidWorks, run a health check and run diagnostics with progress. CONFIRMED, static (T3).
3. The sidecar reports CAD faults and dialogs that SolidWorks opened during a run. CONFIRMED as message types, static (T4).
4. Troubleshooting covers a disconnected CAD host, sign-in loops, lost two-factor access, stuck tasks and macro version mismatch, with fixes such as refreshing, restarting SolidWorks, running as administrator and allowing the app through the firewall. Unverified, public.
5. The error texts the user actually sees are UNKNOWN.

## 15. User experience

1. A standalone window sits next to SolidWorks, with presets for its position and a compact view. CONFIRMED, public and static (T3).
2. The side panel holds new chat, knowledge, automations, the macro library, past chats and background tasks. CONFIRMED, public.
3. The header holds the connection dot, the live or background mode switch, the active document, reload, usage and the profile. CONFIRMED, public.
4. Settings cover theme, language, CAD software, auto-accept, account and sound. Dark and light themes exist. CONFIRMED, public.

## Runtime questions these journeys leave open

T9 collects these with the other UNKNOWNs.

- The real screens, routes and their order, and every error text the user sees.
- When the agent asks a question instead of building, and what it does with missing dimensions.
- How the agent checks its own result, and how a STEP rebuild is checked.
- Where the model choice travels, and how usage is counted.
- How the main process hands a request to the sidecar, and which SolidWorks calls run, in what order and with what timeouts.
