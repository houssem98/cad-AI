
how can i use https://github.com/morluto/rea  to rebuils the same exact  as https://mecagent.com/ in claude code


Worked for 21s
You can use REA (Reverse Engineer Anything) with Claude Code to investigate MecAgent, understand its observable functionality, and build your own CAD AI agent with a similar product experience.

However, there is an important distinction:

REA helps Claude investigate software, trace application behavior, inspect code and collect technical evidence.

MecAgent is an AI CAD copilot that connects to CAD software, understands the active document, executes modeling operations and supports background CAD tasks.

Claude Code uses the findings to implement your own application.

REA is not an automatic website or application cloning tool. It will not magically recover MecAgent's private source code, internal prompts, proprietary algorithms or backend architecture.

The right objective is to reproduce the observable capabilities and user experience with your own implementation, rather than copy proprietary internals.

1. Understand exactly what you are rebuilding
I inspected MecAgent's website and its user guide. It is considerably more than a chatbot with a 3D viewer.

MecAgent - AI CAD Copilot

2026: 24 Hours with a Mechanical Engineer Using AI - MecAgent - AI CAD Sofware Copilot

2026: 24 Hours with a Mechanical Engineer Using AI - MecAgent - AI CAD Sofware Copilot

MecAgent has two central operating modes:

Module

What your implementation needs

Live CAD Agent

Interact with the currently open CAD document

Background CAD Tasks

Execute longer jobs asynchronously

Text-to-CAD

Generate geometry from engineering specifications

STEP-to-CAD

Import and create editable parametric models

Drawing-to-CAD

Reconstruct models from engineering drawings

CAD-to-Drawing

Generate technical drawings from models

Assembly intelligence

Add, modify and organize assembly components

Materials and equations

Modify engineering properties and parameters

Macro automation

Convert repetitive work into reusable workflows

General Knowledge

Give the agent access to engineering documentation

Verification

Inspect geometry, feature trees and operation results

These are documented product capabilities, not assumptions about MecAgent's private implementation. 

MecAgent
+1

MecAgent's documented integrations include SolidWorks, Inventor, CATIA V5, Fusion 360, Siemens NX, Solid Edge, Onshape and PTC Creo. 

MecAgent

2. Install REA into Claude Code
Recommended installation
Open a terminal outside your project and make sure you have a supported Node.js version.

The current REA repository documents this installation route:

npx rea-agents setup

Choose Claude Code when prompted, review the proposed configuration changes, approve them and restart Claude Code.

Alternatively, install its Claude Code plugin:

/plugin marketplace add morluto/rea
/plugin install rea@rea
Do not install both the plugin and a separate REA registration for the same Claude Code session.

Check the connection:

/mcp
You can also inspect installed plugins:

claude plugin list

Official resources:

REA GitHub repository

REA installation documentation

REA capabilities and documentation

Important: REA's capabilities depend on the target. Its JavaScript application analysis, website investigation and native binary analysis are different workflows. Do not assume that installing REA automatically gives Claude access to a running SolidWorks session.

3. The architecture I recommend
Do not build MecAgent as one giant LLM prompt.

Build a CAD agent platform with a separate execution layer.

CAD AI Desktop Application

Chat · 3D Viewer · Project Files · Background Tasks

Agent Orchestration Layer

Intent understanding
Task planning
Tool selection
Verification loop
CAD Intelligence Engine

Text-to-CAD
STEP-to-CAD
Drawing-to-CAD
Assembly Agent
Drawing Agent
Macro Agent
CAD Adapter Layer

SolidWorks · CATIA V5 · Inventor · Fusion 360

Actual CAD Software

Native geometry · Feature tree · Assemblies · Drawings

REA sits alongside Claude Code as an investigation tool. It is not the CAD execution engine.

The important engineering principle is to have an adapter for each CAD application, with a common set of typed operations and verification results.

4. How to use REA to investigate MecAgent
Use Claude Code to perform an evidence-driven investigation in five stages.

Stage A — Product reconnaissance

Ask Claude to inspect:

MecAgent homepage and public user guide.

Screenshots and recorded demonstrations.

Live Agent workflow.

Background Task workflow.

CAD integrations.

Conversation interface and task progress.

File import/export behavior.

Stage B — Feature reconstruction

For every feature, document:

User input.

Context required.

Agent reasoning and planning.

CAD operations required.

Execution mechanism.

Verification.

Error handling.

Final deliverable.

Stage C — Architecture reconstruction

