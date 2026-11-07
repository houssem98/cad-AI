# MechForge AI — Enterprise AI Mechanical Engineering Platform

MechForge AI is an enterprise-grade AI operating environment for mechanical engineers, CAD specialists, and engineering directors. Built to bridge generative AI with deterministic parametric CAD software (SOLIDWORKS, CATIA, Autodesk Fusion, Siemens NX, Onshape) and independent geometric verification kernels.

---

## Key Modules & Capabilities

1. **AI CAD Agent (Primary Screen)**:
   - Full conversational engineering interface with structured execution plans.
   - Powered by Gemini multi-turn models: `gemini-3.8-flash` (general tasks), `gemini-3.1-flash-lite` (fast low-latency tasks), and `gemini-4-argon` (complex CAD & math reasoning).
   - Specialized copilot persona roles: CAD Automation Architect, FEA & Structural Analyst, DFM & Tooling Specialist, ASME Y14.5 Standards Auditor.
   - **Real-Time Gemini Live Voice Conversations (`gemini-3.8-live`)**: Full-duplex speech channel streaming 16kHz microphone audio and playing back 24kHz spoken responses with live visualizer.
   - Interactive 3D CAD viewport powered by Three.js with PBR brushed metals, room reflections, and dynamic dimension annotations.
   - Live synchronization: Prompting the copilot updates the 3D model geometry and properties in real-time.
   - Technical Properties, Feature Tree, and Bill of Materials (BOM) inspectors.
   - Operation history log and Verification Center certificate.

2. **Full-Featured 3D CAD Viewport**:
   - Orbit, Pan, Zoom, and Fit-to-View controls.
   - Orthographic & Isometric camera presets (ISO, Front, Top, Right, Back).
   - Render modes: PBR Shaded, Wireframe, Section View (live clipping plane), and X-Ray Translucent.
   - Interactive 3D Orientation Gizmo with RGB coordinate axes.
   - Dynamic engineering dimension callouts: 80mm length, 50mm width, 50mm height, Ø8mm hole callout.

3. **Text-to-CAD Specification Engine**:
   - Natural language requirements translated into fully constrained parametric AST feature sequences.
   - Target CAD selection (SolidWorks, Fusion 360, CATIA, NX, Onshape).

4. **Drawing-to-CAD Vector OCR**:
   - PDF blueprint interpretation, view classification (Front, Top, Section, Isometric).
   - Dimension and GD&T extraction with confidence indicators and uncertainty detection.

5. **Reverse Engineering & Scan-to-CAD**:
   - High-density point cloud inspection, deviation heatmaps, and NURBS surface fitting.

6. **Assembly Intelligence**:
   - Multi-body collision detection, mate constraint inspector, and interactive exploded view slider.

7. **Drawing Automation**:
   - 2D orthographic drafting projection sheets, ASME Y14.5 / ISO 128 title blocks, DXF/PDF export.

8. **Engineering Copilot & Calculation Hub**:
   - Verified closed-form engineering calculations (Euler-Bernoulli beam deflection and bending stress).
   - Searchable corporate standards and material property citations (ASME, ISO, MMPDS).

9. **Simulation Intelligence (FEA)**:
   - Static structural FEA solver with interactive Von Mises stress contour maps and factor of safety calculation.

10. **Automation Studio**:
    - Node-based DAG workflow orchestration for headless CAD automation pipelines.

11. **Background Tasks Queue**:
    - Distributed asynchronous job monitoring, progress tracking, and artifact downloads.

12. **Independent Verification Center**:
    - Deterministic B-Rep validation (Euler characteristic $V - E + F = 2$, manifold boundary check, tool clearance, wall thickness audits).

13. **Local CAD Bridge Architecture**:
    - Structured WebSocket / COM bridge protocol connecting browser AI to native desktop CAD instances without blind hallucinations.

14. **Enterprise Governance & Administration**:
    - Role-based access control (RBAC), immutable CAD operation audit ledgers, and human-in-the-loop approval gates.

---

## Technical Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **3D Graphics**: Three.js r160+ (PBR `MeshPhysicalMaterial`, `RoomEnvironment`, `OrbitControls`, clipping planes)
- **Icons**: Lucide React
- **Design System**: Industrial Graphite `#0b0f19`, slate panels `#101728`, technical typography (`JetBrains Mono`, `Inter`)
