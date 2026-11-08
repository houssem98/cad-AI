# MechForge AI — CAD Evaluation & Benchmarking Plan
**Document ID:** `docs/benchmarks/CAD_EVALUATION_PLAN.md`  

---

## 1. Benchmarking Objectives

Evaluate MechForge AI against primary competitive benchmarks (MecAgent, Zoo, Adam, LEO AI, DraftAid) across 10 standardized mechanical design tasks.

---

## 2. Standardized Evaluation Tasks

1. **TASK-01: Parametric Mounting Bracket**
   - Base $80 \times 50 \times 10\text{ mm}$, vertical upright $50\text{ mm}$, $4\times \varnothing 8\text{ mm}$ mounting holes, center bore $\varnothing 24\text{ mm}$, $R2\text{ mm}$ fillets.
   - Metrics: Feature regeneration exit code, Euler genus compliance, volume error $<0.1\%$.
2. **TASK-02: Flanged Pipe Fitting**
   - Hex bolt circle with 8 holes, counterbored seal groove, pressure rating 300 psi.
   - Metrics: Bolt circle concentricity, sealing face flatness.
3. **TASK-03: Shaft Step Keyway**
   - Turned cylinder with stepped diameter and DIN 6885/1 keyway slot.
   - Metrics: Revolve boss accuracy, keyway tool clearance.
4. **TASK-04: Sheet Metal Enclosure**
   - Bent aluminum chassis with bend deduction, self-clinching PEM stud cutouts.
   - Metrics: Unfolded flat pattern generation, K-factor adherence.
5. **TASK-05: 2D Drawing Projection (Drafting)**
   - Orthographic front, top, side, and section views with ASME Y14.5 title block.
   - Metrics: View alignment, dimension line overlap count ($= 0$).
6. **TASK-06: FEA Stress Evaluation**
   - Cantilever load 3500 N, mesh convergence, safety factor validation.
   - Metrics: Solver correlation vs analytical Euler-Bernoulli equation.
7. **TASK-07: Assembly Interference Detection**
   - 4 fasteners mated into tapped holes.
   - Metrics: Collision detection accuracy (zero volumetric penetration).
8. **TASK-08: STEP AP242 Round-Trip**
   - Export native SolidWorks part to STEP, re-import, verify volume difference $<0.01\%$.
9. **TASK-09: Natural Language Constraint Recovery**
   - Intentionally ambiguous prompt missing hole spacing; verify agent pauses to ask for edge margin.
10. **TASK-10: Automated Feature Rollback**
    - Inject invalid fillet radius ($R > \text{thickness}$); verify recovery agent catches error and rolls back without model corruption.
