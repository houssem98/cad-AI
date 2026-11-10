# Sidecar Protocol

L1 T4, read 2026-11-08 from the installed reference app, version 2.12.1, folder C:\Users\unicentrale\AppData\Local\mecagent-app\app-2.12.1\resources\win-x64. Four REA metadata reads (inspect_managed_members, summary detail), none of which loads or runs the code. No method bodies were decompiled. The records do carry IL-derived call edges (each with an IL offset and opcode) and each assembly's user-string literals; this doc quotes neither. Everything below is our own description. Type and member names are reference identifiers; distinctive ones are listed in `.rea/identifiers.txt` and must never appear in product code (`docs/LOOP_CONVENTIONS.md#I7 Clean room.`).

| Assembly (plain text, outside the repo) | Size | Types | Member refs | Evidence |
|---|---|---|---|---|
| MecAgent.SolidWorks.Protocol.dll | 80 KB | 39 | 129 | ev_30be335f7e3f91a9f2d2ab9d2d0d7d826931381158ec8522c3214460889413e5 |
| MecAgent.SolidWorks.Host.dll | 144 KB | 78 | 648 | ev_d5eaf260eebd2accf8f28906b0ec925efe0437d9e32676632541e83fcec93d49 |
| MecAgent.SolidWorks.Lifecycle.dll | 119 KB | 82 | 467 | ev_43b05a3f5842341f9fdb235a4dca367c512cd99d232b5dba20e328dc6eb4a10f |
| MecAgent.dll | 541 KB | 598 | 1633 | ev_2956b4f6c08910c43703ae8e483f4ba2b60cb188e3429e4a855dd45004923922 |

Labels: CONFIRMED means the name or reference exists in shipped metadata; INFERRED is our reading of its purpose; UNKNOWN is behaviour only a runtime capture (T6) can show.

## Two paths into SolidWorks

The main assembly holds two separate ways to act on a model. INFERRED from the member references, Main evidence.

1. **Typed tools.** About fifteen controller groups expose named actions with parameters: connect and read context, sketch, features, assembly, selection by path, parameter edits by path, measuring, materials, equations, drawings, documents and views, colour maps of faces and bodies, window placement, and a diagnostics report. This is a function-calling surface, close in shape to our typed operations (`docs/LOOP_CONVENTIONS.md#I6 Typed operations only.`).
2. **Code runs.** A run session prepares a code cell or a macro, statically reports its effects, runs it, and can stop it, all in a separate runner process attached to SolidWorks. The model writes code and the host compiles and runs it. Our product does not copy this path: I6 forbids running model-written code, and our macros are stored operation sequences.

## Messages

The shell and the runner exchange JSON messages; one wire type carries a JSON payload. CONFIRMED as type and field names, Protocol evidence; purposes INFERRED.

| Message | Fields (names only) | Purpose in our words |
|---|---|---|
| Ready | process id, runtime, SDK version, interop version, reference count, warm-up time | Runner announces it started and which SolidWorks API version it compiled against |
| Bind request / Bound | process id, install folder, staging folder / success, error, elapsed time, interop version | Attach the runner to one SolidWorks process |
| Run cell | code | Run one snippet against the open document |
| Run program | kind (macro or bundle), files, entry point, parameters, hash, cacheable | Run a multi-file program; a hash allows caching the compiled result |
| Compile / Compiled | files, apply transforms, include final code / success, errors (file, line, column, message), final code, time | Compile only, returning errors without running |
| Prepare cell, prepare macro / Prepared | code, parameters / id, kind, ready, failure, effect, time | Compile and analyse before running |
| Effect (inside Prepared) | read-only flag, findings (symbol, line, column, reason), unknown members, table revision | Static report of what the code would change; drives the ask-before-change prompt |
| Run prepared | prepared id, fingerprint | Run an approved snippet only if the document is still in the state it was checked against |
| Discard prepared | prepared id | Drop an approved snippet without running it |
| Fingerprint change, policy violation | document, what, before, after / list of changes | The document changed between check and run, so the run is refused |
| Progress request / Progress report | execution id / running, captured output, elapsed and busy time | Poll a long run |
| Cancel | delay before abort, reason (stop, timeout, hard cap, run ended) | Stop a run, with a grace period then a forced abort |
| Result | execution record: success, running, cancelled, stop reason, stage (compile, runtime, stopped), error | Final outcome of a run |
| Event | kind, detail, COM error code, classification, COM fault | Out-of-band faults from the CAD host |
| Dialog record | title, window class, opened and closed time, outcome, closed by user | SolidWorks dialogs that appeared during a run and how they ended |
| Shutdown | none | Stop the runner |

