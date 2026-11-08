# MechForge AI — Enterprise Security Model & Boundary Controls
**Document ID:** `docs/architecture/SECURITY_MODEL.md`  

---

## 1. Trust Boundaries

1. **Client Browser Tier (Untrusted):**
   - Can render WebGL previews and initiate prompts.
   - Strictly prohibited from holding API keys (`process.env.GEMINI_API_KEY` never sent to client).
   - Cannot directly issue raw OS or COM commands.
2. **API & Orchestrator Tier (Trusted Cloud/Server):**
   - Authenticates sessions and verifies RBAC permissions.
   - Validates typed `CADOperationIR` against schema before sending to desktop companions.
   - Restricts LLM code execution to declarative AST commands.
3. **Desktop Companion Bridge (Trusted Local Daemon):**
   - Binds exclusively to localhost (`127.0.0.1:8892`).
   - Requires pairing token with time-limited cryptographic signature.
   - Validates file paths to prevent arbitrary directory traversal outside configured CAD project folders.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Role | View 3D / BOM | Prompt AI Copilot | Approve Destructive Edit | Release Native .SLDPRT | Admin / Audit Logs |
|---|---|---|---|---|---|
| **Viewer / CAD Specialist** | Yes | Yes (Preview Only) | No | No | No |
| **Mechanical Design Engineer**| Yes | Yes | Yes | Yes | No |
| **Engineering Lead / Director** | Yes | Yes | Yes | Yes | Yes |
| **Enterprise Administrator** | Yes | Yes | Yes | Yes | Full Audit Access |
