# MASTER PRODUCT BUILD PROMPT
## Build a Premium Enterprise AI Mechanical Engineering Platform

Act as a principal product architect, senior UX/UI designer, staff full-stack engineer, CAD automation architect, AI agent engineer, and enterprise software specialist.

Your mission is to design and implement a premium, production-oriented AI Mechanical Engineering platform inspired by the observable product capabilities of:

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

IMPORTANT:
Build an original product with its own identity, visual language, architecture, workflows, and implementation. Do not copy proprietary source code, branding, or protected assets from competitors.

The product must be substantially more than a landing page, dashboard mockup, or chatbot.

It should become an integrated engineering workspace where mechanical engineers can manage projects, interact with AI agents, create and inspect CAD models, automate engineering workflows, analyze technical drawings, and validate engineering outputs.

==================================================
PHASE 1 — PRODUCT FOUNDATION
==================================================

Create a coherent product named [PRODUCT NAME].

Positioning:
An enterprise AI mechanical engineering operating environment.

Target customers:
- Automotive engineering companies
- Mechanical design firms
- Industrial machinery manufacturers
- Aerospace engineering organizations
- Product development teams
- Engineering consulting companies
- Manufacturing businesses

Primary personas:
1. Mechanical design engineer
2. CAD specialist
3. Engineering project manager
4. Design team lead
5. Engineering director
6. Enterprise administrator

Create realistic demo organizations, projects, engineering users, files, and tasks.

Do not represent sample data as actual customer data.

==================================================
PHASE 2 — DESIGN SYSTEM
==================================================

Create a highly premium engineering software interface.

Visual references:
Professional industrial CAD software, enterprise engineering platforms, premium developer tools, and sophisticated technical workstations.

Visual principles:
- Deep graphite and navy background.
- Slate-colored panels.
- Muted blue primary accent.
- Restrained cyan highlights.
- Professional typography.
- Fine borders.
- Minimal shadows.
- High information density.
- Excellent spacing.
- Strong visual hierarchy.
- Consistent technical iconography.

Use Inter or Geist.

Avoid generic AI SaaS templates.

Avoid excessive gradients, neon effects, glassmorphism, oversized cards, and decorative animations.

Build:
- Design tokens
- Color system
- Typography system
- Spacing scale
- Component library
- Responsive layouts
- Dark theme
- Light theme
- Interactive states
- Loading states
- Empty states
- Error states

Motion:
- Smooth transitions
- Resizable workspace panels
- Animated task progress
- Workflow execution animation
- Subtle hover effects
- Expandable technical panels
- Command palette
- Keyboard navigation
- CAD viewport transitions

Motion must be purposeful and never interfere with engineering work.

==================================================
PHASE 3 — GLOBAL APPLICATION SHELL
==================================================

Build a complete application shell.

Left sidebar:
- Overview
- AI CAD Agent
- CAD Workspace
- Text-to-CAD
- Drawing-to-CAD
- Reverse Engineering
- Assembly Intelligence
- Drawing Automation
- Engineering Copilot
- Simulation Intelligence
- Automation Studio
- Background Tasks
- Knowledge Hub
- Verification Center
- Projects
- Integrations
- Administration

Top navigation:
- Organization switcher
- Project selector
- Global search
- Command palette
- Notifications
- Documentation
- User profile

Create:
- Collapsible navigation
- Breadcrumbs
- Global command menu
- Context-aware actions
- Recent projects
- Global task indicator

All navigation must work.

==================================================
PHASE 4 — ENGINEERING OVERVIEW
==================================================

Build a premium engineering dashboard.

Include:
- Active projects
- CAD documents
- Background tasks
- Agent activity
- Verification status
- Recent engineering operations
- Team activity
- Engineering productivity metrics
- CAD software connection status
- Recent generated models
- Failed operations requiring attention

Create visualizations for:
- Task completion
- Project activity
- CAD operations
- Agent success rates
- Verification outcomes

Include a recent activity timeline.

All metrics must derive from available demo or real application data. Never invent real-world customer metrics.

==================================================
PHASE 5 — AI CAD AGENT
==================================================

This is the central product experience.

Build an advanced conversational CAD workspace.

Layout:
- Left: conversation and instructions.
- Center: CAD viewport or document preview.
- Right: feature tree, properties, and execution details.
- Bottom: operation history and verification results.

Agent capabilities:
1. Understand engineering instructions.
2. Ask for missing dimensions and constraints.
3. Inspect the active CAD document.
4. Identify relevant components.
5. Create a structured execution plan.
6. Explain planned CAD operations.
7. Request approval when needed.
8. Execute through an appropriate CAD integration.
9. Inspect resulting geometry.
10. Verify operations.
11. Recover from supported failures.
12. Summarize completed work.

