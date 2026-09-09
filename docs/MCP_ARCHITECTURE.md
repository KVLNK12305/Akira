# AKIRA MCP Architecture & Subsystem Integration

## 1. Executive Summary

The **Model Context Protocol (MCP)** integration in AKIRA bridges autonomous AI agents (Claude, Cursor, Antigravity IDE, Windsurf, or custom LLM orchestrators) with enterprise Non-Human Identity (NHI) governance.

In modern enterprise architectures, AI agents do not merely suggest code; they act as **autonomous Non-Human Identities** executing tool calls against internal payment switches, risk engines, and databases. AKIRA sits as a Zero-Trust reverse proxy and security gateway in front of these operations.

The fundamental tenet is:
> **The AI Agent is a caller, never a security decider.**

---

## 2. End-to-End System Diagram

```text
                     Autonomous AI Agent (Claude / Cursor / IDE)
                                        │
                                        │ MCP (JSON-RPC 2.0 over HTTP / SSE)
                                        ▼
                      ┌────────────────────────────────────┐
                      │        AKIRA MCP Gateway           │
                      │  (backend/src/mcp/server.js)       │
                      └─────────────────┬──────────────────┘
                                        │
                      1. Session Identity Binding (Ephemeral SVID)
                      2. Confused-Deputy Query Scoping
                      3. Tiered Rate Limiting & Abuse Detection
                      4. Scope Matching & Policy Evaluation
                                        │
                         ┌──────────────▼──────────────┐
                         │     AKIRA Risk Sentinel     │◄─── Abuse / Probes
                         │   (Live 8-Signal Engine)    │     raise caller risk
                         └──────────────┬──────────────┘
                                        │
                                Fail-Closed Gate
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 [ALLOW: HTTP 200]             [DENY: HTTP 403 / 429]
                AKIRA Service Layer              Fail-Closed Handlers
              (backend/src/services/)          (WORM Hash Audit Log)
                         │                             │
                         ▼                             ▼
               MongoDB / Rust Core ──────► WORM Hash-Chained Audit
```

---

## 3. Core MCP Components

| Component | File Path | Primary Responsibilities |
|---|---|---|
| **Protocol Server** | `backend/src/mcp/server.js` | JSON-RPC 2.0 dispatcher (`initialize`, `tools/list`, `tools/call`, `resources/*`, `prompts/*`). |
| **Session Manager** | `backend/src/mcp/session.js` | Binds connection to verified SVID; re-verifies SVID on **every single tool invocation**; prevents mid-session identity switching. |
| **Authentication** | `backend/src/mcp/auth.js` | Validates JWT-SVID signature, expiration, database revocation status in `EphemeralToken`, and parent key quarantine. |
| **Authorization** | `backend/src/mcp/authorization.js` | Evaluates least-privilege scopes, risk-adaptive thresholds, and confused-deputy constraints. |
| **Confused-Deputy Scoper** | `backend/src/mcp/confused-deputy.js` | Prevents caller from querying keys outside authorized tenant/owner boundary. |
| **Rate Limiter & Abuse Feedback** | `backend/src/mcp/rate-limit.js` | Tiered in-memory sliding window; automatically reports repeated denials as `SCOPE_ESCALATION` or `VELOCITY_SPIKE` to Risk Engine. |
| **Prompt Injection Guard** | `backend/src/mcp/injection-guard.js` | Wraps untrusted free-text with `{ _untrusted: true, value: "..." }`; truncates strings > 500 chars; strips sensitive fields. |
| **WORM Audit Writer** | `backend/src/mcp/audit.js` | Synchronous, blocking, fail-closed audit logger using HKDF forward-secure hash chaining. |

---

## 4. Subsystem Integration Points

1. **Existing Risk Engine (`backend/src/services/riskEngine.js`)**:
   MCP tools call the existing `scoreNHIRequest` engine directly. There is no secondary or fake risk engine.
2. **Containment Service (`backend/src/services/containmentService.js`)**:
   When simulated attacks trigger critical risk, real key quarantine and token invalidation occurs via `quarantineKey`.
3. **Rust Native Core (`backend/src/utils/rustEngine.js`)**:
   Secure hardware attestation and zeroization are integrated into the scoring loop.