What this tells our design (INFERRED): the reference makes the run itself safe by checking first, approving, then running against a fingerprint, and by recording dialogs and COM faults. Our typed path gets the same guarantees more simply: validate the operation, confirm a consequential one, and refuse it if the document changed (`docs/roadmap/MECAGENT_ROADMAP.md#Every CAD action must have:`).

## SolidWorks API surface

Public, documented SolidWorks API members that the sidecar references, grouped by job. These are Dassault's published interfaces, not reference identifiers, and they guide L9. CONFIRMED as references in shipped metadata (Main and Lifecycle evidence); which calls run, and in what order, is UNKNOWN until T6.

| Job | Interfaces and members |
|---|---|
| Find and attach to a running SolidWorks | COM running object table: get the table, enumerate monikers, read display names, get the object; then ISldWorks RevisionNumber and VersionHistory |
| Open, list and close documents | ISldWorks OpenDoc6, GetOpenDocumentByName, GetDocuments, ActiveDoc, CloseDoc, DocumentVisible, CommandInProgress |
| Read the active document | IModelDoc2 GetTitle, GetPathName, GetType, GetConfigurationNames, ConfigurationManager, Extension, FeatureManager, SelectionManager, ActiveView, GetEquationMgr |
| Walk the feature tree | IModelDoc2 FirstFeature; IFeature GetNextFeature, GetFirstSubFeature, GetNextSubFeature, GetTypeName2, GetSpecificFeature2, IsSuppressed, Name, Visible |
| Read the selection | ISelectionMgr GetSelectedObjectCount2, GetSelectedObject6, GetSelectedObjectType3, GetSelectedObjectsComponent4; IEntity GetComponent |
| Assemblies | IAssemblyDoc GetComponents, EditPart2, EditAssembly, GetEditTarget, GetEditTargetComponent, ResolveAllLightWeightComponents; IComponent2 GetChildren, GetModelDoc2, GetPathName, GetSuppression, Name2, Select2, FirstFeature |
| Properties, configurations, equations | ICustomPropertyManager Get6, GetNames, GetType2, IsCustomPropertyEditable; IConfigurationManager ActiveConfiguration; IEquationMgr GetCount, Equation, GlobalVariable, Value |
| Drawings | IDrawingDoc GetSheetNames, Sheet; ISheet GetViews; IView Name |
| Save and performance | IModelDocExtension SaveAs; IModelView EnableGraphicsUpdate; IFeatureManager EnableFeatureTree (both are switched off during bulk work, INFERRED) |
| Windows | ISldWorks Frame; IFrame GetHWnd, ModelWindows; IModelWindow ModelDoc |

The feature-creating calls (sketch entities, extrude, cut, revolve, fillet, chamfer, hole wizard) do not appear as direct member references under these interfaces in what we paged. INFERRED: they are reached through the controller layer by routes this summary does not resolve, or are compiled into code-run snippets at run time. L9 takes them from the public SolidWorks API documentation, not from the reference.

## Lifecycle

INFERRED from member references and protocol fields unless marked.

- **Discover.** The host lists SolidWorks processes with their id, title, start time, whether each has a window, responds and can be attached, and lets the user choose one, remembering the choice. Process inspection is CONFIRMED by references to the .NET process API (Host and Lifecycle evidence).
- **Attach.** It finds the running instance through the COM running object table (CONFIRMED, Lifecycle evidence) and reads its revision, so that it can pick matching interop assemblies. A resolver installs the interop path for that version.
- **Launch the runner.** The host starts a separate runner process from a configured path and a staging folder, sends a bind message, then waits for a ready message (CONFIRMED: process-start references and the bind, bound and ready messages). The SolidWorks API work happens in that runner, not in the Electron process.
- **Exclusive use.** One run at a time holds a gate on an instance; a second caller gets a busy error naming the holder, its purpose and since when (CONFIRMED as type names in Main evidence).
- **Health.** Progress polling reports busy time; COM faults and SolidWorks dialogs come back as events and dialog records; UI Automation references (Lifecycle evidence) suggest dialogs are watched from outside SolidWorks.
- **Shut down.** Cancel stops a run with a grace period, then a forced abort; a shutdown message ends the runner; COM objects are released explicitly (CONFIRMED as a ReleaseComObject reference).
- UNKNOWN until T6: the real order of these steps, timeouts, and what happens when SolidWorks is busy or modal.