Ask REA to inspect the relevant available application artifacts, trace functions and dependencies, and return evidence with limitations. Use public documentation and observable behavior for MecAgent's inaccessible internals.

Stage D — Implementation

Claude should implement your own architecture, not merely reproduce screenshots.

Stage E — Verification

Use Playwright for desktop/web interface testing and real CAD test sessions for geometry and feature-tree verification.

One important distinction: the public website contains demonstrations and product descriptions. It does not establish that its promotional interface is the same as its production desktop application.

5. Master prompt for Claude Code
The following is the prompt I would use as the starting point. Paste it into Claude Code with REA installed and your target project open.

PROJECT: BUILD AN ENTERPRISE-GRADE AI CAD AGENT INSPIRED BY MECAGENT
1. ROLE
Act as a principal software architect, senior CAD automation engineer, AI agent engineer, mechanical engineering software specialist, and premium product designer.

Our objective is to build an independent AI-powered CAD agent with functionality comparable to the publicly demonstrated MecAgent product.

Reference:

https://mecagent.com/

https://mecagent.com/user-guide

https://github.com/morluto/rea

Use REA as an investigation and reverse-engineering assistant wherever its supported capabilities apply.

Do not claim to know MecAgent's proprietary source code, internal prompts, backend, or algorithms.

Reconstruct observable behavior and documented functionality using independent implementations.

Do not copy proprietary source code, branding, private assets, or confidential information.

2. FIRST TASK: INVESTIGATE BEFORE CODING
Do not immediately start implementing.

First investigate:

The entire existing repository.

Its frontend, backend, infrastructure and architecture.

Existing CAD integrations.

Existing AI agents and orchestration.

Existing database and file storage.

Existing authentication and user management.

Existing testing infrastructure.

Then investigate MecAgent's publicly available product:

Homepage.

Product demonstrations.

User guide.

Live CAD Agent.

Background CAD Tasks.

Conversation interface.

CAD document context.

Feature tree interaction.

Text-to-CAD.

STEP-to-CAD.

Drawing-to-CAD.

CAD-to-Drawing.

Assembly operations.

Materials and equations.

Macro automation.

Knowledge management.

Export and file management.

Use REA to collect evidence where applicable.

Use browser inspection and Playwright where appropriate.

For each observation, classify it:

CONFIRMED: Directly demonstrated or documented.

INFERRED: Technically reasonable interpretation.

UNKNOWN: Cannot be established from public evidence.

Never invent undocumented internals.

3. DELIVERABLE 1: PRODUCT AUDIT
Create:

docs/research/MECAGENT_PRODUCT_AUDIT.md

Include:

Complete feature inventory.

User journeys.

Screens and interactions.

Desktop application behavior.

CAD integrations.

AI workflow analysis.

Background processing.

Import/export behavior.

Verification mechanisms.

Error handling.

Known limitations.

Evidence and confidence for each finding.

Create a comparison table between the reference product and our implementation.

4. DELIVERABLE 2: TARGET ARCHITECTURE
Create:

docs/architecture/CAD_AGENT_ARCHITECTURE.md

Design a modular architecture containing:

A. Desktop application

Premium engineering interface.

Conversational CAD assistant.

CAD document context.

3D viewport.

Feature tree.

Task history.

File manager.

Background job monitoring.

B. Agent orchestration

Intent classification.

Engineering specification extraction.

Context retrieval.

Task decomposition.

Planning.

Tool selection.

CAD operation execution.

Geometry verification.

Recovery and replanning.

Final reporting.

C. CAD intelligence

Text-to-CAD.

STEP-to-CAD.

Drawing-to-CAD.

CAD-to-Drawing.

Assembly intelligence.

Part modification.

Materials and equations.

Macro generation.

CAD document inspection.

D. CAD adapter architecture

Start with one production-grade CAD integration.

Prioritize SolidWorks as the first integration, with a clean architecture for future CATIA V5, Inventor, Fusion 360 and other adapters.

Define a common CAD adapter interface:

connect()

disconnect()

get_active_document()

get_document_metadata()

inspect_feature_tree()

inspect_geometry()

create_sketch()

create_feature()

modify_feature()

create_part()

create_assembly()

create_drawing()

apply_material()

export_document()

validate_geometry()

Do not pretend all adapters support identical operations.

Every adapter must expose its actual capabilities and unsupported operations.

E. Background execution

Implement:

Durable jobs.

Job queue.

Job status.

Progress reporting.

