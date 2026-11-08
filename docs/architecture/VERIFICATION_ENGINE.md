# MechForge AI — Independent Geometric Verification Engine
**Document ID:** `docs/architecture/VERIFICATION_ENGINE.md`  

---

## 1. Principles of Independent Verification

1. **Separation of Concerns:** The generative AI agent produces proposals and plans; it is strictly prohibited from marking its own work as passed. An independent, deterministic validation kernel performs audits.
2. **Multi-Factor Rigor:** One formula (such as Euler $V - E + F = 2$) is necessary but insufficient. Verification requires topological, dimensional, manufacturing, and rebuild checks.
3. **Cryptographically Signed Evidence:** Every audit record contains the document checksum, timestamp, expected value, measured value, and mathematical evidence.

---

## 2. Verification Check Categories

| Category | Check Name | Method | Failure Threshold |
|---|---|---|---|
| **Topology** | Manifold Boundary Audit | B-Rep Edge-to-Face valence check | $>0$ open/non-manifold edges |
| **Topology** | Euler-Poincaré Characteristic | $V - E + F = 2(S - g)$ ($S=1, g=\text{holes}$) | $\Delta \neq 0$ from expected genus |
| **Dimensions** | Bounding Box Precision | Laser caliper / B-Rep bounding limits | Deviation $> \pm 0.05\text{ mm}$ |
| **DFM** | Minimum Wall Thickness | Ray-casting normal distance map | Thickness $< 3.0\text{ mm}$ for aluminum |
| **Fasteners** | Hole-to-Edge Margin | Centroid distance to perimeter | Margin $< 1.5 \times \text{Diameter}$ |
| **CAD Kernel** | Feature Tree Rebuild Code | `EditRebuild3()` / `Part.Update()` | Exit code $\neq 0$ |

---

## 3. Standard Verification Record Schema

```typescript
export interface VerificationEvidenceRecord {
  checkId: string;
  category: 'TOPOLOGY' | 'DIMENSIONAL' | 'MANUFACTURABILITY' | 'FASTENERS' | 'CAD_REBUILD';
  checkName: string;
  expectedValue: string;
  actualValue: string;
  tolerance: string;
  status: 'PASSED' | 'FAILED' | 'WARNING' | 'NOT_CHECKED';
  sourceKernel: string;
  documentChecksum: string;
  timestamp: string;
  evidence: string;
}
```
