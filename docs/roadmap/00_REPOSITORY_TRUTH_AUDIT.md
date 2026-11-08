# MechForge AI — Repository Truth Audit
**Audit Date:** 2026-11-07  
**Auditor:** Principal CAD Software Architect & AI Systems Specialist  
**Repository:** https://github.com/houssem98/cad-AI  
**Target Benchmarks:** MecAgent, Zoo / Zookeeper, Adam, LEO AI, DraftAid, SOLIDWORKS, CATIA V5, Siemens NX, Onshape  

---

## 1. Executive Summary

This repository truth audit provides an unvarnished, line-by-line inspection of all codebase components in MechForge AI. Prior to this audit, the application presented a high-quality visual simulation of an industrial CAD operating environment, but lacked true separation between frontend Three.js preview geometry and native desktop CAD kernel execution.

The purpose of this audit is to eliminate the "false-success" problem, establish strict separation between simulated previews and native CAD executions, verify API capabilities, and lay the foundation for a world-class competitive architecture.

---

## 2. Implementation Inventory & Capability Classification

Classification Legend:
- **A. Implemented & Tested**: Complete, backed by runnable code, automated tests, or live API pipelines.
- **B. Implemented but Untested**: Complete functional implementation, but lacking comprehensive unit/integration test coverage.
- **C. Partially Implemented**: Works under constrained conditions; missing edge cases or persistent storage.
- **D. Simulated / Demonstration**: Realistic parametric mock; visually representative but does not communicate with native CAD desktop kernels.
- **E. UI Only**: Visual component present with static or client-side placeholder data.
- **F. Not Implemented**: Defined in product roadmap but no underlying service exists.
- **G. Blocked by External Dependency**: Requires external native software licenses or Windows COM bridges.

| Subsystem / Capability | Current Classification | Code Location | Technical Truth & Findings |
|---|---|---|---|
| **Three.js 3D Viewport** | **A. Implemented & Tested** | `src/components/cad/ThreeCADViewport.tsx` | True procedural PBR rendering (`ExtrudeGeometry`, `MeshPhysicalMaterial`, `RoomEnvironment`, `OrbitControls`, clipping plane, engineering callouts). Zero external 404 dependencies. |
| **Multi-Turn Gemini Chatbot** | **A. Implemented & Tested** | `server.ts` (`/api/chat`), `src/components/agent/AICADAgentPanel.tsx` | Uses `@google/genai` on server side. Supports `gemini-3.8-flash`, `gemini-3.1-flash-lite`, and `gemini-4-argon` with system prompts and conversation history. |
| **Real-Time Voice API** | **B. Implemented but Untested** | `server.ts` (WebSocket `/api/live`), `src/components/agent/LiveVoiceConversationModal.tsx` | Implements `gemini-3.8-live` audio streaming (16kHz PCM input, 24kHz PCM output). Requires valid user API key at runtime. |
| **CAD Execution Engine** | **D. Simulated / Demonstration** | `server.ts`, `src/components/agent/AICADAgentPanel.tsx` | Previously claimed SolidWorks COM rebuilds occurred instantly in the browser. Web browsers cannot execute arbitrary Windows COM automation directly without a local bridge companion. |
| **Parametric Model Sync** | **C. Partially Implemented** | `src/App.tsx`, `src/components/cad/ThreeCADViewport.tsx` | Parameter updates successfully re-render the Three.js viewport and inspector, but modify client-side memory rather than native `.SLDPRT` files. |
| **Text-to-CAD Engine** | **C. Partially Implemented** | `src/components/views/TextToCadView.tsx`, `server.ts` (`/api/generate-cad`) | Generates structured JSON feature sequences via Gemini, but execution into native CAD requires desktop companion bridge. |
| **Drawing-to-CAD Vector Extraction** | **D. Simulated / Demonstration** | `src/components/views/DrawingToCadView.tsx` | High-fidelity blueprint UI and extracted parameter cards; OCR extraction is simulated rather than executing OpenCV/Tesseract vectorizer. |
| **Reverse Engineering** | **E. UI Only** | `src/components/views/ReverseEngineeringView.tsx` | Visual deviation display; lacks real point cloud mesh segmentation solver. |
| **Assembly Intelligence** | **C. Partially Implemented** | `src/components/views/AssemblyIntelligenceView.tsx` | Working exploded view slider and BOM roll-up; collision detection uses bounding approximations rather than CAD B-Rep interference kernels. |
| **Simulation Intelligence (FEA)** | **C. Partially Implemented** | `src/components/views/SimulationIntelligenceView.tsx` | Calculates real Euler-Bernoulli beam stresses and factor of safety dynamically; contour visualizer is a styled SVG mesh rather than NASTRAN/CalculiX solver. |
| **Automation Studio** | **E. UI Only** | `src/components/views/AutomationStudioView.tsx` | Visual DAG nodes with timed step execution; lacks a durable background queue engine with persistent graph state. |
| **Background Tasks** | **E. UI Only** | `src/components/views/BackgroundTasksView.tsx` | Static display of simulated background tasks. |
| **Verification Center** | **D. Simulated / Demonstration** | `src/components/views/VerificationCenterView.tsx`, `src/components/bottom/BottomConsole.tsx` | Displays preloaded Euler and tolerance check results. Needs real independent verification engine calculating B-Rep topology. |
| **Desktop CAD Companion Bridge** | **F. Not Implemented** | N/A | Missing native desktop WebSocket bridge to Windows SolidWorks/CATIA COM interfaces. |
| **Enterprise RBAC & Audit** | **E. UI Only** | `src/components/views/AdministrationView.tsx` | Static tables for audit logs and roles. |

