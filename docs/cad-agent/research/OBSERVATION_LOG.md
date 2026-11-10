# Observation Log

L1 T6 and T7 record here what was seen with the reference app running. As of 2026-11-08 nothing has been observed at run time, so this log has no rows yet. The ledger entries behind that are in `docs/loops/L1_INVESTIGATE.md`.

## Captures (T6)

None. T6 was skipped: REA's own documentation says its scenario capture needs the app to honour Node inspector flags (quoted in the T6 entry, `docs/loops/L1_INVESTIGATE.md#Target fuse prerequisites`), and the reference ships with that fuse disabled (`docs/cad-agent/research/ARCHITECTURE_OBSERVED.md`). Flipping the fuse, adding a debugging launch flag or running the archive under another Electron binary would break I8, so none was tried. The app was not launched.

## Walkthrough runs (T7)

None. The human skipped the walkthrough on 2026-11-08, with 0 runs.

## Screenshot inventory

None. Screenshots would live under .rea/screens/ and never enter the repo.

## Adding rows later

If runtime evidence arrives later, add rows here, then upgrade the matching labels in `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md`.

- Capture rows: scenario, windows opened, IPC sequence, child processes, blocked effects, REA evidence id.
- Walkthrough rows: module, input, what happened, duration, screenshot file name under .rea/.