Example user instructions:
- Create a mechanical enclosure with specified dimensions.
- Add mounting holes to an existing component.
- Modify a component's thickness.
- Create a mounting bracket.
- Inspect an assembly for missing constraints.
- Generate a technical drawing.
- Export a model to STEP.
- Explain the feature history of a component.

Agent interface:
- Conversation history
- File attachments
- Model references
- Execution plan
- Tool activity
- Approval requests
- Progress
- Operation results
- Verification evidence
- Downloadable artifacts when actually generated

Never display a successful CAD execution unless a real operation or explicitly labeled simulation produced that result.

==================================================
PHASE 6 — CAD WORKSPACE
==================================================

Build a professional CAD workspace.

Main viewport:
- 3D model viewer
- Orbit
- Pan
- Zoom
- Fit to view
- Isometric view
- Front view
- Top view
- Side view
- Wireframe mode
- Shaded mode
- Section view where supported
- Measurement overlays
- Selection highlighting

Panels:
- Model tree
- Feature tree
- Assembly hierarchy
- Properties
- Materials
- Dimensions
- Constraints
- Operation history
- File metadata

Support a practical viewer architecture using an appropriate 3D rendering library such as Three.js.

Support import and preview of appropriate neutral CAD formats where technically feasible, including STEP, STL, OBJ, and GLB.

Do not pretend a mesh preview is equivalent to a native parametric CAD model.

Display file format and model fidelity clearly.

==================================================
PHASE 7 — TEXT-TO-CAD
==================================================

Create a dedicated text-to-CAD workflow.

User flow:
1. Enter engineering requirements.
2. Upload reference files if needed.
3. Specify dimensions and units.
4. Select target CAD system.
5. Generate a structured design specification.
6. Display the proposed feature plan.
7. Request approval.
8. Execute through the connected CAD adapter.
9. Inspect the resulting model.
10. Verify dimensions and geometry.
11. Save the native model.
12. Export supported neutral formats.

Include:
- Prompt editor
- Engineering parameters
- Unit selection
- Material selection
- CAD target selection
- Feature plan
- Preview
- Execution progress
- Verification report

Support editable parametric output only when the target CAD system and adapter genuinely provide it.

==================================================
PHASE 8 — DRAWING-TO-CAD
==================================================

Create an engineering drawing interpretation module.

Inputs:
- PDF engineering drawings
- Raster images
- Supported vector drawings
- Reference sketches

Workflow:
1. Upload drawing.
2. Extract text and dimensions.
3. Detect views.
4. Identify dimension annotations.
5. Identify geometric relationships.
6. Build an interpreted engineering specification.
7. Highlight uncertain or conflicting dimensions.
8. Request human clarification.
9. Generate a CAD execution plan.
10. Execute only after approval.
11. Compare resulting model against available drawing information.

Include:
- Drawing viewer
- Dimension extraction panel
- View classification
- Confidence indicators
- Annotation layer
- Uncertainty report
- Model comparison

Never silently invent missing engineering dimensions.

==================================================
PHASE 9 — REVERSE ENGINEERING
==================================================

Build a reverse engineering workspace.

Support:
- Reference images
- Point cloud inputs where supported
- Mesh inspection
- Scan comparison
- Geometric measurements
- Reference planes
- Model reconstruction plans
- Deviation visualization

Clearly distinguish:
- Original scan
- Reference mesh
- Reconstructed geometry
- Parametric CAD output
- Unresolved differences

Do not claim accurate reconstruction without geometric validation.

==================================================
PHASE 10 — ASSEMBLY INTELLIGENCE
==================================================

Build assembly analysis.

Features:
- Assembly hierarchy
- Component explorer
- Constraint inspection
- Missing relationship warnings
- Interference detection where supported
- Component metadata
- BOM visualization
- Assembly statistics
- Component dependency graph
- Version comparison

Allow the engineer to select a component and inspect its properties.

Separate actual CAD-system analysis from preliminary visual estimates.

==================================================
PHASE 11 — DRAWING AUTOMATION
==================================================

Create a technical drawing generation module.

Capabilities:
- Model-to-drawing workflow
- Standard views
- Section views where supported
- Dimension annotations
- Drawing templates
- Title blocks
- Revision information
- Export management

Include a drawing review interface.

Do not claim compliance with ISO, ASME, or other standards unless the relevant requirements have been implemented and verified.

==================================================
PHASE 12 — ENGINEERING COPILOT
==================================================

Build an engineering knowledge assistant.

Capabilities:
- Technical document search
- Engineering knowledge retrieval
- Material information
- Design documentation
- Engineering equations
- Technical calculations
- Internal knowledge base
- Previous project retrieval
- Technical explanations
- Source citations

Create:
- Knowledge search
- Document upload
- Source viewer
- Citation panel
- Knowledge collections
- Document processing status
- Access permissions

Distinguish verified source information, calculated values, assumptions, and AI-generated suggestions.

