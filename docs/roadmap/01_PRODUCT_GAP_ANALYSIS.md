# MechForge AI — Competitive Gap Analysis & Benchmark Comparison
**Document ID:** `docs/roadmap/01_PRODUCT_GAP_ANALYSIS.md`  
**Benchmarked Competitors:** MecAgent, Zoo / Zookeeper, Adam, LEO AI, DraftAid, SOLIDWORKS, CATIA V5, Siemens NX, Onshape  

---

## 1. Competitive Landscape Matrix

| Platform | Core Strength | CAD Execution Mode | Verification Mechanism | Primary Limitation | MechForge AI Opportunity |
|---|---|---|---|---|---|
| **MecAgent** | Desktop companion for SolidWorks/CATIA | Local Windows daemon via COM APIs | Post-rebuild feature tree inspection | Closed proprietary beta; limited web workspace | Provide unified web + desktop companion with open typed SDK |
| **Zoo (Text-to-CAD)** | Machine-learning geometry synthesis | Generates STEP/GLB via server-side B-Rep kernel (KittyCAD) | B-Rep parsing & volume check | Limited editing of complex native CAD feature trees | Support native feature tree regeneration in SolidWorks/CATIA |
| **Adam / LEO AI** | Generative concept modeling & drafting | Web-based parametric generation | Visual comparison | Does not execute inside enterprise desktop CAD seats | Direct bi-directional bridge to active engineer desktop seats |
| **DraftAid** | Automated 2D drawing generation from 3D models | CAD add-in / DXF generation | Dimension comparison | Focuses on drafting rather than 3D parametric synthesis | Combine 3D parametric generation with automated drafting |
| **SOLIDWORKS** | Industry standard desktop mechanical CAD | Native Parasolid kernel | Native rebuild checker & interference detection | High barrier to entry; no native autonomous AI agent | Act as the AI Copilot operating natively inside SolidWorks |
| **Onshape** | Cloud-native parametric CAD | Server-side FeatureScript | Full version tree & mate constraints | Web-only; requires migration away from legacy desktop CAD | Bridge both desktop CAD (SolidWorks/CATIA) and cloud CAD |

---

## 2. Critical Gap Breakdown & Solutions

### Gap 1: Browser-to-Desktop CAD Isolation
- **Problem:** Browsers cannot access Windows COM (`SldWorks.Application`, `CATIA.Application`) or Unix sockets due to browser sandbox security.
- **Competitor Benchmark:** MecAgent uses a local Windows companion daemon paired via secure WebSocket.
- **MechForge AI Solution:** Design and package a lightweight, open-source Desktop Companion daemon (`desktop-companion/`) communicating via WebSocket with JSON-RPC 2.0 and typed CAD Intermediate Representation (IR).

### Gap 2: The "False-Success" Phenomenon
- **Problem:** Generic AI demos pretend a command like *"Add 4 mounting holes"* immediately succeeded in SolidWorks even when no SolidWorks process is running.
- **Competitor Benchmark:** Enterprise engineering software requires strict deterministic state machines.
- **MechForge AI Solution:** Implement the 10-stage execution lifecycle:
  `REQUESTED → UNDERSTOOD → PLANNED → VALIDATED → AWAITING_APPROVAL → EXECUTING → EXECUTED → VERIFYING → VERIFIED → COMPLETED`
  with explicit failure and standby states (`BRIDGE_OFFLINE`, `SIMULATED_PREVIEW_ONLY`).

### Gap 3: Missing Typed CAD Intermediate Representation (IR)
- **Problem:** Direct translation from natural language into raw VBA/Python scripts is brittle, error-prone, and prone to syntax failures.
- **Competitor Benchmark:** Zoo utilizes typed Rust/Python ASTs for KittyCAD.
- **MechForge AI Solution:** Implement `CADOperationIR`: a typed, declarative JSON schema representing sketches, constraints, dimensions, extrusions, cuts, holes, and fillets with unit normalization.

### Gap 4: Independent Geometric Verification
- **Problem:** Previous verification UI simply showed a static checkmark and an Euler equation formula.
- **Competitor Benchmark:** Industrial quality assurance requires multi-factor boundary audits.
- **MechForge AI Solution:** Build `VerificationEngine` with:
  1. Manifold Euler genus check: $V - E + F = 2(1 - g)$ where $g$ is the number of through-holes.
  2. Bounding box & nominal dimension compliance check within specified tolerance ($\pm 0.05\text{ mm}$).
  3. Minimum wall thickness heuristic check ($\ge 3.0\text{ mm}$ for machined aluminum).
  4. Hole-to-edge margin check ($\ge 1.5 \times \varnothing$).
  5. Native CAD rebuild exit code verification.

### Gap 5: Durable Background Job Execution
- **Problem:** Background tasks were represented by static cards in the UI without real async queue management.
- **Competitor Benchmark:** Enterprise platforms use durable task state machines with retry policies and persistent logs.
- **MechForge AI Solution:** Implement `BackgroundExecutionService` managing asynchronous task state, stage progression, timestamps, logs, and artifacts.
