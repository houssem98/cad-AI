# MechForge AI — CAD Adapter SDK Specification
**Document ID:** `docs/architecture/CAD_ADAPTER_SDK.md`  

---

## 1. Adapter Contract Interface

Every CAD integration adapter implements a standard TypeScript interface:

```typescript
export interface ICADAdapter {
  readonly id: string;
  readonly name: string;
  readonly vendor: string;
  readonly targetSystem: 'SOLIDWORKS' | 'CATIA_V5' | 'FUSION_360' | 'NX' | 'ONSHAPE';
  
  // Lifecycle
  connect(): Promise<CADConnectionResult>;
  disconnect(): Promise<void>;
  ping(): Promise<number>;
  getCapabilityManifest(): CADCapabilityManifest;

  // Document Management
  inspectActiveDocument(): Promise<CADDocumentMetadata>;
  openDocument(filePath: string): Promise<boolean>;
  saveDocument(filePath?: string): Promise<boolean>;
  exportNeutralFile(format: 'STEP_AP214' | 'STEP_AP242' | 'STL' | 'IGES' | 'DXF'): Promise<string>;

  // Feature Tree Inspection & Rebuild
  getFeatureTree(): Promise<CADFeatureNode[]>;
  forceRebuild(): Promise<CADRebuildResult>;

  // Parametric Execution
  executePlan(plan: CADOperationPlan): Promise<CADExecutionResult>;
}
```

---

## 2. Capability Manifest Definition

Different CAD software packages have different capabilities. MechForge AI never assumes identical operations across systems:

```typescript
export interface CADCapabilityManifest {
  supportedOperations: {
    sketch2D: boolean;
    sketch3D: boolean;
    extrudeBoss: boolean;
    cutExtrude: boolean;
    revolveBoss: boolean;
    revolveCut: boolean;
    holeWizard: boolean;
    filletVariable: boolean;
    chamfer: boolean;
    draftAngle: boolean;
    shell: boolean;
    mirrorFeature: boolean;
    assemblyMates: boolean;
    drawingProjection: boolean;
    feaStressDirect: boolean;
  };
  supportedKernels: ('Parasolid' | 'ACIS' | 'CGM' | 'ShapeManager')[];
  maxPrecisionMm: number;
}
```

---

## 3. SOLIDWORKS COM Adapter Reference Implementation

For SOLIDWORKS, the adapter uses Windows COM automation via `SldWorks.Application`:

```typescript
// SldWorks COM invocation mapping
const swApp = winax.CreateObject('SldWorks.Application');
const swModel = swApp.IActiveDoc2;

// Rebuild invocation
const rebuildSuccess = swModel.EditRebuild3();
```

---

## 4. CATIA V5 Adapter Reference Implementation

For Dassault Systèmes CATIA V5, automation occurs through `CATIA.Application`:

```typescript
const catiaApp = winax.CreateObject('CATIA.Application');
const partDoc = catiaApp.ActiveDocument;
const part = partDoc.Part;
part.Update();
```
