# Phase 0 Environment Audit

Read 2026-11-07, L0 T1. Scope: `docs/roadmap/MECAGENT_ROADMAP.md#PHASE 0 — ENVIRONMENT AND BASELINE AUDIT`. Every fact below quotes the command that produced it this tick. Reference-install paths are plain text by rule I5.

## 1. Verified environment

| Item | Value | Command |
|---|---|---|
| OS | Microsoft Windows [Version 10.0.26300.9818], AMD64 | `cmd /c ver`, `$PROCESSOR_ARCHITECTURE` |
| Node on PATH | v25.8.1, npm 11.11.0 | `node -v`, `npm -v` |
| Portable Node | v24.22.1 in node24/ (gitignored) | `./node24/node-v24.22.1-win-x64/node.exe -v` |
| Python on PATH | 3.12.10, but it is another project's venv: C:\Users\unicentrale\Downloads\antigravity\services\gravity-api\.venv; base interpreter C:\Users\unicentrale\AppData\Local\Programs\Python\Python312 | `which python`, `python -c "import sys; print(sys.prefix, sys.base_prefix)"` |
| pip | 25.0.1, inside that foreign venv | `python -m pip --version` |
| git | 2.53.0.windows.2 | `git --version` |
| .NET | runtimes Microsoft.NETCore.App 10.0.14 and Microsoft.WindowsDesktop.App 10.0.14; no SDK (empty output) | `dotnet --list-runtimes`, `dotnet --list-sdks` |
| bun | not installed ("command not found") | `bun --version` |
| Disk C: | 12G free of 237G, 96% used | `df -h /c` |
| Memory | 1.1 GB free of 11.9 GB at audit time | `Get-CimInstance Win32_OperatingSystem` |

## 2. Installed software relevant to the program

### Reference app (CONFIRMED by listing; internals not inspected, that is L1)

- Install root: C:\Users\unicentrale\AppData\Local\mecagent-app, holding Update.exe, mecagent-app.exe, packages\ and app-2.12.1\ (`ls`).
- Version file app-2.12.1\resources\.version: appVersion 2.12.1, commitHash 5791903d3442143cedd7e267e165dcd6a05f1e0e, buildTime 2026-11-02T17:22:13.438Z (`cat`).
- app-2.12.1\resources holds app.asar (113789109 bytes, `stat -c %s`), app.asar.unpacked\ and win-x64\ (`ls`).
- win-x64 holds 284 entries (`ls | wc -l`), among them EdgeJs.dll, MecAgent.dll, MecAgent.dll.config, MecAgent.deps.json, MecAgent.SolidWorks.Host.dll, MecAgent.SolidWorks.Lifecycle.dll, MecAgent.SolidWorks.Protocol.dll (`ls | grep -E "^(MecAgent|EdgeJs)"`).
- Squirrel installer logs and Update.exe sit at the root: the app self-updates. INFERRED: a later version may replace app-2.12.1 during L1; L1 should record the version it analysed.

### CAD software (CONFIRMED absent)

| Probe | Result | Command |
|---|---|---|
| HKLM\SOFTWARE\SolidWorks | absent | `reg query` |
| HKCU\SOFTWARE\SolidWorks | absent | `reg query` |
| HKLM\SOFTWARE\Autodesk, Dassault Systemes, PTC, Siemens, FreeCAD | absent | `reg query` |
| Program Files and Program Files (x86) entries matching solid, autodesk, dassault, siemens, ptc, freecad, onshape, creo, catia, inventor, fusion | none matched | `ls ... \| grep -i -E` |
| Python CAD kernels | `import build123d` and `import cadquery` raise ModuleNotFoundError | `python -c` |

## 3. REA capabilities actually available

- The REA MCP server answers: `guided_workflows` with action list returned six workflows this tick: investigate_feature, compare_application_versions, verify_reconstruction, trace_crash, audit_residual_unknowns, prepare_bounded_process_capture.
- The tools L1 plans to use are registered in this Claude Code session: inspect_desktop_application, inspect_electron_fuses, analyze_javascript_application, inspect_managed_members, trace_application_feature, capture_electron_scenario, export_evidence_bundle (`docs/loops/L1_INVESTIGATE.md#REA tools this loop uses`).
- Not usable on this host: recover_javascript_sources, whose schema states it runs on Linux x64 with util-linux prlimit.
- Not exercised against the reference yet: running them is L1 work after the human's scope decision (L1 T0).

## 4. Existing architecture and working functionality

The repo holds only the loop system (`git log --oneline`: 4e900b0 and 1e03d0e). No product code, no CAD integration, no AI integration, no database, no auth, no tests beyond the gate scripts' self-checks. The gate is `npm run gate` (`package.json#"gate"`).

## 5. Missing functionality

Everything in the roadmap's capability list (`docs/roadmap/MECAGENT_ROADMAP.md#Live CAD Agent`) is absent in our repo. Classification of each reference capability is L1's job.

## 6. Required dependencies (to be approved in L2 T1, not installed now)

- A project-local Python virtual environment created from the base interpreter, not the foreign venv on PATH.
- A CAD kernel package (recommended build123d on OpenCascade).
- The desktop stack (recommended Electron, React, TypeScript, Vite) and test tools (Vitest, Playwright, pytest).
- A model API key held outside the repo.
- For L9 only: a licensed SolidWorks 2024 to 2026 with its API SDK, and a .NET SDK (only runtimes are present).

## 7. Prerequisites for a real CAD integration

- Headless kernel path (L3): the L2 T1 approval, then a local venv and kernel install. Nothing licensed is needed.
- SolidWorks path (L9): a licensed install plus the .NET SDK. Neither exists, so L9 stays blocked until the human acts on L9 T0, which the roadmap anticipates: `docs/roadmap/MECAGENT_ROADMAP.md#If SolidWorks is unavailable, report BLOCKED and implement only the adapter contract and test doubles.`

## 8. Technical risks

| Risk | Evidence | Mitigation |
|---|---|---|
| Disk nearly full | 12G free, 96% used | Electron, OpenCascade wheels and Playwright browsers together can take several GB; the human frees space before L2 installs |
| Low free memory | 1.1 GB free of 11.9 GB | REA's analyze_javascript_application on a 113 MB asar defaults to a 1024 MiB analyzer heap; L1 T3 should use summary detail and source_paths to bound it, and close other apps first |
| Wrong Python | PATH resolves to another project's venv | L2 creates its own venv from the base interpreter and never installs into the foreign one |
| Reference self-updates | Squirrel Update.exe present | L1 records the analysed version (2.12.1) on every finding |
| No CAD host | all CAD probes absent | L3 uses a headless kernel; L9 waits on a license |
| Legal scope | the reference's EULA is unread | L1 T0 is a human decision before any REA run on the install |

## 9. Decision

L1 needs only the reference install, the REA server and the human's scope decision; all three are available or pending on the human. CAD software is absent, which blocks L9 and nothing earlier.

Decision: GO
