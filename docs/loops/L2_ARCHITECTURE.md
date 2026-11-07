# L2 Architecture

Phase 2 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Target architecture". Needs L1. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Do not begin implementation until all design decisions are documented and their dependencies are understood.`

Deciding rule, fixed before T2 starts: T0 to T4 are ticked, `npm run gate` exits 0 with typecheck and tests inside it, and the human's signoff line (T5) is in the Journal.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and re-read the L1 research docs. Evidence: graph-lint exits 0.
- [ ] T1 (human) Stack. needs: T0. Decide, and so approve the listed dependencies (I9). (1) Shell: recommended Electron, React, TypeScript and Vite, because live CAD access needs a local desktop process; alternative Tauri. (2) First adapter: recommended build123d on OpenCascade in a Python 3.12 worker, free, headless and STEP-native, so geometry tests run inside the gate; the SolidWorks adapter follows in L9. Alternative: FreeCAD headless. (3) Model: recommended the Claude API, key in an environment variable. (4) Store: SQLite file. (5) Tests: Vitest, Playwright, pytest. (6) Model API spend cap per loop for evals. Evidence: the decision lines in the Journal.
- [ ] T2 Architecture docs. needs: T1. Write under docs/cad-agent/architecture: `docs/cad-agent/architecture/SYSTEM_ARCHITECTURE.md` (new), `docs/cad-agent/architecture/AGENT_ORCHESTRATION.md` (new), `docs/cad-agent/architecture/CAD_ADAPTERS.md` (new), `docs/cad-agent/architecture/DATABASE_DESIGN.md` (new), `docs/cad-agent/architecture/API_CONTRACTS.md` (new), `docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md` (new). Each subsystem: responsibility, interface, data contract, errors, tests; plus the agent state machine, job lifecycle and execution lifecycle. Each design choice cites the research row it answers. Evidence: graph-lint and clean-room-lint exit 0.
- [ ] T3 Operation protocol. needs: T2. Scaffold the chosen stack minimally and add one typed operation schema shared by TypeScript and Python (JSON Schema as the single source) carrying `docs/roadmap/MECAGENT_ROADMAP.md#Every CAD action must have:`. Extend `npm run gate` with typecheck, unit tests and pytest. Evidence: tests: a valid operation passes; a missing target, an unknown type, a missing unit and an extra field are each refused; `npm run gate` exits 0.
- [ ] T4 Independent check. needs: T3. A council on the architecture docs and the schema with the operations, records and adapters items of the attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T5 (human) Signoff. needs: T4. Evidence: the signoff line in the Journal.

## Journal
