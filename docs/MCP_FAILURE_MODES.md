# AKIRA MCP Failure Modes & Fail-Closed Matrix

## 1. Fail-Closed Philosophy

Default-deny applies not only to authentication and authorization policies, but to **infrastructure and dependency failures**. An adversary or malfunctioning agent attempting to induce timeouts, resource exhaustion, or database disconnections will never trigger an "open" failure mode.

If a security or audit control cannot execute, the operation is unconditionally **DENIED**.

---

## 2. Verbatim Dependency Failure Matrix (§26)

| Dependency | On failure/timeout | Implementation Reference | Audit Code |
|---|---|---|---|
| **Auth/SVID validation** | **DENY**, audit `AUTH_UNAVAILABLE` | `backend/src/mcp/auth.js` (`authenticateSvidToken`) | `AUTH_UNAVAILABLE` |
| **Scope/policy engine** | **DENY**, audit `POLICY_ENGINE_ERROR` | `backend/src/mcp/authorization.js` (`authorizeMcpRequest`) | `POLICY_ENGINE_ERROR` |
| **Risk engine** | **DENY** (do not fall back to "assume low risk") | `backend/src/services/riskEngine.js` (`scoreNHIRequest` catch block) | `RISK_ENGINE_UNAVAILABLE` |
| **Audit writer** | **DENY** the underlying action too — no action is permitted to succeed without its audit record succeeding | `backend/src/mcp/audit.js` (`recordMcpAuditEvent`) | `AUDIT_WRITE_FAILED` |
| **Rate limiter store** | **DENY** (do not fall back to "unlimited") | `backend/src/mcp/rate-limit.js` (`checkMcpRateLimit`) | `RATE_LIMITER_ERROR` |
| **MongoDB** | **DENY**, structured error, no query details leaked | `backend/src/mcp/policies/failure-policy.js` (`createFailClosedError`) | `DATA_STORE_ERROR` |
| **Simulation Guard** | **DENY**, audit `TARGET_NOT_SIMULATION_ELIGIBLE` | `backend/src/mcp/tools/simulation.js` (`handleSimulateAttack`) | `TARGET_NOT_SIMULATION_ELIGIBLE` |

---

## 3. Structural Error Format

Failure responses conform to the JSON-RPC 2.0 specification with `failClosed: true` metadata. Internal error details, stack traces, and database connection strings are never leaked:

```json
{
  "jsonrpc": "2.0",
  "id": "req_uuid_123",
  "error": {
    "code": -32603,
    "message": "Audit ledger write failed; underlying operation denied",
    "data": {
      "code": "AUDIT_WRITE_FAILED",
      "failClosed": true
    }
  }
}
```
