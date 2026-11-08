# Parity Spec

L1 T10, written 2026-11-08. This is the finite list of observable behaviours our product must match. L8 T2 grades it: each claim gets either a passing test name or UNSUPPORTED with the reason. Claims describe behaviour only, never the reference's internals or identifiers (`docs/LOOP_CONVENTIONS.md#I7 Clean room.`).

Each line names its source row in `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md` and the ledger task that owns it. A behaviour is listed only when an existing ledger task owns it. Behaviours the reference shows that no task owns are listed under "Not in parity", for the human to promote by adding a task.

Every claim rests on the reference's public pages (T1). The static reads (T3 to T5) only confirm that the features exist. No claim was observed at run time, because T6 and T7 were skipped (`docs/cad-agent/research/OBSERVATION_LOG.md`).

## Claims

- P1 A plain-language request for a part, with its dimensions, produces a part whose geometry passes the CAD engine's own checks · source: matrix row 1 CAD Agent · owner: L5/T6
- P2 While the agent works, the chat shows its plan and each step's progress, and ends with the result of every step · source: matrix row 1 CAD Agent · owner: L5/T5
- P3 The agent's final report states only what the CAD engine confirmed, and a failed step ends the request as failed with no success message · source: matrix row 1 CAD Agent · owner: L5/T4
- P4 With SolidWorks open, a chat request builds an editable part in the open session, saves it as a native file and exports a STEP file that re-imports correctly · source: matrix row 1 CAD Agent · owner: L9/T3
- P5 The app tells which SolidWorks document is active and what kind it is: part, assembly, drawing, or none · source: matrix row 2 CAD document context · owner: L9/T1
- P6 The feature tree panel lists the part's features as the CAD engine reports them, and the properties panel shows its volume and size · source: matrix row 3 Feature tree · owner: L4/T4
- P7 Changing a dimension of an existing feature rebuilds the part to the correct new geometry · source: matrix row 3 Feature tree · owner: L3/T2
- P8 A request that lacks a needed dimension gets a question back instead of a part built on a guess · source: matrix row 4 Text-to-CAD · owner: L5/T2
- P9 A text request can run as a background task that returns a checked STEP file with no CAD application open · source: matrix row 4 Text-to-CAD · owner: L6/T2
- P10 Parts export to STEP, and the exported file re-imports with the same volume and size · source: matrix row 4 Text-to-CAD · owner: L3/T3
- P11 An attached STEP file of a prismatic part is rebuilt as an editable part with the same volume and size, and a shape the product cannot rebuild is reported as unsupported · source: matrix row 5 STEP-to-CAD · owner: L6/T3
- P12 Several parts can be placed and mated in one document, with an interference check and a bill of materials · source: matrix row 6 Assembly intelligence · owner: L7/T3
- P13 A material can be assigned to a part · source: matrix row 6 Assembly intelligence · owner: L3/T2
- P14 A drawing supplied as an image or PDF becomes an editable part · source: matrix row 7 Drawing-to-CAD · owner: L7/T2
- P15 A part produces a drawing with standard views whose every dimension equals the model's · source: matrix row 8 CAD-to-Drawing · owner: L7/T1
- P16 A repeated job can be saved as a reusable automation and replayed later with new parameters, producing checked geometry · source: matrix row 9 Macro generation · owner: L7/T4
- P17 Submitted tasks appear in a list with live progress, and each can be cancelled or have its result downloaded · source: matrix row 10 Background Tasks · owner: L6/T4
- P18 A task survives an app restart: it either resumes or ends as failed, never stays stuck as running, and a reconnecting window sees the same status · source: matrix row 10 Background Tasks · owner: L6/T1
- P19 The user's own documents can be added as a knowledge source, and answers cite the passage they used · source: matrix row 11 General Knowledge · owner: L7/T5
- P20 A step that would delete or overwrite existing work waits for the user's confirmation before it runs · source: matrix row 14 Error handling · owner: L5/T3
- P21 A step that fails or runs past its time limit is stopped and logged with its error, so the user can see what went wrong · source: matrix row 14 Error handling · owner: L3/T4
- P22 The app checks whether SolidWorks is reachable and reports the connection state · source: matrix row 14 Error handling · owner: L9/T1
- P23 A desktop window offers chat, a 3D view, the feature tree, properties, tasks and history, and each panel shows distinct loading, empty, error, running, completed and cancelled states · source: matrix row 15 User experience · owner: L4/T2
- P24 The current part is shown in an interactive 3D view that can be orbited, panned and zoomed · source: matrix row 15 User experience · owner: L4/T3
- P25 The product installs and launches as a desktop application on Windows · source: matrix row 15 User experience · owner: L8/T4

## Not in parity

The reference shows these behaviours, but no ledger task owns them. Adding a task promotes a line into the claims above. Leaving them out is a decision, and L8 reports them as not matched.

- Choosing between model tiers, with plan limits and usage counts (row 12).
- Attaching arbitrary files to a chat request through an attachment strip (row 13).
- Saved chat history: listing, renaming and archiving past chats (row 15).
- Acting on the user's current selection in the CAD model, and reloading a stale document (row 2).
- Renaming features from their geometry (row 3).
- Exploded views, equations and global variables, configurations, motion studies and mass update (row 6).
- The drawing wizard: standard, units, sheets, datums, and per-part material, process and finish (row 8).
- Running and stopping a macro from a card, and saving it to favourites (row 9).
- Cancelling or rerunning a live agent request from the chat (row 1).
- Retrying a task, and output expiry dates (row 10).
- Settings for theme, language, CAD software, auto-accept and sound, and docking the window beside SolidWorks (row 15).
- Accounts, sign-in with two-factor, and plans (cross-cutting).
- Drawing projects in a web app (cross-cutting).