Cancellation.

Retry policies.

Artifact storage.

Execution logs.

Failure recovery.

F. Engineering knowledge

Implement:

Technical document retrieval.

CAD API documentation retrieval.

Engineering standards references.

User-specific knowledge bases.

Reusable CAD workflows.

5. DELIVERABLE 3: TECHNICAL SPECIFICATION
Create:

docs/architecture/CAD_AGENT_TECHNICAL_SPEC.md

For every subsystem specify:

Responsibilities.

Interfaces.

Data contracts.

API endpoints.

Database entities.

Dependencies.

Error handling.

Security requirements.

Performance requirements.

Tests.

Use typed schemas and explicit validation.

Keep CAD execution separate from LLM reasoning.

Never allow the LLM to execute arbitrary CAD code without a controlled execution layer.

6. DELIVERABLE 4: PREMIUM USER EXPERIENCE
Create:

docs/design/CAD_AGENT_DESIGN_SYSTEM.md

The product should feel like a professional engineering application.

Design:

Desktop workspace.

CAD assistant chat.

CAD model viewer.

Feature tree.

Engineering properties panel.

Task execution timeline.

Background tasks dashboard.

File upload interface.

Automation library.

Knowledge management.

Settings and integrations.

Visual direction:

Professional engineering software.

Refined typography.

Neutral backgrounds.

Restrained accent colors.

Excellent spacing.

Subtle transitions.

Clear engineering data hierarchy.

Realistic CAD model previews.

No excessive gradients or unnecessary glass effects.

The interface must be functional, not just a static design.

7. DELIVERABLE 5: IMPLEMENTATION ROADMAP
Create:

docs/roadmap/CAD_AGENT_IMPLEMENTATION_ROADMAP.md

Organize work into phases:

PHASE 1 — Foundation
Repository audit, architecture, design system, infrastructure.

PHASE 2 — CAD connectivity
Build the first CAD adapter and establish a reliable connection to a real CAD session.

PHASE 3 — CAD intelligence
Document inspection, feature tree understanding, geometry operations and validation.

PHASE 4 — Live AI agent
Natural-language interaction, planning, typed tools and execution feedback.

PHASE 5 — Text-to-CAD and STEP-to-CAD
Specification extraction, model creation and geometry verification.

PHASE 6 — Background tasks
Durable asynchronous processing and artifact delivery.

PHASE 7 — Drawings and assemblies
Drawing generation, drawing interpretation and assembly operations.

PHASE 8 — Automation
Reusable macros, workflow templates and engineering knowledge.

PHASE 9 — Enterprise readiness
Security, permissions, audit trails, observability and deployment.

PHASE 10 — Multi-CAD support
Add further adapters without duplicating the orchestration engine.

For each phase include:

Tasks.

Dependencies.

Deliverables.

Acceptance criteria.

Tests.

Risks.

Definition of done.

8. IMPLEMENTATION RULES
Do not rewrite working code without evidence.

Do not replace existing infrastructure unnecessarily.

Do not create mock functionality and label it production-ready.

Do not use fake CAD execution results.

Never report successful geometry creation unless the actual CAD application confirms it.

Use actual CAD API documentation.

Use real CAD files and controlled test projects.

Implement robust timeouts and error recovery.

Maintain backward compatibility.

Write automated tests for every important operation.

9. VERIFICATION
Use:

Unit tests.

Integration tests.

API contract tests.

Playwright UI tests.

CAD adapter integration tests.

Real CAD execution tests.

Geometry validity checks.

Feature tree assertions.

Export/import round-trip tests.

Background job reliability tests.

Every CAD operation must produce an execution record containing:

Requested operation.

Target document.

Actual CAD command.

Execution result.

Validation result.

Error details.

Generated artifact references.

10. FINAL EXPECTATION
First produce the audit, architecture, technical specification, design system and implementation roadmap.

Do not start large-scale implementation until the audit is complete.

Afterwards implement incrementally, test each phase and update the documentation.

Be brutally honest about what is working, partially implemented, simulated, unsupported or missing.

Our goal is an independently engineered, production-grade AI CAD agent, not a superficial MecAgent-looking website.

6. Recommended implementation priorities
I would not attempt all eight CAD integrations simultaneously.

Priority

Component

Expected outcome

P0

CAD connectivity

Real connection to SolidWorks

P0

Document intelligence

Understand active parts and assemblies

P0

CAD tool execution

Execute validated modeling operations

P0

Verification engine