Do not invent engineering standards or source citations.

==================================================
PHASE 13 — SIMULATION INTELLIGENCE
==================================================

Create a simulation preparation and analysis workspace.

Features:
- Simulation project management
- Input configuration
- Material information
- Boundary condition records
- Mesh status
- Solver integration status
- Result visualization
- Simulation comparison
- Report generation

Where a real solver is unavailable, provide an explicitly labeled demo experience.

Never invent solver results or claim a simulation has passed without an actual solver result.

==================================================
PHASE 14 — AUTOMATION STUDIO
==================================================

Build a visual engineering automation builder.

Use a node-based workflow editor.

Node types:
- Trigger
- User input
- File upload
- Document analysis
- Engineering requirement extraction
- CAD document inspection
- CAD operation
- Geometry verification
- Drawing generation
- Knowledge retrieval
- Human approval
- Export
- Notification
- End

Support:
- Node configuration
- Workflow connections
- Validation
- Execution logs
- Error handling
- Version history
- Reusable workflow templates

Show the execution state of each node.

Include:
- Sequential execution
- Conditional branches
- Bounded retries
- Timeout policies
- Approval checkpoints
- Persistent execution state

No infinite loops.

==================================================
PHASE 15 — BACKGROUND TASKS
==================================================

Build a dedicated background task center.

Include:
- Task queue
- Running tasks
- Completed tasks
- Failed tasks
- Cancelled tasks
- Task progress
- Execution logs
- Generated artifacts
- Retry controls
- Task history

Each task should contain:
- Task ID
- Project
- User
- Created time
- Status
- Execution stage
- Progress
- Error details
- Output artifacts
- Verification status

Design the interface for long-running engineering workflows.

==================================================
PHASE 16 — VERIFICATION CENTER
==================================================

This is a major competitive differentiator.

Build an independent verification interface.

Verification categories:
- CAD document opened successfully
- Geometry validity
- Feature operation status
- Dimension consistency
- Constraint status
- Assembly integrity
- Drawing consistency
- Export validity
- File integrity

Display:
- Verification check
- Expected result
- Actual result
- Status
- Evidence
- Source system
- Timestamp

Use explicit states:
- Passed
- Failed
- Warning
- Not checked
- Unsupported

Never allow the AI agent to mark its own unverified operation as passed.

==================================================
PHASE 17 — PROJECT MANAGEMENT
==================================================

Build project management features.

Include:
- Project dashboard
- Engineering files
- File versions
- Team members
- Tasks
- Comments
- Activity history
- Project documentation
- Model revisions
- Generated artifacts
- Approval history

Create realistic project examples such as:
- Automotive mounting bracket
- Industrial gearbox assembly
- Mechanical enclosure
- Hydraulic component
- Machine support structure

==================================================
PHASE 18 — CAD INTEGRATIONS
==================================================

Create an integrations center.

Potential CAD connections:
- SOLIDWORKS
- CATIA V5
- Autodesk Fusion
- Siemens NX
- PTC Creo
- Autodesk Inventor
- Onshape
- Solid Edge

Display:
- Connection status
- Software version
- Adapter version
- Active document
- Available capabilities
- Last connection
- Supported operations
- Integration diagnostics

IMPORTANT ARCHITECTURAL REQUIREMENT:

Google AI Studio frontend cannot directly control arbitrary desktop CAD software.

Create a separate local CAD bridge architecture.

Proposed architecture:

Frontend
    |
Backend API
    |
Authentication and authorization
    |
Agent orchestrator
    |
Typed CAD operation protocol
    |
CAD adapter service
    |
Local desktop bridge
    |
Official CAD application API
    |
Native CAD document

Each CAD integration must have its own capability manifest.

Do not assume that every CAD application supports identical operations.

Use official and supported CAD APIs.

For SolidWorks, investigate the official API and appropriate Windows integration technology.

For CATIA V5, investigate its supported automation interfaces and installed version.

The integration center should distinguish:
- Connected
- Disconnected
- Unsupported
- Demo mode
- Partially integrated
- Error

Never present a simulated connection as a real connection.

==================================================
PHASE 19 — ENTERPRISE GOVERNANCE
==================================================

Create enterprise-grade administration.

Include:
- Organization management
- Teams
- Roles
- Permissions
- Project access
- Integration policies
- AI usage limits
- Audit logs
- Data retention settings
- Approval policies
- API keys
- Security settings
- Workspace configuration

Support role-based access control.

Record consequential engineering operations.

Protect confidential engineering documents.

==================================================
PHASE 20 — BACKEND AND DATA ARCHITECTURE
==================================================

Design the application to support a real backend.

Suggested architecture:

Frontend:
- React
- TypeScript
- Vite or an appropriate supported framework
- Tailwind CSS
- Reusable design components
- Three.js for appropriate 3D visualization

