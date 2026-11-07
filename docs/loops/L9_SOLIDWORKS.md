# L9 SolidWorks

The roadmap's first milestone on the reference's own CAD host. Needs L5. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Export STEP and validate the exported file.`

Deciding rule, fixed before T1 starts: T0 to T4 are ticked, `npm run test:sw` exits 0 on a machine with a live SolidWorks session, `npm run gate` exits 0, and the human's signoff line (T5) is in the Journal.

## Current state (read 2026-11-07)

- No SolidWorks on this machine: `docs/loops/L0_BASELINE.md#No CAD software`. Live tests cannot run inside the gate, so they live in a separate `npm run test:sw` script whose output the tick quotes.

## Tasks

- [ ] T0 (human) Install. needs: none. A licensed SolidWorks 2024, 2025 or 2026 with its API SDK on this machine, or "declined", which leaves this loop open and idle. Evidence: the decision line and `reg query "HKLM\SOFTWARE\SolidWorks"` output in the Journal.
- [ ] T1 COM bridge. needs: T0. Our own .NET sidecar speaking the L2 operation protocol over stdio JSON: connect, health check, find the running session, classify the active document (part, assembly, drawing, empty, unsupported). Evidence: `npm run test:sw` covers each document kind and exits 0, output quoted.
- [ ] T2 Contract. needs: T1. The L3 contract suite passes against the SolidWorks adapter; what it lacks is declared unsupported. Evidence: `npm run test:sw` exits 0, output quoted.
- [ ] T3 Milestone 1. needs: T2. The roadmap's demonstration (`docs/roadmap/MECAGENT_ROADMAP.md#Your first demonstration should be:`) end to end through the agent: blank part, enclosure request, editable feature tree, saved native file, STEP export, re-import validated. Evidence: the milestone test in `npm run test:sw` exits 0, output quoted.
- [ ] T4 Independent check. needs: T3. A council with the geometry, operations and adapters items of the attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T5 (human) Signoff. needs: T4. The human watches T3 run once in SolidWorks. Evidence: the signoff line in the Journal.

## Journal
