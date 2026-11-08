# MechForge AI — Responsive Workspace & Anti-Collision Overhaul

Complete architectural and visual redesign of MechForge AI to eliminate viewport collisions, replace rigid fixed-pixel panels with a flexible responsive layout, streamline the top header into a zero-collision single-tier toolbar, and elevate the entire platform with an ultra-clean enterprise industrial design system.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following high-level product decisions during Phase 1 clarification:
> - **Workspace Layout**: Flexible responsive layout with collapsible panels (Agent panel & Inspector panel toggleable/collapsible) and clean floating viewport controls to ensure the 3D CAD canvas always commands optimal screen real estate.
> - **Visual Design System**: Ultra-clean enterprise industrial dark theme (`#090d16` canvas, `#0f172a` structural surfaces, `#1e293b` hairline borders, and restrained electric blue/cyan accents).
> - **Top Header**: Compact single-tier header with auto-collapsing status indicators, responsive search bar, and sleek dropdowns to prevent overlapping on any viewport width ($\ge 1024\text{px}$).

---

### 1. Overview & Core Concept

- **What It Does**: Resolves all layout crowding and UI collisions observed in smaller viewports and multi-panel modes. The 3D CAD viewport expands dynamically, floating controls adapt without overlapping tabs or view cubes, side panels collapse smoothly into compact toolbars, and the top navigation remains crisp and collision-free.
- **Target Audience**: Mechanical engineers, CAD designers, FEA specialists, and manufacturing teams who demand high-density precision interfaces without cluttered text wrapping or broken toolbars.
- **Key Value**: Delivers an unconstrained, professional CAD environment where interactive 3D geometry, AI generative loops, and technical property trees coexist seamlessly on any desktop screen resolution.

---

### 2. User Experience & Visual Design

#### A. Layout Geometry & Collapsible Docking
- **Global Sidebar**: Compact 60px icon strip with hover labels, expandable to full 220px drawer on demand, saving 160px of horizontal space for the core CAD viewport.
- **AI CAD Agent Panel**: Collapsible left panel (360px expanded, 44px collapsed rail). Features a clean top title bar, scrollable chat stream, pre-execution approval cards, and deliverables download cards without horizontal scrollbars.
- **Center 3D Viewport**: Unconstrained `flex-1` container.
  - *Viewport Toolbar*: Replaced rigid 12-button horizontal bar with a compact, grouped floating pill bar (Navigation tools, Analysis tools, Visual style dropdown) that neatly centers at the top or bottom of the 3D scene without overlapping the model tab bar (`Mounting_Bracket.SLDPRT`).
  - *Orientation View Cube & Presets*: Integrated into a single unified top-right overlay with zero overlap.
  - *Dimensional Annotations*: Responsive 3D-to-2D projected badges that automatically clamp to viewport boundaries.
- **Right Inspector Panel**: Collapsible right panel (300px expanded, 44px collapsed rail). Segmented tab controls for Properties, Feature Tree, and BOM.
- **Bottom Console**: Compact dockable tray with tabs for Operation History, Verification Results, and Task Progress, with a collapsible Verification Summary widget.

#### B. Visual Identity & Theme Tokens
- **Canvas Base**: Deep industrial slate-black (`#080c14`).
- **Structural Surfaces**: Refined dark slate (`#0d1424` / `#111b2f`) with crisp hairline borders (`#1e293b`).
- **Accent Budget (10%)**: Precision cobalt blue (`#2563eb`) and electric cyan (`#06b6d4`) for active states, focus rings, and primary action gates.
- **Typography**: Clean display sans (`Plus Jakarta Sans`) paired with monospace tabular figures (`JetBrains Mono`, `tabular-nums`) for dimensions, tolerances, and timestamps.
- **Zero-Pill Discipline**: Status indicators rendered as unboxed text with subtle typographic separators (`·`), avoiding bloated candy capsules.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Flexible Flexbox/Grid Docking vs. Rigid Fixed Pixel Widths**
  - *Chosen Approach*: Replace `w-[375px] min-w-[340px]` and `w-[300px]` with flexible columns that auto-collapse or provide one-click collapse toggles.
  - *Why*: Fixed pixel layouts consume 900px+ before the 3D viewport is even rendered, starving the WebGL canvas on typical 1080p and laptop screens.
