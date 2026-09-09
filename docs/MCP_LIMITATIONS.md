# AKIRA MCP V1 — Explicit Security Limitations

In accordance with strict application security principles, this document provides an honest, comprehensive list of what the **V1 Model Context Protocol (MCP)** implementation protects against, and what is explicitly deferred or out of scope for V1.

---

## 1. Transport Layer Binding: JWT-SVID vs. Native mTLS Socket

- **Current Implementation (V1)**: The MCP session is bound to an ephemeral, cryptographically signed JWT-SVID. The token's signature, expiry, database revocation status, and parent key status are re-verified on **every single tool invocation** (no connection caching).
- **V1 Limitation**: Client cert-based mutual TLS (mTLS) termination where the client's X.509 certificate is bound directly to the TCP socket is not yet implemented at the Bun HTTP server layer. An attacker who steals an in-flight ephemeral token before its 5-minute expiry could theoretically present it from another IP if reverse-proxy IP headers are spoofed.
- **V2 Roadmap**: Implement mTLS socket peer-certificate extraction via Envoy or NGINX ingress.

---

## 2. Distributed Rate Limiting

- **Current Implementation (V1)**: Sliding-window rate limiting and closed-loop abuse tracking are held in high-speed in-process memory (`backend/src/mcp/rate-limit.js`).
- **V1 Limitation**: If AKIRA is scaled horizontally across multiple Bun container replicas behind a load balancer without sticky sessions, rate limits are enforced per-replica rather than globally.
- **V2 Roadmap**: Introduce an optional Redis/Valkey cluster for distributed atomic token-bucket synchronization.

---

## 3. Autonomous Write-Action Containment Tools

- **Current Implementation (V1)**: AI agents are exposed to investigation, risk scoring, baseline telemetry, and controlled attack simulations on eligible test targets.
- **Intentional Design Limitation**: AI agents are **NOT** permitted to execute autonomous permanent containment (e.g. `quarantine_nhi`, `rotate_root_credential`, `disable_identity`) without human-in-the-loop approval. AKIRA's core philosophy mandates that the LLM is an investigator and caller, never the final security decider.
- **V2 Roadmap**: Interactive human-in-the-loop approval workflows where the agent proposes containment and a human SOC analyst signs off via WebAuthn or one-time approval tokens.

---

## 4. LLM Hallucination of Legitimate Object IDs

- **Current Implementation (V1)**: Strict schema validation ensures every `keyId` is a valid 24-character hexadecimal ObjectId, and `confused-deputy.js` verifies the caller has ownership rights.
- **V1 Limitation**: Schema validation cannot prevent a model from hallucinating a valid 24-character hex ID that belongs to its own tenant but isn't the identity the analyst intended to inspect.

---

## 5. Multi-Tenant Organizational Hierarchies

- **Current Implementation (V1)**: The confused-deputy module enforces owner-level matching (`target.owner === caller.owner`).
- **V1 Limitation**: Complex enterprise hierarchies (e.g. parent conglomerates, sub-accounts, business unit boundaries, or departmental cross-grants) are not yet represented in AKIRA's data model.

---

## 6. Threat Intel Air-Gap Fallbacks

- **Current Implementation (V1)**: Geolocation distance and IP reputation rely on external threat intelligence services.
- **V1 Limitation**: In completely air-gapped environments without egress access, external threat feeds fall back to default reputation scoring, relying solely on local behavioral deviations and hardware attestation.
