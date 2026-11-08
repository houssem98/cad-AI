# MechForge AI — Agent Orchestration & State Machine
**Document ID:** `docs/architecture/AGENT_ORCHESTRATION.md`  

---

## 1. Execution Lifecycle State Machine

To eliminate false successes, MechForge AI enforces an immutable state machine for every engineering command:

```
[USER REQUEST]
       │
       ▼
  REQUESTED
       │
       ▼
  UNDERSTOOD ───(Missing dimensions?)───► [REQUEST HUMAN CLARIFICATION]
       │
       ▼
   PLANNED
       │
       ▼
  VALIDATED (AST Syntax & Units Checked)
       │
       ▼
AWAITING_APPROVAL ───(Rejected?)───► REJECTED
       │
   (Approved)
       ▼
   EXECUTING (Dispatched to Local Desktop Companion)
       │
       ├────(Bridge Offline?)────► BLOCKED (Bridge Standby)
       ├────(COM Rebuild Error?)─► FAILED (Enter Bounded Recovery)
       ▼
   EXECUTED (Exit code 0 received from SolidWorks)
       │
       ▼
   VERIFYING (Independent Verification Engine)
       │
       ├────(Tolerance Violated?)──► VERIFICATION_FAILED
       ▼
   VERIFIED (Euler, Dimension & DFM Audit Passed)
       │
       ▼
  COMPLETED (Document Saved & Release Artifact Generated)
```

---

## 2. Specialized Sub-Agents

1. **Requirement Understanding Agent:** Extracts engineering parameters, units (MMGS/IPS), and identifies underspecified constraints.
2. **CAD Planning Agent:** Constructs the feature dependency DAG and operation plan.
3. **CAD Execution Agent:** Coordinates with the Desktop Companion bridge and validates COM return codes.
4. **Independent Verification Agent:** Audits resulting geometry against expected engineering requirements.
5. **Recovery Agent:** Analyzes rebuild warnings, suggests fillet reduction or edge-margin fixes with a max retry bound of 3 iterations.