- **Decision 2: Floating Viewport Overlay Controls vs. Inline Flow Header**
  - *Chosen Approach*: Float CAD tools inside the 3D viewport container with backdrop blur (`backdrop-blur-md bg-[#0d1424]/85 border border-[#1e293b]`).
  - *Why*: Decouples the document tabs (`Mounting_Bracket.SLDPRT`) from the tool actions (Rotate, Pan, Fit, Measure), completely preventing tab collision.
- **Decision 3: Single-Tier Responsive Header Architecture**
  - *Chosen Approach*: Group status pills (`gemini-3.8-live`, `SolidWorks Bridge`) into a consolidated status cluster that gracefully collapses into icons on narrower viewports.
  - *Why*: Eliminates second-line wrapping and collision with the global search bar.

---

### 4. Technical Architecture & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TopNavigation (52px)                             │
│  [Logo + Org/Project Dropdowns]      [Search Ctrl+K]     [Status + User]    │
└─────────────────────────────────────────────────────────────────────────────┘
┌──────┬─────────────────────┬───────────────────────────┬────────────────────┐
│ Side │ AI CAD Agent        │ ThreeCADViewport (flex-1) │ Right Inspector    │
│ bar  │ (360px / Collapsed) │                           │ (300px / Collapse) │
│      │                     │ ┌───────────────────────┐ │                    │
│      │ • Chat Stream       │ │ Tabs: [Bracket.SLDPRT]│ │ • Properties       │
│      │ • Approval Gate     │ └───────────────────────┘ │ • Feature Tree     │
│ (60  │ • Deliverables Box  │ ┌───────────────────────┐ │ • BOM List         │
│  px) │                     │ │ Floating Viewport Bar │ │                    │
│      │                     │ └───────────────────────┘ │                    │
│      │                     │ [3D WebGL Canvas + Model] │                    │
├──────┴─────────────────────┴───────────────────────────┴────────────────────┤
│                       BottomConsole (Dockable / 180px)                      │
│  [Operation History]   [Verification Results]   [Logs]   │ [Verif Status]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Files to Update During Execution
1. `src/components/navigation/TopNavigation.tsx`: Responsive single-tier layout, responsive search sizing, and consolidated status indicators.
2. `src/components/cad/ThreeCADViewport.tsx`: Redesigned floating toolbars, responsive tab bar, non-colliding orientation gizmo, and clamped dimension callouts.
3. `src/components/agent/AICADAgentPanel.tsx`: Smooth collapse/expand rail, clean layout spacing, and contained action cards.
4. `src/components/inspector/RightInspectorPanel.tsx`: Collapsible side rail with full-width property fields and non-overflowing tree items.
5. `src/components/bottom/BottomConsole.tsx`: Responsive console tabs and flexible verification score card.
6. `src/App.tsx`: Coordinated workspace state managing panel collapse and responsive screen splits.

---

### 5. Verification & Quality Gates

- **Responsive Viewport Testing**: Test across 1280px (laptop), 1440px (desktop), and 1920px (ultrawide) to guarantee zero horizontal overflow or element overlap.
- **Interaction Testing**: Verify collapse/expand toggle interactions for Agent, Inspector, and Bottom Console.
- **3D Canvas Resizing**: Ensure Three.js renderer dynamically updates camera aspect ratio and viewport dimensions on panel resize.
- **Build & Lint Verification**: Execute `compile_applet` and `lint_applet` to confirm zero compilation or TypeScript errors.