Detect failed or invalid operations

P1

Live AI Agent

Natural-language CAD copilot

P1

Text-to-CAD

Generate parametric parts

P1

STEP-to-CAD

Import and modify models

P1

Background tasks

Asynchronous CAD processing

P2

Drawing-to-CAD

Interpret engineering drawings

P2

CAD-to-Drawing

Generate engineering documentation

P2

Automation library

Reusable engineering workflows

P3

CATIA V5 and other adapters

Expand CAD compatibility

My strongest recommendation: prioritize a real SolidWorks connection, document understanding, feature-tree operations and geometry verification before investing heavily in the interface.

A beautiful CAD chatbot that cannot reliably create and validate a part is not a competitive CAD agent.

7. How to judge whether your implementation is actually comparable
Use these acceptance tests:


User describes a mechanical part using dimensions.

Agent converts the description into a structured specification.

Agent creates the part inside actual CAD software.

Result has an editable feature tree.

User can request modifications conversationally.

Agent understands the active assembly.

Agent can import and inspect STEP files.

Agent can produce a drawing.

Background jobs continue independently.

Failed operations are detected and handled.

Exported files can be reopened and validated.

Execution history records actual CAD operations.
A test only passes when the real CAD application confirms the result.

Useful reference: MecAgent complete user guide. Study its chapters on CAD Agent, Automations and Background Tasks particularly carefully.

My suggested next step is to have Claude Code produce the five research and architecture documents first, then use them to drive implementation phase by phase.

so i install mecagent desktop and also rea on claude code, give me roadmpa to exucte it in claude code

Worked for 35s
Execution roadmap: MecAgent + REA + Claude Code
Now that you have installed MecAgent Desktop and REA in Claude Code, I recommend running a structured reverse-engineering and implementation project.

The objective is to build an independent AI CAD agent that reproduces MecAgent's publicly observable workflows and capabilities, using your own code and architecture.

Do not start by asking Claude to build the entire product. First make it understand how MecAgent works, then translate those observations into an implementation plan, then build and test each capability.

1. Your working environment
You will use three separate applications:

Text-to-Macro-to-CAD - The Future of Design  - MecAgent - AI CAD Sofware Copilot

MecAgent Desktop

Reference application
Explore user workflows, CAD operations, task progress and results.

Claude Code can just do things - Dane Grant

Claude Code

Implementation environment
Analyze your repository, implement your application and run tests.

GitHub - Bevel-Software/code-to-knowledge-graph: Toolkit designed to parse complex source code and transform it into a rich, structured, and queryable knowledge graph

REA

Investigation assistant
Use supported investigation capabilities to inspect available artifacts and trace technical behavior.

Keep MecAgent open beside your CAD software. Use Claude Code in a separate terminal.

Important: MecAgent's documentation states that its live agent operates on a local CAD session, while its Background Tasks run on its servers. The desktop app is therefore a reference for behavior, not a source-code repository that REA can automatically extract. 

MecAgent

2. First, verify your environment
Before asking Claude to investigate anything, check these prerequisites.

Requirement

What to verify

Windows

Windows 10 or 11

MecAgent

Desktop launches and you can sign in

SolidWorks

Version 2024, 2025 or 2026 for the documented supported setup

REA

Connected to Claude Code

Node.js

Available in terminal

Project

Your own application repository

MecAgent's documented native integration currently targets SolidWorks. Installing MecAgent alone does not install SolidWorks. 

MecAgent

In Claude Code, execute:

claude plugin list

Then inside Claude Code:

/mcp
Confirm that REA is connected and its tools are available.

If you installed REA as a plugin, don't also register a second REA MCP server using rea setup. The REA installation documentation explicitly distinguishes these installation methods. 

GitHub

3. Execute the roadmap in 8 phases
CAD agent development plan
Phase 0 — Environment and baseline

Start here
Verify installations, identify the application type, collect reference observations and prepare test files.

Phase 1 — MecAgent investigation

Investigate the complete product, workflows, UI, live operations and background jobs.

Phase 2 — Architecture design

Design the agent orchestrator, CAD adapters, execution engine and verification layer.

Phase 3 — Premium frontend

Build the desktop workspace, conversation interface, 3D viewer and task management.

Phase 4 — CAD integration

Connect your own application to a real CAD session.

Phase 5 — AI CAD agent

Implement natural-language instructions, planning, tool execution and verification.

Phase 6 — Background intelligence

