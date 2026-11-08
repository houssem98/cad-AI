# MECHFORGE AI — WORLD-CLASS COMPETITIVE ROADMAP UPGRADE

Act as a principal CAD software architect, mechanical engineering automation specialist, senior AI systems engineer, enterprise security architect and rigorous software auditor.

Repository:
https://github.com/houssem98/cad-AI

Product:
MechForge AI — an independent AI Mechanical Engineering Platform.

Competitive benchmarks:
- MecAgent
- Zoo / Zookeeper
- Adam
- LEO AI
- DraftAid
- SOLIDWORKS
- CATIA V5
- Siemens NX
- Autodesk Fusion
- Onshape

MISSION:

Transform the existing project into a credible, technically differentiated AI CAD platform capable of competing with the above products.

Do not simply add more UI screens.

The primary objective is to build a system that can understand engineering requirements, execute operations in real CAD software, inspect the resulting native model and independently verify the result.

==================================================
1. START WITH A COMPLETE REPOSITORY AUDIT
==================================================

Inspect the complete repository.

Read:
- README.md
- package.json
- server.ts
- src/App.tsx
- src/components/**
- src/data/**
- src/types/**
- all existing API routes
- configuration
- integration code
- tests
- build and deployment configuration

Create a complete implementation inventory.

For every capability classify it as:

A. Implemented and tested
B. Implemented but untested
C. Partially implemented
D. Simulated or mock
E. UI only
F. Not implemented
G. Blocked by an external dependency

Explicitly investigate the following known concerns:

- Chat success is currently not proof of CAD execution.
- Parameter updates affect frontend state and preview geometry.
- Text-to-CAD has hardcoded demonstration behavior.
- Verification screens contain preloaded results.
- Background tasks need durable execution.
- Automation Studio needs real graph execution.
- CAD integration cards need actual connection evidence.
- FEA and geometric verification claims need real implementation evidence.
- Voice and Gemini model identifiers need runtime validation.

Do not assume README claims are true.

Create:

docs/roadmap/00_REPOSITORY_TRUTH_AUDIT.md

==================================================
2. DEFINE THE PRODUCT ARCHITECTURE
==================================================

Create a modular platform with:

- Web engineering workspace.
- Desktop companion.
- API gateway.
- Authentication and authorization.
- Agent supervisor.
- Engineering requirement engine.
- Parametric CAD planning engine.
- Typed CAD operation protocol.
- CAD adapter SDK.
- Local desktop bridge.
- Native CAD execution service.
- Independent verification service.
- Durable background workers.
- Engineering knowledge service.
- Artifact storage.
- Observability platform.

Create architecture diagrams and document trust boundaries.

Do not let the LLM execute arbitrary scripts directly.

==================================================
3. BUILD THE DESKTOP CAD COMPANION
==================================================

The browser application alone is not a native CAD integration.

Design and implement a secure desktop companion.

Requirements:

- Local CAD discovery.
- Secure application pairing.
- Session management.
- Active document inspection.
- CAD application version detection.
- Adapter health checks.
- Capability discovery.
- Typed operation communication.
- Operation cancellation where supported.
- Execution result reporting.
- File synchronization.
- Connection recovery.

Investigate supported technologies for Windows and the actual installed CAD versions.

Do not invent API capabilities.

==================================================
4. CREATE A CAD ADAPTER SDK
==================================================

Define common contracts for:

- Connection.
- Application discovery.
- Document inspection.
- Feature tree inspection.
- Sketch creation.
- Constraint creation.
- Extrusion.
- Revolve.
- Hole features.
- Fillets and chamfers.
- Reference geometry.
- Assembly inspection.
- Drawing creation.
- Save.
- Export.
- Verification.

Every adapter must expose a capability manifest.

Implement SOLIDWORKS first.

Implement CATIA V5 second.

Design adapters for future Fusion, NX, Inventor and Onshape support.

Do not claim identical capabilities across CAD systems.

==================================================
5. BUILD A PARAMETRIC CAD INTELLIGENCE ENGINE
==================================================

Create a typed intermediate representation for CAD operations.

Convert:

Natural-language requirement
→ engineering specification
→ parameters and constraints
→ feature dependency graph
→ CAD operation plan
→ validation
→ approval
→ native CAD execution.

Support explicit units, coordinate systems, dimensions, constraints, feature dependencies and error conditions.

Implement deterministic validation before execution.

Never silently invent missing dimensions.

==================================================
6. BUILD THE AGENT ORCHESTRATION SYSTEM
==================================================

Implement a bounded hierarchical agent architecture.

Specialists:

- Requirement understanding.
- CAD planning.
- CAD execution.
- Drawing interpretation.
- Assembly intelligence.
- Engineering knowledge.
- Verification.
- Recovery.

Each graph must have:

- Typed state.
- Explicit transitions.
- Maximum iterations.
- Timeouts.
- Retry policies.
- Idempotency.
- Persistent checkpoints.
- Human approval gates.
- Failure handling.
- Execution tracing.

Do not add agents without measurable benefit.

==================================================
7. BUILD REAL NATIVE CAD EXECUTION
==================================================

First target: SOLIDWORKS.

Create a complete vertical workflow:

1. Connect to actual SolidWorks.
2. Inspect an active document.
3. Create a test part.
4. Create sketches.
5. Apply constraints.
6. Create features.
7. Rebuild.
8. Inspect feature tree.
9. Inspect geometry.
10. Save native file.
11. Export STEP.
12. Reopen the exported file.
13. Verify dimensions and geometry.

Create integration tests using non-confidential sample documents.

Do not replace actual CAD operations with Three.js geometry updates.

The 3D browser preview must remain separate from native CAD execution.

==================================================
8. BUILD INDEPENDENT VERIFICATION
==================================================

Create an independent verification subsystem.

Implement appropriate checks for:

- Document integrity.
- Solid validity.
- Topology.
- Boundary conditions.
- Connected components.
- Dimensions.
- Volume and surface area.
- Feature regeneration.
- Assembly constraints.
- Interference.
- Drawing consistency.
- Export integrity.

Use actual CAD kernel capabilities or a separately validated geometry kernel.

Do not claim that one Euler characteristic equation proves all geometry is valid.

Every verification result must include:

- Check identifier.
- Expected value.
- Actual value.
- Tolerance.
- Result.
- Source.
- CAD document version.
- Timestamp.
- Evidence.

The AI agent must never assign its own verification result.

==================================================
9. COMPLETE ENGINEERING WORKFLOWS
==================================================

Implement in this order:

A. Text-to-CAD.
B. Drawing-to-CAD.
C. CAD-to-Drawing.
D. STEP import and reconstruction.
E. Assembly intelligence.
F. Engineering change comparison.
G. Reverse engineering.
H. Manufacturing intelligence.
I. Simulation integration.
J. Engineering knowledge.

For every module distinguish:
- Native CAD operation.
- External solver operation.
- AI interpretation.
- Visualization.
- Simulated functionality.

==================================================
10. BUILD A REAL AUTOMATION PLATFORM
==================================================

Replace the hardcoded workflow demonstration with a reusable graph execution engine.

Support:

- Triggers.
- Requirement extraction.
- CAD inspection.
- CAD execution.
- Conditions.
- Approval.
- Verification.
- Exports.
- Notifications.
- Background execution.

Implement durable state, task ownership, retry handling, cancellation, logs and artifacts.

Build a versioned CAD macro library.

Support testing and reuse of approved workflows.

==================================================
11. ENTERPRISE PLATFORM
==================================================

Implement:

- Multi-tenancy.
- RBAC.
- Organization management.
- Team management.
- Project permissions.
- CAD file permissions.
- Audit logs.
- Approval policies.
- Data retention.
- Secure API access.
- Integration management.
- Usage monitoring.

Investigate security risks in existing API and WebSocket routes.

==================================================
12. PRODUCT UX
==================================================

Preserve the current industrial graphite design system.

Improve it into two complementary experiences:

DESKTOP COMPANION:
- Compact MecAgent-inspired CAD assistant.
- Active CAD connection.
- Conversation.
- Execution plan.
- Approvals.
- Operation activity.
- Document context.

WEB ENGINEERING WORKSPACE:
- Projects.
- CAD workspace.
- Engineering copilot.
- Drawing workflows.
- Assembly intelligence.
- Background tasks.
- Automation library.
- Knowledge hub.
- Verification.
- Enterprise administration.

Do not sacrifice functional engineering capabilities for visual polish.

==================================================
13. EVALUATION AND BENCHMARKING
==================================================

Create a reproducible benchmark suite.

Test identical tasks against available competitor products where access permits.

Measure:

- Requirement understanding.
- Planning accuracy.
- CAD execution success.
- Geometry correctness.
- Feature tree correctness.
- Dimension accuracy.
- Recovery success.
- Verification quality.
- Native export validity.
- Latency.
- Cost.
- Human intervention.

Never fabricate competitor performance.

==================================================
14. IMPLEMENTATION SEQUENCE
==================================================

Execute in these programs:

P0 — Repository audit.
P1 — Architecture and design contracts.
P2 — Desktop companion and adapter foundation.
P3 — Parametric CAD intelligence.
P4 — Agent orchestration.
P5 — Real SOLIDWORKS integration.
P6 — Independent verification.
P7 — CATIA V5 integration.
P8 — Drawing and document intelligence.
P9 — Assembly and manufacturing intelligence.
P10 — Automation and durable background jobs.
P11 — Enterprise governance.
P12 — Evaluation and production readiness.

Each program requires:

- Design document.
- Implementation.
- Unit tests.
- Integration tests.
- End-to-end tests where applicable.
- Security review where applicable.
- Performance review.
- Documentation.
- Acceptance criteria.
- Evidence.

Do not move to the next critical program if the previous program's acceptance criteria have not passed.

==================================================
15. FIRST IMPLEMENTATION PRIORITY
==================================================

Do not start by adding new dashboard cards or decorative UI.

Start by fixing the false-success problem.

Establish a strict execution lifecycle:

REQUESTED
→ UNDERSTOOD
→ PLANNED
→ VALIDATED
→ AWAITING_APPROVAL
→ EXECUTING
→ EXECUTED
→ VERIFYING
→ VERIFIED
→ COMPLETED

Failure states:

- REJECTED.
- BLOCKED.
- FAILED.
- VERIFICATION_FAILED.
- CANCELLED.
- TIMED_OUT.

The UI must only show completion when actual execution and required verification have succeeded.

If the CAD bridge is unavailable, explicitly report that execution did not happen.

==================================================
16. REQUIRED DOCUMENTATION
==================================================

Maintain:

docs/roadmap/00_REPOSITORY_TRUTH_AUDIT.md
docs/roadmap/01_PRODUCT_GAP_ANALYSIS.md
docs/architecture/SYSTEM_ARCHITECTURE.md
docs/architecture/DESKTOP_COMPANION.md
docs/architecture/CAD_ADAPTER_SDK.md
docs/architecture/CAD_OPERATION_IR.md
docs/architecture/AGENT_ORCHESTRATION.md
docs/architecture/VERIFICATION_ENGINE.md
docs/architecture/BACKGROUND_EXECUTION.md
docs/architecture/SECURITY_MODEL.md
docs/benchmarks/CAD_EVALUATION_PLAN.md
docs/roadmap/IMPLEMENTATION_TRACKER.md
docs/reports/FINAL_IMPLEMENTATION_REPORT.md

==================================================
FINAL INSTRUCTIONS
==================================================

Work from the actual code.

Preserve existing working functionality.

Do not perform a blind rewrite.

Do not fabricate test results.

Do not claim that a CAD integration works without a real application test.

Do not label simulated geometry as native CAD geometry.

Do not label AI-generated assumptions as verified engineering facts.

Create the complete roadmap and implementation tracker first.

Then execute the highest-priority work incrementally.

The goal is a reliable, independently verifiable AI mechanical engineering platform—not a collection of impressive-looking demonstration screens.