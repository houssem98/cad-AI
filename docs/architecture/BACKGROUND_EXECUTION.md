# MechForge AI — Background Execution & Durable Workers
**Document ID:** `docs/architecture/BACKGROUND_EXECUTION.md`  

---

## 1. Overview & Architecture

CAD regeneration, meshing, and multi-sheet drawing projections are computationally intensive tasks that cannot block synchronous HTTP requests.

MechForge AI uses a durable background task engine managing asynchronous jobs with persistent state, progress reporting, timeout bounds, and cancellation.

---

## 2. Task Lifecycle & Model

```typescript
export interface DurableBackgroundTask {
  taskId: string;
  projectId: string;
  userId: string;
  taskType: 'PARAMETRIC_SWEEP' | 'FEA_SOLVER' | 'DRAWING_PROJECTION' | 'POINT_CLOUD_RECONSTRUCTION';
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  currentStage: string;
  progressPercent: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  logs: TaskLogEntry[];
  artifacts: GeneratedArtifact[];
  verificationVerdict: 'VERIFIED' | 'PENDING' | 'FAILED';
}

export interface TaskLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface GeneratedArtifact {
  fileName: string;
  fileSizeBytes: number;
  format: 'SLDPRT' | 'STEP' | 'PDF' | 'DXF' | 'JSON';
  downloadUrl: string;
  sha256Checksum: string;
}
```