Implement Text-to-CAD, STEP-to-CAD, Drawing-to-CAD and CAD-to-Drawing.

Phase 7 — Enterprise readiness

Security, reliability, observability, testing and multi-CAD extensibility.

Phase 0 — Environment and baseline
Open your existing project in Claude Code.

Paste this first:

PHASE 0 — ENVIRONMENT AND BASELINE AUDIT
You are the technical lead of an AI CAD agent project.

Our reference application is MecAgent Desktop.

Our investigation tool is REA (morluto/rea).

Our implementation environment is this existing repository.

IMPORTANT:
This phase is READ-ONLY. Do not modify application source code.

TASK 1 — ENVIRONMENT

Inspect:

OS and architecture.

Node.js and package manager.

Claude Code environment.

REA MCP connection and available tools.

Existing project structure.

Available CAD software and versions.

Existing CAD API dependencies.

Existing 3D rendering dependencies.

TASK 2 — MECAGENT REFERENCE

Determine which MecAgent capabilities can be observed through:

Its public website.

Its public user guide.

Its desktop UI.

Normal user interactions.

Demonstrations using non-confidential sample CAD files.

Classify the installed application type only when evidence supports it.

Use REA only for supported investigation targets and operations. Do not bypass application protections, authentication or access restrictions.

TASK 3 — EXISTING PROJECT

Inspect the complete repository:

Frontend.

Backend.

Database.

AI integration.

Agent orchestration.

CAD integration.

File handling.

Authentication.

Tests.

Deployment.

TASK 4 — BASELINE

Create:

docs/cad-agent/PHASE_00_ENVIRONMENT_AUDIT.md

Include:

Verified environment.

Installed software.

REA capabilities actually available.

Existing architecture.

Existing working functionality.

Missing functionality.

Technical risks.

Required dependencies.

Prerequisites for real CAD integration.

Do not invent installed software, available APIs or successful integrations.

End with a clear GO / BLOCKED decision for Phase 1.

Do not begin implementation.

Gate: Do not continue until Claude has established which CAD software and integration APIs are actually available.

Phase 1 — Investigate MecAgent
This is where you use MecAgent Desktop and REA together.

Open MecAgent and explore each workflow yourself. Use sample projects, not confidential customer engineering files.

Text-to-Macro-to-CAD - The Future of Design  - MecAgent - AI CAD Sofware Copilot

MecAgent - AI CAD Copilot

The end of “CAD Drudgery”: How AI Copilots are revolutionizing SolidWorks & CAD Automation. - MecAgent - AI CAD Sofware Copilot

Explore these workflows:

Investigation

What to capture

CAD Agent

Chat, instructions, planning, execution

Document context

Active part, feature tree, dimensions

Text-to-CAD

Specification to 3D model

STEP-to-CAD

Imported model to editable geometry

Assembly

Components, positioning and mates

Drawing-to-CAD

Drawing to editable model

CAD-to-Drawing

Model to technical drawing

Automations

Reusable CAD workflows

Background Tasks

Job submission, progress and results

Knowledge

Technical documentation and context

Paste:

PHASE 1 — MECAGENT PRODUCT INVESTIGATION
Perform a structured investigation of MecAgent using its publicly available documentation and normal desktop user interactions.

Use REA when its supported tools can provide additional evidence.

Do not assume the desktop application is Electron or that it exposes a particular internal API. Establish the application type from evidence first.

Investigate these modules individually:

CAD Agent.

CAD document context.

Feature tree.

Text-to-CAD.

STEP-to-CAD.

Assembly intelligence.

Drawing-to-CAD.

CAD-to-Drawing.

Macro generation.

Background Tasks.

General Knowledges.

Model selection.

File management.

Error handling.

User experience.

For every module document:

User journey.

Input.

Expected output.

UI states.

User interaction.

Required CAD context.

Observable agent behavior.

Verification.

Failure states.

Available evidence.

Unknown implementation details.

Use the following evidence labels:

CONFIRMED
INFERRED
UNKNOWN

Do not invent backend internals, model names, APIs, proprietary prompts or algorithms.

Create:

docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md
docs/cad-agent/research/USER_JOURNEYS.md
docs/cad-agent/research/OBSERVATION_LOG.md
docs/cad-agent/research/TECHNICAL_UNKNOWNS.md

Also create a reference screenshot inventory. Record the source of each screenshot and what it demonstrates.

Compare every feature against our existing implementation.

Do not implement anything during this phase.

At the end provide:

Total features investigated.

Confirmed capabilities.