Backend:
- Python FastAPI or equivalent
- PostgreSQL
- Object storage
- Background job queue
- WebSocket or server-sent event updates
- Authentication and authorization

Agent architecture:
- Supervisor orchestrator
- Engineering understanding agent
- CAD planning agent
- CAD execution agent
- Drawing intelligence agent
- Engineering knowledge agent
- Verification agent
- Recovery agent

Use typed inputs and outputs.

Keep CAD execution separate from LLM reasoning.

Persist:
- Projects
- Documents
- CAD operations
- Agent runs
- Execution plans
- Verification results
- Workflow definitions
- Task state
- Audit records

Never store secrets in frontend code.

==================================================
PHASE 21 — AGENT ORCHESTRATION
==================================================

Implement a bounded hierarchical workflow.

Main graph:

USER REQUEST
    |
REQUIREMENT UNDERSTANDING
    |
CONTEXT RETRIEVAL
    |
CAD DOCUMENT INSPECTION
    |
EXECUTION PLAN
    |
PLAN VALIDATION
    |
HUMAN APPROVAL WHEN REQUIRED
    |
CAD EXECUTION
    |
INDEPENDENT VERIFICATION
    |
    +---- PASS ----> SAVE AND REPORT
    |
    +---- FAIL ----> RECOVERY ANALYSIS
                         |
                    BOUNDED RETRY
                         |
                    RE-VERIFICATION

Use specialized subgraphs only where they provide measurable value.

Each loop must have:
- Maximum iteration count
- Timeout
- Retry policy
- Exit conditions
- Persistent state
- Failure state
- Execution logs

Prevent duplicate CAD operations using idempotency keys and operation checkpoints.

Require approval for destructive or consequential changes.

==================================================
PHASE 22 — REALISTIC DEMO EXPERIENCE
==================================================

Build a fully interactive demonstration environment.

Users should be able to:
- Navigate every module
- Open example projects
- Inspect sample CAD documents
- Use the agent chat
- Generate a proposed CAD plan
- Run labeled simulated workflows
- Inspect task progress
- Review verification reports
- Explore automation graphs
- Browse knowledge documents
- View assembly hierarchies

All simulated functionality must be visibly labeled DEMO or SIMULATED.

Create a coherent set of sample data rather than unrelated random dashboard values.

==================================================
PHASE 23 — QUALITY ASSURANCE
==================================================

Test:
- Every route
- Every navigation item
- Every button
- Every modal
- Every form
- Every table
- Every workflow interaction
- Every file upload state
- Every task state
- Every error state
- Responsive layouts
- Accessibility
- Loading behavior

Use Playwright or an equivalent browser-testing framework where available.

Test realistic workflows:

TEST 1:
Create a new engineering project.

TEST 2:
Open AI CAD Agent.

TEST 3:
Enter a mechanical design request.

TEST 4:
Generate an execution plan.

TEST 5:
Approve a simulated operation.

TEST 6:
Inspect the task execution.

TEST 7:
Open the verification report.

TEST 8:
Inspect the resulting artifact.

TEST 9:
Open the project history.

TEST 10:
Compare two model revisions.

Do not claim tests passed unless they were executed.

==================================================
PHASE 24 — FINAL PRODUCT QUALITY
==================================================

The result should feel like a premium engineering product rather than a prototype dashboard.

Prioritize:
1. Product coherence
2. Professional visual design
3. Real interactions
4. Clear navigation
5. CAD workspace usability
6. Agent workflow clarity
7. Verification transparency
8. Technical architecture
9. Performance
10. Maintainability

Build incrementally.

Do not try to generate every module as disconnected static screens.

Create shared components and reusable domain models.

Preserve working features when implementing additional modules.

After each implementation phase:
- Run the application.
- Inspect the actual result.
- Fix visible defects.
- Test key interactions.
- Update the implementation tracker.

Create:
- README.md
- PRODUCT_SPECIFICATION.md
- SYSTEM_ARCHITECTURE.md
- DESIGN_SYSTEM.md
- CAD_INTEGRATION_ARCHITECTURE.md
- AGENT_ORCHESTRATION.md
- DATA_MODEL.md
- TEST_PLAN.md
- IMPLEMENTATION_STATUS.md

FINAL INSTRUCTION:

Start by inspecting the current project and existing implementation.

Do not blindly replace existing working code.

Produce an implementation plan based on the actual project structure and technology stack.

Then implement the product in coherent phases, beginning with the global application shell, design system, overview, and core AI CAD workspace.

Prioritize quality over the number of screens.

At every stage, clearly distinguish:
- Fully implemented
- Partially implemented
- Simulated
- Not implemented
- Blocked by external integration

The goal is a premium, coherent, extensible AI mechanical engineering platform that can eventually compete with MecAgent and adjacent engineering AI products.