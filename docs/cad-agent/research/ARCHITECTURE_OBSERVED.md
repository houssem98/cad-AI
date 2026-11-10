# Architecture Observed

L1 T2, read 2026-11-08 from the installed reference app, version 2.12.1, at C:\Users\unicentrale\AppData\Local\mecagent-app\app-2.12.1. Two REA reads only, neither of which runs the app: a desktop-application inventory (evidence ev_87d17e8949686df4688913e46c53f16120d58450666e1996814278302c8afd3a, summary view ev_28644b250b24df9f7e6ab5ed55c4d667ae0ca5a908de4215a06c575e1124964d) and a fuse read of the main executable (evidence ev_3de36ac348abdec1980282c7b51d5a72e7d710a4de61ad2a7b05012120067574). Facts from the L0 listing are cited from `docs/loops/L0_BASELINE.md#Reference app:`. Everything below is our own description.

## Process model

- Electron desktop shell. INFERRED: REA found an app.asar archive in the resources folder, which marks an Electron app; it did not verify that the archive is valid or that it runs. Desktop inventory evidence.
- .NET code alongside the shell. CONFIRMED as files: REA found 1091 files whose PE headers declare .NET metadata, including the reference's own sidecar assemblies under resources\win-x64. Whether that code is loaded at run time is UNKNOWN. Desktop inventory evidence.
- Main executable: a 64-bit Windows PE file of about 214 MB. CONFIRMED. Fuse evidence.

## Node to .NET bridge

- INFERRED: the shell calls .NET in-process through the Edge.js bridge. REA's inventory lists files under resources\node_modules\electron-edge-js and resources\node_modules\edge-cs, and L0 listed EdgeJs.dll in the sidecar folder. File names do not prove the call path; T3 and T4 test it. Desktop inventory evidence, L0 listing.
- INFERRED from assembly names only (L0): the sidecar has a host, lifecycle and protocol part for SolidWorks, which suggests a typed message protocol between the shell and a SolidWorks driver. T4 tests this.

## Update mechanism

- Squirrel for Windows. CONFIRMED by listing: the install root holds Update.exe, a packages folder and Squirrel logs next to the versioned app-2.12.1 folder (`docs/cad-agent/PHASE_00_ENVIRONMENT_AUDIT.md#holding Update.exe`). The app updates itself, so every finding here applies to 2.12.1 only.

## Third-party dependencies, by name

- Electron (shell). INFERRED. Desktop inventory evidence.
- electron-edge-js and edge-cs (Node to .NET bridge). CONFIRMED as files. Desktop inventory evidence.
- Newtonsoft.Json and WPF assemblies in the sidecar folder. CONFIRMED as files by the L0 listing.
- Anything inside app.asar is UNKNOWN until T3.

## Fuse states

All eight fuses were read from one complete sentinel in the main executable. CONFIRMED, fuse evidence.

| Fuse | State | What it means for us |
|---|---|---|
| RunAsNode | disabled | The executable cannot be run as plain Node |
| EnableCookieEncryption | enabled | Cookies are encrypted at rest |
| EnableNodeOptionsEnvironmentVariable | disabled | NODE_OPTIONS is ignored |
| EnableNodeCliInspectArguments | disabled | Node inspector command-line flags are ignored |
| EnableEmbeddedAsarIntegrityValidation | enabled | The app checks app.asar against an embedded hash |
| OnlyLoadAppFromAsar | enabled | The app loads only from app.asar |
| LoadBrowserProcessSpecificV8Snapshot | disabled | Default V8 snapshot |
| GrantFileProtocolExtraPrivileges | enabled | file:// pages keep their extra privileges |

## What this decides for T6

The reference hardens its shell: integrity checking is on, loading is limited to app.asar, and the fuse-controlled inspector paths are off (the fuse read does not prove the app never enables the inspector by other means, per the fuse evidence's own limitations). Under I8 we change none of these. T6 may run only if REA's own launch and capture work against the app exactly as installed; if any step would need a fuse, an archive or a launch flag changed, T6 is skipped and quotes this section. Whether REA's capture works without changes was UNKNOWN until T6; T6 then skipped it (`docs/cad-agent/research/OBSERVATION_LOG.md`).

## Open for later tasks

- Electron version, renderer routes, IPC channels: T3.
- Sidecar message types and the SolidWorks API surface: T4.
- Whether the .NET code runs in the shell's process or a child process: T4 and T6.
