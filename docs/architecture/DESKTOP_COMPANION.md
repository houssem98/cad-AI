# MechForge AI — Desktop Companion Architecture
**Document ID:** `docs/architecture/DESKTOP_COMPANION.md`  

---

## 1. Overview & Purpose

Web browsers are sandboxed environments that cannot directly invoke native Windows COM objects such as `CreateObject("SldWorks.Application")`. Attempting to simulate this directly in a browser without a local agent produces false successes.

The **MechForge Desktop Companion** is a secure, lightweight daemon (Node.js/TypeScript or Rust) installed on the CAD workstation that acts as the bridge between MechForge Cloud/Web and local CAD seats.

---

## 2. Desktop Bridge Communication Flow

```
+--------------------+        Pairing Handshake (Token)        +--------------------------+
| MechForge Web App  | -------------------------------------> | Desktop Companion Bridge |
| (Cloud / On-Prem)  | <------------------------------------- | (Port 8892 WebSocket)   |
+--------------------+                                        +--------------------------+
          |                                                                 |
          | 1. Submit Typed CAD IR Plan                                     | 2. Translate IR to COM API
          v                                                                 v
+--------------------+                                        +--------------------------+
| Agent Orchestrator |                                        | Native SolidWorks API    |
| (Validation Gate)  |                                        | - ISldWorks.ActiveDoc    |
+--------------------+                                        | - IModelDoc2.EditRebuild3|
                                                              +--------------------------+
```

---

## 3. Protocol & Handshake Specification

1. **Discovery & Health Check:**
   - Companion listens on `ws://127.0.0.1:8892`.
   - Web application probes `http://127.0.0.1:8892/health`.
   - If response `status: "ok"`, companion details (version, OS, detected CAD software) are displayed.
2. **Session Pairing:**
   - Web app sends a cryptographically signed session token:
     `{"method": "pair_session", "params": {"token": "mf_tok_...", "appletId": "..."}}`.
   - Desktop companion verifies token and binds the active document session.
3. **Document Inspection:**
   - Command: `{"method": "cad.inspect_active_document"}`
   - Response:
     ```json
     {
       "connected": true,
       "application": "SOLIDWORKS",
       "version": "2024 SP3.1",
       "activeDocument": {
         "title": "Mounting_Bracket.SLDPRT",
         "path": "C:\\Engineering\\Projects\\EVP\\Mounting_Bracket.SLDPRT",
         "isModified": false,
         "featureCount": 8,
         "units": "MMGS"
       }
     }
     ```
4. **Operation Execution:**
   - The companion validates the typed `CADOperationIR` plan, calls the native Windows COM dispatch, rebuilds the model, and queries the return code.
   - Return codes:
     - `0`: Success (Clean Rebuild)
     - `1`: Rebuild Warnings (Suppressed features or non-critical errors)
     - `2`: Rebuild Fatal Error (Topology broken, sketch unconstrained)