Inferred capabilities.

Unknown capabilities.

Missing features in our repository.

Recommended implementation priorities.

My recommendation: Spend time actually testing the workflows. Screenshots alone cannot establish whether a CAD operation succeeded.

Phase 2 — Design the architecture
Now Claude should use the investigation results to design the actual product.

PHASE 2 — TARGET ARCHITECTURE
Based on Phase 0 and Phase 1 findings, design our independent AI CAD agent architecture.

Do not invent features that the existing environment cannot support.

Design the following subsystems:

CAD Desktop Application

AI Agent Orchestrator

Engineering Specification Parser

CAD Document Intelligence

CAD Adapter Framework

CAD Execution Engine

Geometry Verification Engine

Background Job System

Engineering Knowledge Retrieval

Macro and Automation Engine

File and Artifact Management

Authentication and Workspace Management

Observability and Audit Logging

Define:

Component boundaries.

Service responsibilities.

API contracts.

Database schemas.

Event contracts.

Job lifecycle.

Execution lifecycle.

Agent state machine.

Retry and recovery.

Permission boundaries.

Error handling.

Design a common CAD adapter interface, but explicitly document capability differences between CAD products.

Define a typed operation protocol.

Every CAD action must have:

Operation ID.

Target document.

Operation type.

Parameters.

Preconditions.

Execution status.

Result.

Verification status.

Error details.

The LLM must never directly execute arbitrary CAD code.

Implement a controlled tool execution layer with schema validation, approval policies, timeouts and operation logging.

Create:

docs/cad-agent/architecture/SYSTEM_ARCHITECTURE.md
docs/cad-agent/architecture/AGENT_ORCHESTRATION.md
docs/cad-agent/architecture/CAD_ADAPTERS.md
docs/cad-agent/architecture/DATABASE_DESIGN.md
docs/cad-agent/architecture/API_CONTRACTS.md
docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md

Include architecture diagrams and data-flow diagrams.

Do not begin implementation until all design decisions are documented and their dependencies are understood.

The core agent workflow you should build
User request

"Create a mechanical enclosure, 120 × 80 × 40 mm."

Intent and specification extraction

Engineering validation

CAD planning and typed operations

CAD adapter execution

Geometry and feature-tree verification

Verified CAD artifact

Native model · Dimensions · Feature tree · Execution report

Phase 3 — Build the premium interface
Use MecAgent as the behavioral reference, but give your product its own identity.

Zookeeper | Zoo

Why AI Must Generate Parametric CAD | Zoo

Inventor user interface for revit update - Autodesk Community

Your frontend should contain:

CAD workspace.

Conversational agent.

3D model viewer.

Feature tree.

Properties and dimensions panel.

Background tasks.

Automation library.

Knowledge manager.

Project and file manager.

Execution history.

Paste:

PHASE 3 — PREMIUM CAD DESKTOP EXPERIENCE
Implement the frontend using the existing repository stack.

First inspect the current frontend and preserve working infrastructure.

Build a premium engineering workspace with:

Main CAD viewport.

Conversational AI panel.

Feature tree.

Properties inspector.

Engineering dimensions.

Document tabs.

Background task dashboard.

Automation library.

Knowledge manager.

File manager.

Execution history.

Design direction:

Professional mechanical engineering software.

High-quality typography.

Neutral industrial color palette.

Refined dark and light themes.

Subtle transitions and interaction feedback.

Excellent information hierarchy.

Realistic 3D model presentation.

No excessive gradients, glow or decorative animations.

The application must support actual interactions.

Use a real 3D rendering engine and define how imported geometry is represented.

Keep rendering separate from CAD execution. A browser 3D preview must never be presented as proof that a native CAD model has been created.

Implement loading, empty, error, running, completed and cancelled states.

Use Playwright for visual and functional testing.

Create a screenshot comparison report and document deviations from the reference workflows.

Do not create fake backend functionality or present static mockups as completed features.

Phase 4 — Real CAD integration
Most important engineering milestone
Start with one CAD adapter, preferably SolidWorks if it is available.

The objective is to make your own application communicate with an actual CAD session.

Main components of the SOLIDWORKSinterface - PLATFORM ENGINEERING

Paste:

PHASE 4 — REAL CAD ADAPTER
Implement the first production-grade CAD integration.

Target: SolidWorks, provided a compatible installation and API environment are available.

First investigate the official CAD API documentation and the actual installed version.

Implement:

CAD connection management.

