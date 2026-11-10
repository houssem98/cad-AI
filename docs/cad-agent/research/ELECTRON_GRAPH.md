# Electron Graph

L1 T3, read 2026-11-08 from the installed reference app, version 2.12.1, archive C:\Users\unicentrale\AppData\Local\mecagent-app\app-2.12.1\resources\app.asar (sha256 87f00848…). REA analyze_javascript_application parsed the archive as inert text and never ran it. Raw output stays in `.rea/` (bundles under .rea/L1-T3/). Everything below is our own description. Channel names and the more distinctive endpoint paths are reference identifiers: 198 were added to `.rea/identifiers.txt` this tick and must never appear in product code (`docs/LOOP_CONVENTIONS.md#I7 Clean room.`).

| Run | Sources analysed | Result | Evidence |
|---|---|---|---|
| A | package.json, main entry, preload entry | complete parse of both files, partial semantic graph (node and unknown caps hit) | ev_1cf964a2a3b7e08313705375b800081bf2d47f7f3d292f84017db808eb154c8f |
| B | renderer HTML pages and eight lazy page chunks plus the root chunk | 7 files parsed; the root chunk and the 3D viewer chunk exhausted a 768 MiB analyzer heap | ev_019a63485ca937ba97a781da3ef4747c06b23d39909a142939942cf2319bcda5 |
| C | renderer root chunk alone (6.9 MB) | exhausted an 1800 MiB analyzer heap; nothing parsed | none: the run kept no record, and no .rea folder holds an evidence id for it |

The archive's own code is small: 131 entries under dist (125 files and 6 folders) plus package.json, beside 10,681 dependency entries under node_modules (both counts from the archive inventory saved in .rea/L1-T2/). Bounding the analysis to those files with source_paths is what made it fit; the whole-archive run needed more than the 1.09 GB evidence allowance a 4 GB REA server gets. Two unpacked native binaries of a keyboard and mouse hook library do not match the archive's integrity table (first recorded by the T3 inventory run, ev_00d6be69…, saved in .rea/L1-T2/); the analysis recorded them as untrusted and did not analyse them.

Labels: CONFIRMED means the static graph holds the fact (a literal, an import, a registration). INFERRED is our reading of purpose. UNKNOWN is what the static graph cannot show; T5 and T6 may resolve it. A static fact never proves the code runs.

## Modules

Process model, CONFIRMED by run A unless marked.

- **Main process.** One bundled entry, named by package.json main. It imports electron, the in-process .NET bridge package (electron-edge-js), a WebSocket client (ws), an HTTP client (axios) with multipart upload (form-data), zip handling (jszip), schema validation (zod), version comparison (semver), dotenv, electron-log, the Sentry crash reporter for Electron, and Node built-ins for child processes, sockets, TLS, crypto and the file system. CONFIRMED. The bridge import CONFIRMS that the shell loads T2's Edge.js bridge; that the shell calls the .NET sidecar in process through it stays INFERRED, because an import shows loading, not calls.
- **A worker script** beside the main entry and a shared storage chunk. The worker's name and the collection channels below suggest it scans and collects CAD files in the background. INFERRED.
- **Preload.** One entry exposes a single bridge object to the renderer with 223 members, grouped as agent, app, auth, cad, chat, collection, knowledge, macros, settings, tags, tasks, user, utilities, updates and similar. CONFIRMED. The renderer reaches the main process only through this object; no page chunk in run B made a network request of its own. INFERRED from the absence of request findings, which does not prove absence.
- **Renderer.** Two HTML pages: the main window and a separate STEP viewer page whose inline script was not analysed. CONFIRMED as files. Lazy page chunks exist for a tasks workspace, automations, public automations, a knowledge page, older chats, a CAD-to-drawing window, a 3D CAD viewer and settings. CONFIRMED as files; their role as pages is INFERRED from the names.
- **Renderer routes.** UNKNOWN. The router lives in the root chunk, which REA could not parse within 1800 MiB on this host (run C). The static route inventory of run B is empty.
- **Native add-ons.** Eight add-on nodes; the only one identified is a global keyboard and mouse hook library (uiohook-napi). CONFIRMED as a dependency; what it is used for is UNKNOWN.

## IPC channels

Run A found 355 IPC operations on 199 literal channels plus 2 built from expressions: 142 main-side handlers, 174 renderer sends and 39 renderer listeners. REA paired none of them to a handler with certainty, because the preload routes every call through one wrapper function; the direction below comes from each side's registrations. Renderer invokes, renderer listeners and main handlers are CONFIRMED per channel. A push from main is INFERRED from a renderer listener, since run A found no main-side send. The pairing is INFERRED.

| Direction | Channels | Meaning |
|---|---|---|
| renderer asks, main answers | 140 | request and response calls through the bridge |
| renderer asks, no main handler found | 30 | handler registered through code REA could not resolve; UNKNOWN |
| renderer listens, no main send found (a main push, INFERRED) | 27 | progress, status and state events |
| mixed or one-way renderer send | 3 | a toolbar button event and two channels used both ways |

The 200 rows include one channel key REA could not name. The groups below cover the 199 named ones.

Channel groups, purposes INFERRED from names:

| Group | Count | What it does |
|---|---|---|
| agent | 23 | the chat agent: prepare and send a request, stream state and updates, ask the user a question or a confirmation and receive the answer, cancel, rerun, inspect a run, list SolidWorks instances and choose one, upload the workspace, download an artifact |
| cad and SolidWorks | 25 | the SolidWorks link: initialise, reconnect, health check, diagnostics and its progress, read the active part and its feature tree as JSON, run or cancel a macro, place the window beside SolidWorks, find or reset the SolidWorks install, scan and index CAD files on disk, find related files, sync a dataset and report its progress, toggle data collection |
| tasks | 23 | background tasks: capabilities, create, submit, preview, list, cancel, retry, upload and drop files, choose the SolidWorks release, task update events, download results, open a result in SolidWorks |
| cad2drawing | 18 | the drawing wizard: projects, templates and examples, upload of part files, STEP preparation, submit, download, open in SolidWorks, monthly allowance |
| knowledge | 19 | the user's document library: folders, files, import, upload, rename, delete, progress, files attached to one chat session |
| macros and categories | 16 | saved automations: personal and public lists, save, clone, reorder, share with the company or by link, usage count |
| chat | 9 | chat sessions: list, open, rename, delete, archive, read turns |
| collection | 7 | a data-collection feature: status, enable, an account gate, list and read sessions, screenshot capture |
| auth and user | 14 | email login with two-factor, Microsoft login, sign-out event, terms, verification email, profile, usage profile, free-plan consent, analytics identity |
| part library | 2 | request a supplier part and get its CAD file address |
| app shell | 43 | settings, tags, window layout, navigation, notifications, compact view, a toolbar button, external links, file and image saves, chat-name and macro-result events, version and changelog, update download and install, WebSocket connect and status |

The collection group, the CAD-file scanner, the screenshot capture and the global input hook together describe an opt-in usage and CAD-data collection feature. INFERRED. Our product does not copy it: no ledger task names it, and the AI attack list forbids it (`docs/LOOP_CONVENTIONS.md#a user file sent to an external service without consent`).

## Hosts

- **Product analytics.** One third-party analytics ingest host (PostHog, US region) appears as a literal. CONFIRMED.
- **Crash reporting.** The Sentry Electron package is imported. CONFIRMED; its destination is UNKNOWN.
- **Loopback.** A literal points at a page on 127.0.0.1 port 8080. CONFIRMED as a literal; INFERRED to be a development or local viewer address.
- **Backend API.** The base address comes from a variable that the static graph does not resolve. UNKNOWN. Its paths are CONFIRMED as literals (37 endpoint candidates; 29 after leaving out four docs paths, a header name, a bare variable, the loopback page and the analytics host): token login and exchange, two-factor, logout and email verification in the style of a Laravel Sanctum backend (INFERRED); user profile and desktop session; chat sessions and archive; macros, categories and tags; tasks and their capabilities; knowledge capabilities; an intent-classification call for the agent; drawing projects, templates and allowance; a two-step chunked blob upload; a changelog; and a part-library service (TracePart) that returns CAD file URLs.
- **Realtime.** A WebSocket client plus links to a hosted realtime-channel service's authentication docs. INFERRED: task and agent updates arrive over an authenticated realtime channel. Host UNKNOWN.
- **Model providers.** No model provider host or SDK was found in the main, preload or page chunks. INFERRED: model calls happen behind the backend API, not in the app. The root chunk was not parsed, so this stays partly UNKNOWN.

## Feature map

Each row of `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md` mapped to the code areas above. CONFIRMED where a named channel group or page chunk exists; INFERRED where the link is our reading.

| Matrix row | Code area | Label |
|---|---|---|
| 1 CAD Agent | agent channels, chat channels, intent-classification endpoint | CONFIRMED |
| 2 CAD document context | cad channels that read the active part and pick a SolidWorks instance | CONFIRMED |
| 3 Feature tree | cad channel that returns the feature tree as JSON | CONFIRMED |
| 4 Text-to-CAD | agent channels; the build itself happens in the sidecar (T4) | INFERRED |
| 5 STEP-to-CAD | tasks channels and the STEP viewer page | INFERRED |
| 6 Assembly intelligence | agent channels and related-file search; no assembly-specific channel | INFERRED |
| 7 Drawing-to-CAD | tasks channels (task types come from the capabilities call) | INFERRED |
| 8 CAD-to-Drawing | cad2drawing channels and the drawing window page | CONFIRMED |
| 9 Macro generation | macros channels, macro run and cancel in the cad group, automations pages | CONFIRMED |
| 10 Background Tasks | tasks channels, task update events, tasks workspace page | CONFIRMED |
| 11 General Knowledge | knowledge channels and knowledge page | CONFIRMED |
| 12 Model selection | not found in main or preload; likely in the unparsed root chunk | UNKNOWN |
| 13 File management | knowledge session-file channels, task file drops, download channels | CONFIRMED |
| 14 Error handling | agent confirm and question channels, reconnect, health check, diagnostics | CONFIRMED |
| 15 User experience | window position and preset channels, compact view, workspace layout, update channels | CONFIRMED |
