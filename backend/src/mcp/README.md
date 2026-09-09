# AKIRA Model Context Protocol (MCP) Server

A hardened, zero-trust **Model Context Protocol (MCP)** interface for autonomous AI agents and developer assistants (Claude Desktop, Antigravity, Cursor, Windsurf).

AKIRA remains the sole security authority. AI agents are **callers**, never security **deciders**.

---

## 1. Architecture & Threat Model

```text
       Autonomous AI Agent (Claude, Cursor, Antigravity)
                              │
                              │ JSON-RPC 2.0 (HTTP / SSE / stdio)
                              ▼
                 ┌───────────────────────────┐
                 │    AKIRA MCP Gateway      │
                 └─────────────┬─────────────┘
                               │
               1. Transport SVID Verification (Per-Invocation)
               2. Confused-Deputy Boundary Check
               3. Tiered Rate Limiting & Abuse Detection
               4. Risk-Adaptive Policy Evaluation
                               │
                  ┌────────────▼────────────┐
                  │   AKIRA Risk Sentinel   │◄─── Probes feed back into
                  │   (Live 8-Signal Model) │     caller's own risk score
                  └────────────┬────────────┘
                               │
                       Fail-Closed Gate
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
       [ALLOW] Target Service         [DENY] Auto-Contain
        (Profile, Risk, Forensics)     (WORM Hash Audit Log)
```

---

## 2. Tools Catalog

| Tool Name | Risk Class | Required Scope | Description |
|---|---|---|---|
| `get_nhi_profile` | `READ` | `mcp:nhi:read` | Inspect identity metadata, baseline state, and active scopes. |
| `get_risk_score` | `READ` | `mcp:risk:read` | Retrieve live 0–100 risk score and containment status. |
| `get_risk_events` | `READ` | `mcp:risk:read` | Paginated query of anomaly evaluations and incidents. |
| `get_behavioral_baseline` | `READ` | `mcp:baseline:read` | Inspect learned baseline (typical hours, IPs, endpoints). |
| `investigate_nhi` | `INVESTIGATION` | `mcp:forensics:read` | Aggregate dossier of credentials, incidents, and baseline deviations. |
| `simulate_attack` | `SIMULATION` | `mcp:simulation:execute` | Execute controlled adversary attack against **simulation-eligible** keys only. |

---

## 3. Security Invariants & Hardening Controls

1. **Transport-Bound SVID**: Every call requires an ephemeral SVID (`type: ephemeral_svid`). Re-verified on every tool call (signature, expiry, revocation, and parent key quarantine).
2. **Confused-Deputy Scoping**: Identities cannot inspect arbitrary keys outside their authorized team/owner domain.
3. **Closed-Loop Risk Feedback**: Repeated unauthorized probing, rate-limit breaches, or simulation attacks against non-eligible targets report anomaly signals back into AKIRA's Risk Engine, degrading the calling agent's own risk score in real-time.
4. **Prompt-Injection Boundary**: All external free-text fields (reasons, error messages, user-agents, headers) are demarcated with `{ _untrusted: true, value: "..." }` and size-capped to 500 chars.
5. **Fail-Closed Everywhere**: If the database, risk engine, policy engine, or audit ledger fails, the tool call fails closed (`DENY`).
6. **Synchronous Hash-Chained Audit**: Every tool call and denial is written synchronously to the HKDF forward-secure WORM audit ledger before returning.

---

## 4. Client Configuration

### Claude Desktop / Antigravity IDE (`mcp_config.json`)
```json
{
  "mcpServers": {
    "akira-sentinel": {
      "url": "http://localhost:5000/api/v1/mcp/sse",
      "headers": {
        "Authorization": "Bearer eyJhbGciOi..."
      }
    }
  }
}
```