Active document discovery.

Document metadata extraction.

Feature-tree inspection.

Part and assembly inspection.

Geometry properties.

Sketch operations.

Extrusion and other supported feature operations.

Dimension modification.

Material assignment.

Native file saving.

STEP export.

Operation result reporting.

Define a typed adapter interface.

Use the official supported CAD API and a controlled local execution service.

The LLM must not directly control the CAD application through arbitrary shell commands.

Implement:

Connection health checks.

Operation timeouts.

Cancellation.

Error recovery.

User approval for consequential modifications.

Document locking where necessary.

Execution audit logs.

Test against real CAD documents.

Acceptance criteria:

Detect a real CAD session.

Identify the active document.

Read its feature tree.

Execute a basic modeling operation.

Confirm the operation in the CAD application.

Save the native document.

Export a STEP file.

Reopen and validate the exported geometry.

If SolidWorks is unavailable, report BLOCKED and implement only the adapter contract and test doubles. Never claim a real integration is complete.

Phase 5 — Build the AI CAD Agent
This is where you connect Claude or another selected model to your own CAD tool layer.

PHASE 5 — AI CAD AGENT
Build a production-oriented conversational CAD agent.

Implement:

Natural-language understanding.

Engineering specification extraction.

Missing-dimension detection.

Clarification handling.

CAD operation planning.

Typed tool selection.

Controlled CAD execution.

Execution progress streaming.

Geometry verification.

Failure diagnosis.

Recovery and replanning.

Final engineering report.

Agent execution loop:

OBSERVE
→ UNDERSTAND
→ PLAN
→ VALIDATE
→ REQUEST APPROVAL WHEN REQUIRED
→ EXECUTE
→ INSPECT
→ VERIFY
→ RECOVER IF NECESSARY
→ REPORT

The agent must understand the active CAD document and distinguish between:

Part documents.

Assembly documents.

Drawing documents.

Empty documents.

Unsupported documents.

Create tools for:

Document inspection.

Feature-tree inspection.

Sketch creation.

Feature creation.

Dimension updates.

Material assignment.

Part export.

Assembly inspection.

Drawing creation.

Do not claim successful execution based on an LLM response.

Use CAD-generated evidence to verify every operation.

Persist execution traces and allow the user to inspect what happened.

Implement evaluation datasets covering simple parts, complex parts, assemblies, modifications and failure cases.

Produce a benchmark report.

Phase 6 — Background CAD tasks
MecAgent's asynchronous workflow is one of the most important capabilities to reproduce.

PHASE 6 — BACKGROUND CAD TASK ENGINE
Implement a durable asynchronous CAD processing system.

Support these job categories:

Text-to-CAD.

STEP-to-CAD.

Drawing-to-CAD.

CAD-to-Drawing.

Macro generation.

Implement:

Job creation.

Job queue.

Worker management.

Job persistence.

Progress events.

Status transitions.

Cancellation.

Retry policies.

Timeouts.

Artifact storage.

Result previews.

Download management.

Execution logs.

Define job states:

CREATED
PENDING
RUNNING
VERIFYING
COMPLETED
FAILED
CANCELLED

Separate the orchestration API from the CAD workers.

A long-running task must survive application refreshes and temporary client disconnections.

Every completed task must have a verified output artifact.

Create integration tests for:

Successful jobs.

Failed jobs.

Worker restart.

Duplicate submissions.

Cancellation.

Artifact recovery.

Invalid input files.

Do not use simulated job completion in production.

Phase 7 — Engineering intelligence and automation
PHASE 7 — ENGINEERING INTELLIGENCE
Build the advanced engineering capabilities.

A. Engineering knowledge:

Technical documentation.

Engineering standards.

Materials databases.

Manufacturing processes.

Supplier documentation.

Company-specific knowledge.

B. Retrieval:

Document ingestion.

Parsing.

Chunking.

Metadata.

Semantic search.

Citation and source tracking.

Context selection.

C. CAD automation:

Reusable workflows.

Parameterized macros.

Workflow versioning.

Execution history.

User permissions.

Validation before execution.

D. Drawing intelligence:

Drawing input interpretation.

Dimension extraction.

View identification.

Tolerance interpretation.

Geometry reconstruction.

Drawing generation.

E. Assembly intelligence:

Component identification.

Mate planning.

Assembly validation.

Bill of materials extraction.

Exploded views where supported.

Use engineering constraints and explicit validation.

Do not infer missing engineering dimensions or tolerances without communicating uncertainty.