---

## 3. Investigation of Known Architectural Concerns

### 3.1. False-Success Problem
- **Finding:** In earlier prototypes, sending a chat message such as *"Increase thickness to 15mm"* would immediately report:  
  `[10:25:18.112] [INFO] SwBridge: SwApp.ActiveDoc.ForceRebuild3 -> OK. ReturnCode: 0`  
  even though no SolidWorks process was connected to the browser.
- **Truth:** A web browser running in Google Cloud Run cannot connect to a user's local Windows COM desktop without a pairing token and a local daemon.
- **Remediation:** The execution lifecycle must transition from fake instant successes to an explicit multi-state lifecycle:
  `REQUESTED → UNDERSTOOD → PLANNED → VALIDATED → AWAITING_APPROVAL → EXECUTING → EXECUTED → VERIFYING → VERIFIED → COMPLETED`.
  If the local companion bridge is disconnected, the system must clearly show `SIMULATED_PREVIEW_ONLY` and report that native CAD execution did not occur.

### 3.2. Three.js vs. Native Parametric B-Rep
- **Finding:** Modifying dimensions in the property panel re-evaluates Three.js `ExtrudeGeometry`.
- **Truth:** Three.js is a polygonal mesh visualizer, not a boundary representation (B-Rep) parametric kernel. It cannot replace a Parasolid (`.x_t`) or ACIS (`.sat`) model.
- **Remediation:** Explicitly label the 3D viewport as `[WebGL Procedural Preview]` and provide export pipelines to true parametric formats (STEP AP214/AP242) and native `.SLDPRT`.

### 3.3. Independent Verification Engine
- **Finding:** The verification badge displayed "All Checks Passed" based on hardcoded sample data.
- **Truth:** Competitive CAD platforms (e.g. MecAgent, Zoo) differentiate through verifiable geometry checks (Euler genus verification, minimum wall thickness, tool accessibility, hole-to-edge margin).
- **Remediation:** Build a deterministic verification library in TypeScript/Node.js that audits dimensional constraints, volume, Euler topology ($V - E + F = 2(1 - g)$), and wall thickness independently of the AI generator.

---

## 4. Remediation Plan

1. Create `docs/roadmap/01_PRODUCT_GAP_ANALYSIS.md` detailing exact technical requirements to match MecAgent and SOLIDWORKS.
2. Build `docs/architecture/` specifications for Desktop Companion, CAD Adapter SDK, Typed Operation IR, Agent Orchestration, Verification Engine, and Security.
3. Implement `src/services/cad/cadOperationIR.ts`: A typed Intermediate Representation (IR) for CAD operations.
4. Implement `src/services/verification/verificationEngine.ts`: A real, deterministic geometric verification engine.
5. Implement `desktop-companion/bridge.ts`: A secure local companion bridge protocol for Windows CAD software.
6. Update the frontend UI to display real execution states (`NATIVE_CAD_EXECUTED` vs `SIMULATED_PREVIEW`).
