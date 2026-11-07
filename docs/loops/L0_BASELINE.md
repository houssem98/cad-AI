# L0 Baseline

Phase 0 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Environment and baseline". Needs no other loop. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#End with a clear GO / BLOCKED decision for Phase 1.`

Deciding rule, fixed before T1 starts: T0 and T1 are ticked, `npm run gate` exits 0 on the tick that ticks T1, and the human's signoff line (T2) is in the Journal.

## Current state (read 2026-11-07; T0 re-verifies)

- Not a git repository. The folder holds the human's input (copied verbatim to `docs/roadmap/MECAGENT_ROADMAP.md`), a clone of the REA source in rea/, a portable Node 24 in node24/, and these loop files. `.gitignore` excludes rea/, node24/, `.rea/` and the original input file.
- Tools: node v25.8.1 on PATH, Python 3.12.10, git 2.53. The REA MCP server is connected to Claude Code; among its tools are inspect_desktop_application, inspect_electron_fuses, inspect_managed_artifact and capture_electron_scenario.
- Reference app: MecAgent desktop 2.12.1, per-user install under %LOCALAPPDATA%\mecagent-app\app-2.12.1. An Electron shell (resources\app.asar, 108.5 MB, Squirrel updater) plus a .NET sidecar in resources\win-x64: MecAgent.dll, MecAgent.SolidWorks.Host.dll, MecAgent.SolidWorks.Lifecycle.dll, MecAgent.SolidWorks.Protocol.dll, EdgeJs.dll (in-process Node to .NET bridge), WPF assemblies and Newtonsoft.Json. INFERRED from file names only: the live agent drives SolidWorks over COM from that sidecar.
- No CAD software: no SolidWorks key under HKLM or HKCU\SOFTWARE, no SOLIDWORKS Corp folder in Program Files, no FreeCAD. The reference's live-agent workflow cannot run on this machine.

## Tasks

- [x] T0 Init. needs: none. Run `git init`, then commit exactly the setup files (`CAD_AGENT_LOOP.md`, `package.json`, `.gitignore`, `docs/LOOP_GRAPH.md`, `docs/LOOP_CONVENTIONS.md`, `docs/loops/`, `docs/roadmap/MECAGENT_ROADMAP.md`, `scripts/graph-lint.mjs`, `scripts/gate-guard.mjs`, `scripts/clean-room-lint.mjs`, `.claude/commands/cad-agent.md`) as `chore: add CAD agent loop graph`. Then run the three self-checks. Evidence: `node scripts/graph-lint.mjs --self-check`, `node scripts/clean-room-lint.mjs --self-check` and `node scripts/gate-guard.mjs --self-check` each exit 0; `npm run gate` exits 0; `git log --oneline` shows the commit.
- [x] T1 Environment audit. needs: T0. Write `docs/cad-agent/PHASE_00_ENVIRONMENT_AUDIT.md` (new) covering the roadmap's four Phase 0 tasks: verified OS and tools with versions, the REA tools the MCP server lists this tick, the reference install re-read this tick (plain-text paths), CAD software found or absent with the command that showed it, required dependencies, prerequisites for a real CAD integration, and risks. Every fact quotes the command that produced it. It ends with exactly one line `Decision: GO` or `Decision: BLOCKED — <reason>`. Missing CAD software blocks L9, not L1. Evidence: graph-lint exits 0 and `grep -E "^Decision: (GO|BLOCKED)" docs/cad-agent/PHASE_00_ENVIRONMENT_AUDIT.md` exits 0.
- [x] T2 (human) Signoff. needs: T1. The human reads the audit and agrees or corrects the decision. Evidence: the signoff line in the Journal.

## Journal

- 2026-11-07 · L0/T0 · started T0
- 2026-11-07 · L0/T0 · passed · gate green · commit 4e900b0 · git init; setup files committed as `chore: add CAD agent loop graph` (20 files, nothing else untracked: `git status --porcelain --untracked-files=all` listed only staged files); disk 12G free of 237G (96% used), watch for L2 installs · Direction: still the goal, baseline before investigation · Next: T1

  ```
  graph-lint self-check: 23 assertions passed
  clean-room-lint self-check: 7 assertions passed
  gate-guard self-check: 21 assertions passed
  graph-lint: 14 docs · 115 citations (55 file, 0 line range, 40 literal, 20 planned)
  graph-lint: clean
  clean-room-lint: 20 tracked files · 0 fingerprints · 0 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
  4e900b0 chore: add CAD agent loop graph
  ```
- 2026-11-07 · L0/T1 · started T1
- 2026-11-07 · L0/T1 · passed · gate green · commit a84f64b · wrote `docs/cad-agent/PHASE_00_ENVIRONMENT_AUDIT.md`: Windows 10.0.26300 AMD64, node v25.8.1, Python 3.12.10 on PATH is a foreign venv (antigravity gravity-api), .NET runtimes 10.0.14 with no SDK, no CAD software (7 registry probes absent), reference app 2.12.1 build 2026-11-02 re-listed, REA answers (6 workflows), disk 12G free, memory 1.1 GB free; `Decision: GO`. Also gitignored `.claude/scheduled_tasks.lock`, the /loop scheduler's lock for this session (read: sessionId and pid only) · Direction: still the goal; the risks table (disk, memory, foreign venv) feeds L2 T1 · Next: T2 (human) signoff, then L1 T0 (human) scope

  ```
  grep -E "^Decision: (GO|BLOCKED)" → Decision: GO   (exit 0; before writing the doc it exited 2: No such file or directory)
  graph-lint: 15 docs · 111 citations (46 file, 0 line range, 45 literal, 20 planned)
  graph-lint: clean
  clean-room-lint: 20 tracked files · 0 fingerprints · 0 identifiers
  clean-room-lint: clean
  gate-guard: clean · HEAD..working tree
  ```
- 2026-11-07 · L0/T2 · passed · gate green · commit loop(L0/T2) (this entry's own commit) · human signoff in chat: "go  ahead  tick L0", agreeing with `Decision: GO` in `docs/cad-agent/PHASE_00_ENVIRONMENT_AUDIT.md`; the agent ticked T2 and the L0 loop line on the human's instruction (driver rule 4) · Direction: still the goal; baseline done, investigation next · Next: L1 T0 (human) scope