Create evaluation datasets and tests for each capability.

Document unsupported operations honestly.

Phase 8 — Production readiness
PHASE 8 — PRODUCTION READINESS
Perform a complete engineering audit.

Evaluate:

Architecture quality.

Agent reliability.

CAD execution reliability.

Geometry correctness.

Security.

Authentication.

Multi-tenancy.

Permissions.

Audit logging.

Background processing.

Performance.

Observability.

Cost management.

Deployment.

Recovery and backup.

Implement:

Role-based access control.

Workspace isolation.

Secure artifact storage.

Input validation.

Tool execution permissions.

Audit trails.

Monitoring.

Structured logs.

Error reporting.

Rate limiting.

Resource limits.

Create a full Playwright test suite.

Create CAD integration test suites using real CAD sessions.

Create a production readiness report.

Classify every feature as:

PRODUCTION READY
PARTIALLY IMPLEMENTED
MOCKED
UNTESTED
UNSUPPORTED

Do not declare the product production-ready merely because the frontend and API tests pass.

4. How to run Claude Code without losing control
This is extremely important. Do not paste all eight phases at once.

Use this execution loop:

Your Claude Code execution loop
Run one phase

Paste its corresponding prompt into Claude Code.

Inspect the deliverables

Open the Markdown documents and check the evidence.

Challenge Claude

Ask it to identify assumptions, missing tests and unsupported claims.

Approve implementation

Only after reviewing the phase and its dependencies.

Run tests

Require actual test results and Playwright screenshots.

Commit the working phase

Save a Git checkpoint before moving forward.

Use this reusable prompt after each phase:

Before moving to the next phase, perform a ruthless independent audit of the current phase.

Compare the implementation with its acceptance criteria.

Inspect actual source code.

Run the relevant automated tests.

Identify mocked or simulated functionality.

Identify incomplete integrations.

Check for architectural shortcuts.

Verify that documentation matches implementation.

Identify regressions.

Fix verified issues before proceeding.

Produce a phase completion report.

Do not claim completion based on code generation alone.

Stop if a critical dependency is missing or a core acceptance test fails.

Only proceed when the current phase has passed its acceptance criteria.

5. Suggested project directory
Have Claude create this structure inside your existing repository, adapting it to the stack rather than duplicating existing directories.

project/
│
├── apps/
│   ├── desktop/
│   └── web/
│
├── services/
│   ├── agent-orchestrator/
│   ├── cad-execution/
│   ├── cad-workers/
│   ├── background-jobs/
│   └── knowledge-engine/
│
├── packages/
│   ├── cad-adapters/
│   ├── cad-protocol/
│   ├── agent-tools/
│   ├── engineering-schemas/
│   └── shared/
│
├── docs/
│   └── cad-agent/
│       ├── research/
│       ├── architecture/
│       ├── design/
│       ├── roadmap/
│       └── reports/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── cad/
│
└── infrastructure/
6. Your first real milestone
Do not measure success by the number of features Claude generates.

Measure it by this demonstration:

Milestone 1 Natural language → real CAD model → verified output

Final Project

Your first demonstration should be:

Open a blank part in SolidWorks.

Open your AI CAD application.

Ask it to create a rectangular mechanical enclosure.

Extract dimensions and engineering specifications.

Generate a modeling plan.

Execute the plan in SolidWorks.

Produce an editable feature tree.

Inspect dimensions and geometry.

Save the native CAD file.

Export STEP and validate the exported file.

This one demonstration proves substantially more than a sophisticated chatbot UI.

Data protection: MecAgent's documentation says its server receives request context and uploaded files for processing. Use non-confidential sample files while investigating, and review its privacy and data-handling terms before using sensitive engineering designs. 

MecAgent

7. Official references to keep open
MecAgent complete user guide

REA GitHub repository

REA installation documentation

SOLIDWORKS API and developer documentation

My final recommendation
The biggest mistake would be trying to reproduce MecAgent's entire product before proving the CAD execution engine.

Your order should be:

Understand MecAgent.

Audit your existing repository.

Design your agent architecture.

Build the first real CAD adapter.

Prove geometry creation and verification.

Build the agent around that capability.

Add background jobs and advanced engineering features.

Polish the complete product.

This is the path toward a genuine AI mechanical engineering product rather than just another AI chat interface with a 3D viewer.

One useful next step: once you have completed Phase 0, I can review Claude's audit and challenge its architecture before you authorize implementation.

