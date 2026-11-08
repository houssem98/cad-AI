# MechForge AI — Parametric CAD Operation Intermediate Representation (IR)
**Document ID:** `docs/architecture/CAD_OPERATION_IR.md`  

---

## 1. Overview & Purpose

The **CAD Operation IR** is a strongly-typed, declarative, JSON-serializable schema that decouples natural language requirements and AI reasoning from proprietary CAD macro languages.

### Pipeline:
```
Natural Language Prompt
       │
       ▼
[Requirement Extraction Engine]
       │
       ▼
[CAD Operation Intermediate Representation (IR)]
       │
       ▼
[Deterministic Validation & Constraint Check]
       │
       ▼
[Human Approval Gatekeeper]
       │
       ▼
[CAD Adapter Dispatcher: SolidWorks / CATIA / Fusion 360]
```

---

## 2. Typed Intermediate Representation (IR) Schema

```typescript
export interface CADOperationPlan {
  planId: string;
  sourcePrompt: string;
  targetSystem: 'SOLIDWORKS' | 'CATIA_V5' | 'FUSION_360' | 'NX' | 'ONSHAPE';
  units: 'MMGS' | 'IPS' | 'MKS';
  targetDocument: string;
  operations: CADIRCommand[];
  requiresApproval: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export type CADIRCommand =
  | CreateSketchCommand
  | ExtrudeBossCommand
  | CutExtrudeCommand
  | HolePatternCommand
  | ApplyFilletCommand
  | AssignMaterialCommand;

export interface ExtrudeBossCommand {
  type: 'EXTRUDE_BOSS';
  featureName: string;
  sketchRef: string;
  depthMm: number;
  direction: 'NORMAL' | 'REVERSE' | 'MID_PLANE';
  draftAngleDeg?: number;
}

export interface CutExtrudeCommand {
  type: 'CUT_EXTRUDE';
  featureName: string;
  sketchRef: string;
  depthMm: number | 'THROUGH_ALL';
  direction: 'NORMAL' | 'REVERSE';
}

export interface HolePatternCommand {
  type: 'HOLE_PATTERN';
  featureName: string;
  diameterMm: number;
  depthMm: number | 'THROUGH_ALL';
  positions: { x: number; y: number }[];
  standard: 'ANSI_METRIC' | 'ISO' | 'DIN';
  counterbore?: { diameterMm: number; depthMm: number };
}

export interface ApplyFilletCommand {
  type: 'APPLY_FILLET';
  featureName: string;
  radiusMm: number;
  edgeSelectionCriteria: 'ALL_TANGENT' | 'INTERSECTING_BASE' | 'VERTICAL_CORNERS';
}

export interface AssignMaterialCommand {
  type: 'ASSIGN_MATERIAL';
  materialName: string;
  database: 'SOLIDWORKS_MATERIALS' | 'CUSTOM';
  densityGPerCm3: number;
  yieldStrengthMPa: number;
}
```
