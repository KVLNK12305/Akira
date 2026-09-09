# AKIRA MCP Security Model

## 1. Zero-Trust Tri-Plane Architecture for AI Agents

AKIRA enforces strict separation of concerns across three security planes:

```text
       ┌────────────────────────────────────────────────────────┐
       │   Control Plane: Human SOC & Admin (Argon2id + MFA)    │
       └───────────────────────────┬────────────────────────────┘
                                   │ Issues Ephemeral SVIDs
       ┌───────────────────────────▼────────────────────────────┐
       │   Governance Plane: MCP Sentinel (Zero-Trust Gateway)  │
       │   • Cryptographic SVID Attestation                     │
       │   • Confused-Deputy Boundary Check                     │
       │   • Risk-Adaptive Dynamic Gate (0-100 Score)           │
       └───────────────────────────┬────────────────────────────┘
                                   │ Scoped, Audited Operations
       ┌───────────────────────────▼────────────────────────────┐
       │   Data Plane: Banking / Payment / Internal API         │
       └────────────────────────────────────────────────────────┘
```

---

## 2. MCP Scopes & Capability Matrix

| Scope | Tool Mappings | Default Grant? | Description |
|---|---|---|---|
| `mcp:nhi:read` | `get_nhi_profile` | Permitted on Read SVIDs | Read machine identity profiles and metadata. |
| `mcp:risk:read` | `get_risk_score`, `get_risk_events` | Permitted on Read SVIDs | Read live 0-100 risk scores and security event streams. |
| `mcp:baseline:read` | `get_behavioral_baseline` | Permitted on Read SVIDs | Read learned typical operational baselines. |
| `mcp:forensics:read` | `investigate_nhi` | Explicit Grant Only | Compile aggregated forensic dossiers across credentials and incidents. |
| `mcp:simulation:execute` | `simulate_attack` | **NEVER DEFAULT** | Execute controlled attack simulations against simulation-eligible targets. |
| `mcp:containment:execute` | `quarantine_nhi` (Future) | **NEVER DEFAULT** | Requires fresh, single-use interactive human administrator approval. |

---

## 3. Risk-Adaptive Dynamic Authorization

Authorization decisions are computed dynamically using five input dimensions:
$$\text{Authorization} = \text{SVID Identity} + \text{MCP Scope} + \text{Tool Risk Tier} + \text{Caller Live Risk Score} + \text{Policy}$$

### Threshold Rules:
1. **Critical Posture ($\ge 90$ or QUARANTINED)**:
   All MCP tool execution is unconditionally blocked (`CALLER_QUARANTINED_OR_CRITICAL`).
2. **High Risk Posture ($\ge 75$)**:
   Simulation and containment tools are strictly blocked (`HIGH_RISK_SIMULATION_BLOCKED`). Read tools permitted under restricted rate limits.
3. **Elevated Risk Posture ($\ge 50$)**:
   Simulation tools require explicit step-up administrator approval (`ELEVATED_RISK_APPROVAL_REQUIRED`). Read tools permitted.
4. **Nominal Posture ($< 50$)**:
   Standard execution within configured rate limit tiers.

---

## 4. Closed-Loop Risk Feedback Mechanism

An AI agent cannot probe the MCP interface with impunity. Every anomalous behavior degrades the caller's own risk score in real-time:

```text
AI Agent sends unauthorized tool call
  │
  ├── 1. Authorization Engine rejects request (HTTP 403 / INSUFFICIENT_SCOPE)
  ├── 2. reportMcpAbuseSignal() triggers
  ├── 3. RiskEngine increments caller's riskScore (+15 to +35 points)
  ├── 4. Real RiskEvent document persisted to MongoDB
  └── 5. Subsequent calls immediately evaluate against degraded posture
```

---

## 5. Strict Secret Handling & Zeroization

The MCP server enforces a response-shape allowlist. The following fields are stripped before any response is serialized:
- `encryptedKey`, `iv`, `authTag`, `keyFingerprint`
- `masterKey`, `secret`, `tokenSecret`, `jwtSecret`, `password`
- `mongoUri`, `MONGO_URI`
