# MechForge AI — System Architecture Specification
**Document ID:** `docs/architecture/SYSTEM_ARCHITECTURE.md`  
**Revision:** 2.0.0 (Enterprise Architecture)  

---

## 1. High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                        |
|  +------------------------------------------+  +------------------------------------+ |
|  |     Web Engineering Workspace (React)    |  |    Local Desktop Companion (Node)  | |
|  |  - 3D Viewport (Three.js PBR Preview)    |  |  - Windows COM Discovery Service   | |
|  |  - AI CAD Agent (Gemini Multi-Turn)      |  |  - WebSocket JSON-RPC Server       | |
|  |  - Inspection, BOM & Verification UI     |  |  - Local Document Pairing Token    | |
|  +------------------------------------------+  +------------------------------------+ |
+---------------------------------------------------------------------------------------+
                                        | (HTTPS / WSS)
                                        v
+---------------------------------------------------------------------------------------+
|                                    GATEWAY & API TIER                                 |
|  - Express / Node.js Full-Stack Application Server                                    |
|  - Gemini API Gateway (@google/genai Server-Side SDK)                                 |
|  - Live Audio Streaming Bridge (/api/live WebSockets)                                 |
|  - Typed CAD Intermediate Representation (IR) Compiler                               |
+---------------------------------------------------------------------------------------+
                                        |
       +--------------------------------+-------------------------------+
       |                                                                |
       v                                                                v
+------------------------------------+        +-----------------------------------------+
|      AI ORCHESTRATION ENGINE       |        |      INDEPENDENT VERIFICATION ENGINE    |
|  - Requirement Extraction Agent    |        |  - B-Rep Topological Validity Checker   |
|  - CAD Feature Planning Agent      |        |  - Euler Genus Formula (V - E + F = 2)  |
|  - Parameter Normalizer (MMGS/IPS) |        |  - Dimensional Tolerance Compliance     |
|  - Human Approval Gatekeeper       |        |  - Minimum Wall Thickness Heuristics    |
|  - Error Recovery & Bounded Retry  |        |  - Signed Cryptographic Audit Token     |
+------------------------------------+        +-----------------------------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------------+
|                                NATIVE CAD INTEGRATION TIER                            |
|  +---------------------------+  +---------------------------+  +--------------------+ |
|  |    SolidWorks 2024 Adapter|  |    CATIA V5-6R2022 Adapter|  |   Cloud CAD (Fusion| |
|  |  - ISldWorks COM API      |  |  - CATIA.Application COM  |  |    360 / Onshape)  | |
|  |  - IPartDoc / IModelDoc2  |  |  - PartDocument.Part     |  |  - REST / Webhooks | |
|  |  - Native .SLDPRT / STEP  |  |  - Native .CATPart / STEP |  |  - FeatureScript   | |
|  +---------------------------+  +---------------------------+  +--------------------+ |
+---------------------------------------------------------------------------------------+
```

---

## 2. Core Subsystems

### 2.1. Web Engineering Workspace
- Provides the unified engineering cockpit.
- Renders high-fidelity Three.js 3D models with PBR brushed metals, room reflections, contact grounding, and dimension annotations.
- Distinctly separates the **Three.js Visual Preview** from **Native CAD Kernel Execution**.

### 2.2. Desktop Companion & Local CAD Bridge
- Lightweight local service running on the engineer's workstation.
- Discovers installed CAD instances (e.g., `SldWorks.Application.32`).
- Maintains an authenticated pairing session with the MechForge web app.
- Exposes typed JSON-RPC endpoints to query the active document, rebuild features, and export STEP files.

### 2.3. Typed CAD Operation Protocol (IR)
- Intermediate representation decoupled from any single proprietary CAD syntax.
- Defines standard parametric commands: `CreateSketch`, `ExtrudeBoss`, `CutExtrude`, `HoleWizard`, `Fillet`, `Chamfer`, `AssignMaterial`, `VerifyGeometry`.

### 2.4. Independent Verification Engine
- Operates independently from the AI generating agent.
- Formally validates geometry before declaring a task completed.
- Prevents false-success reports when CAD software fails to regenerate a feature.
