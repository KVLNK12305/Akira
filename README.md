# AKIRA | Secure Non-Human Identity Gateway & AI-Powered Risk Sentinel

![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-NIST_800--63--2_Compliant-blue?style=for-the-badge)
![AI Risk](https://img.shields.io/badge/AI_Risk-Automated_Containment-red?style=for-the-badge)
![Payment Infra](https://img.shields.io/badge/Domain-Payment_Infrastructure-emerald?style=for-the-badge)
![Tech](https://img.shields.io/badge/Stack-Bun_•_React_•_Rust_•_Tailwind_v4_•_MongoDB-black?style=for-the-badge)

> **"Identity is not just for humans — and neither is threat detection."**
> 
> AKIRA is an enterprise cryptographic Non-Human Identity (NHI) Gateway and real-time AI Threat Sentinel built for the Machine-to-Machine (M2M) economy, autonomous AI agents, and payment infrastructure. It combines encrypted credential lifecycle management with real-time heuristic anomaly detection, memory-safe kernel attestation, and millisecond automated containment.

---

## Tri-Plane Security Architecture

AKIRA strictly separates human administrative governance, high-entropy machine workloads, and real-time autonomous threat mitigation across three discrete planes:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AKIRA DEFENSE PLANE                             │
├──────────────────────────┬───────────────────────────┬─────────────────┤
│ 1. Human Control Plane   │ 2. Machine Workload Plane │ 3. AI Risk Plane│
│                          │                           │                 │
│ • Argon2id Memory-Hard   │ • AES-256-GCM AEAD Vault  │ • 8-Signal Math │
│ • 6-Digit Email MFA      │ • Zero-Alloc Rust FFI     │ • Dynamic Baselines│
│ • 4-Tier Hierarchical    │ • Ephemeral SVID Tokens   │ • Sub-50ms Lock │
│   RBAC & Approvals       │ • Scoped Payment Fencing  │ • MCP Guardrails│
└──────────────────────────┴───────────────────────────┴─────────────────┘
```

### 1. The Control Plane (Human Identity & Governance)
* **Standard:** NIST SP 800-63-2 E-Authentication compliant.
* **Credential Hashing:** **Argon2id** password hashing with cryptographically secure salts.
* **Multi-Factor Authentication (MFA):** 6-digit email OTP session validation with brute-force rate-limiting and fail-safe console logging.
* **Account Identity Profile:** Self-service profile management, avatar uploads with automated MIME/extension verification, and OTP-authenticated password changes.
* **Role-Based Access Control (RBAC):** `Admin`, `Developer`, `Auditor`, and `Newbie` tiers with privilege elevation requests and administrative approval workflows.
* **Transport & App Hardening:** Strict-Transport-Security (HSTS), `X-Content-Type-Options: nosniff`, and schema-driven type coercion for NoSQL injection prevention.

### 2. The Data Plane (Machine Workload & NHI Identity)
* **Authenticated Encryption:** **AES-256-GCM** authenticated encryption with random 12-byte IVs and 16-byte AuthTags per credential.
* **Zero Plaintext Persistence:** Raw API keys exist only in memory during generation; storage uses `AES-256-GCM(Key)` alongside indexed `SHA-256(Fingerprint)`.
* **Rust Native Attestation & Zeroization:** Zero-allocation Rust FFI library (`libnative_core.so`) loaded via Bun-FFI to verify credentials and immediately wipe unmanaged memory (`zeroize` crate) before garbage collection.
* **Ephemeral Workload Credentials (SVID):** High-entropy root keys can be exchanged for scoped, short-lived (30s–1hr) JWT tokens cryptographically bound to client IP addresses.
* **Granular Payment Scopes:** Domain-specific permission fencing (`payment:initiate`, `payment:authorize`, `payment:settle`, `refund:process`, `ledger:read`, `ledger:write`).

### 3. AI Threat Sentinel & Automated Containment (The Risk Plane)
* **Real-Time Heuristic Scoring (0–100):** Inbound payloads are evaluated against continuously learned machine behavioral baselines across 8 weighted signals:
  * `IP_DEVIATION` (+25 pts): Inbound request from an unlearned subnet or foreign geographic location.
  * `SCOPE_ESCALATION` (+30 pts): Attempted execution of uncharacteristic or elevated payment endpoints.
  * `VELOCITY_SPIKE` (+20 pts): Request velocity exceeding 3&times; the learned moving average.
  * `FAILED_ATTESTATION` (+35 pts): Rust memory attestation or machine fingerprint mismatch.
  * `HIGH_VALUE_SCOPE` (+15 pts): Accessing sensitive financial endpoints (`payment:settle`, `refund:process`).
  * `TIME_ANOMALY` (+10 pts): Out-of-hours transactions relative to machine operational baselines.
  * `EXPIRED_CREDENTIAL` (+40 pts): Attempted use of stale or revoked credentials.
* **Sub-50ms Automated Containment Pipeline:**
  * Instant status transition of machine identity to `QUARANTINED`.
  * Revocation of all active ephemeral sessions and database lock.
  * Immediate rejection at the gateway edge with `HTTP 423 IDENTITY_QUARANTINED` / `HTTP 403`.
  * High-priority asynchronous security alert dispatched to platform administrators.
* **Human-in-the-Loop Clearance:** Operators can triage forensic deviations and release quarantined machines directly with 1 click.
* **Configurable Policy Engine:** Dynamic thresholds and scope conditions allowing custom automated rules.

### 4. Verification & Audit Plane
* **Tamper-Evident WORM Audit Trail:** Write-Once, Read-Many audit log chain linked with **HMAC-SHA256 Integrity Signatures** and forward-secure sequence hashes.
* **Compliance PDF Export:** Client-side cryptographic evidence generation in Base64-JSON and signed PDF formats.

### 5. The Model Context Protocol (MCP) Governance Plane
AKIRA exposes a hardened, Zero-Trust **Model Context Protocol (MCP)** interface allowing autonomous AI agents (Claude Desktop, Cursor, Antigravity IDE, Windsurf) to investigate identities, risk events, and run controlled simulations — **without ever becoming security decision-makers**.

* **The Core Principle:** The AI Agent is a **caller**, never a **decider**.
* **Six Non-Negotiable Hardening Controls:**
  1. **Transport-Bound Ephemeral SVID:** No static API keys. Sessions authenticate via short-lived JWT-SVIDs re-verified on **every single tool invocation** for cryptographic signature, expiration, database revocation in `EphemeralToken`, and parent-key quarantine.
  2. **Confused-Deputy Defense:** Tool arguments cannot query arbitrary keys outside the calling identity's authorized tenant/owner boundary (`confused-deputy.js`).
  3. **Closed-Loop Risk Feedback:** Repeated unauthorized probing, scope escalation attempts, or rate-limit violations automatically feed anomaly signals (`SCOPE_ESCALATION`, `VELOCITY_SPIKE`, `SUSPICIOUS_PATTERN`) into AKIRA's live Risk Engine, degrading the calling agent's own risk score in real-time.
  4. **Fail-Closed Everywhere:** Infrastructure failures, policy engine faults, database timeouts, rate-limiter errors, and audit-write failures unconditionally result in `DENY`.
  5. **Prompt-Injection Boundary:** All external, free-text metadata returned to the model is structurally demarcated with `{ "_untrusted": true, "type": "untrusted_external_content", "value": "..." }` and size-capped to 500 characters to prevent instruction hijacking and context-window exhaustion.
  6. **Simulation-Eligibility Guardrail:** Attack simulations can **only** target machine identities explicitly flagged `simulationEligible: true` in staging/test environments. Any attempt to target production workloads is denied with `TARGET_NOT_SIMULATION_ELIGIBLE`.

* **MCP Tools Exposed (JSON-RPC 2.0):**
  * `get_nhi_profile` (`mcp:nhi:read`): Retrieve identity registration, status, scopes, and baseline learning state.
  * `get_risk_score` (`mcp:risk:read`): Fetch real-time 0–100 risk score and containment status.
  * `get_risk_events` (`mcp:risk:read`): Paginated stream of security incident evaluations.
  * `get_behavioral_baseline` (`mcp:baseline:read`): Inspect learned typical working hours, endpoints, and request velocity.
  * `investigate_nhi` (`mcp:forensics:read`): Aggregate full forensic dossier across credentials, incidents, and attestation.
  * `simulate_attack` (`mcp:simulation:execute`): Execute controlled APT attack through the live AI Risk Sentinel against simulation-eligible keys.

---

## Modernist SOC Dashboard Experience

The frontend is crafted in a spacious, high-contrast **Modernist SOC aesthetic**:

* **Restrained Color & Visual Hierarchy**: Built on a deep obsidian slate foundation (`#080c14`) with hairline boundaries (`border-white/10`). Saturated red is **strictly reserved** for `CRITICAL` threats and active containment; calm tones are used for ambient metrics.
* **Differentiated Metric Tiles**: Hero status anchors for *System Risk Index* and *Autonomous Containment Counts* alongside calm operational throughput tiles.
* **Forensic Triage Side Panel**: Right-aligned floating panel that auto-sizes to content, displaying score breakdown math (`+pts`), categorized signal pills (`Identity`, `Network`, `Behavioral`), and technical containment timing. The border terminates cleanly right below the Done button with zero empty space.
* **Tactical Adversary Attack Simulator Cockpit**: Isolated sandbox enclave allowing operators to inject synthetic APT attack vectors (`Payment Exfiltration`, `Credential Stuffing Burst`, `Privilege Escalation Spike`, `Impossible Travel`) to validate detection heuristics.
* **Machine Identity Profiles Registry**: Behavioral baseline models, learned subnets, typical scopes, velocity metrics, and in-modal 1-click quarantine controls.
* **Connected Prevalent Signals Sidebar**: Clicking prevalent anomaly bars live-filters the event stream.
* **Guardian Eye (NHI Lab)**: Interactive machine transmission simulator verifying Akira prefix protocols, Base64 decoding, SHA-256 fingerprinting, and database resolution.
* **Interactive Documentation & MCP Simulation Lab**: Integrated API documentation, threat matrix reference, error code glossary, and a live **Interactive MCP & Threat Simulation Cockpit** with 5 test scenarios (*Clean Workload*, *Prompt Injection Exploit*, *Scope Escalation Probe*, *Adversary Attack Simulation*, *Target Eligibility Guardrail*) and live step-by-step pipeline execution telemetry.

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | **Bun** | High-performance JavaScript runtime for low-latency cryptographic operations. |
| **Native Core** | **Rust + Bun-FFI** | Memory-safe key attestation, CSPRNG entropy generation, and native memory zeroization. |
| **Backend** | **Express.js** | Modular REST API with risk-scoring middleware pipeline and SSE streams. |
| **AI Governance** | **Model Context Protocol (MCP)** | JSON-RPC 2.0 & SSE gateway arbitrating autonomous AI tool invocations. |
| **Database** | **MongoDB Atlas** | Vault for AES-256-GCM encrypted keys, behavioral baselines, and WORM audit chains. |
| **Frontend** | **React 18 + Vite (Rolldown)** | Modernist SOC Dashboard with responsive layout and zero layout shift. |
| **Styling** | **Tailwind CSS v4 + Vanilla CSS** | High-contrast dark theme, custom scrollbars, and keyframe animations. |
| **Typography** | **Inter + JetBrains Mono** | UI text in `Inter`; technical telemetry (IPs, hashes, scores) in monospace. |
| **Reporting** | **jsPDF + AutoTable** | Client-side generation of cryptographically signed compliance reports. |
| **Email/Alerts** | **Nodemailer / Brevo / Resend** | Asynchronous administrator alerts for automated containment events. |

---

## Quick Start

### Prerequisites
* Bun (v1.0+)
* Node.js (v18+) & pnpm
* MongoDB (Atlas or Local instance)
* Rust toolchain (optional, for rebuilding `native_core`)

### 1. Clone & Configure
```bash
git clone https://github.com/KVLNK12305/Akira.git
cd Akira
```

### 2. Backend Setup
```bash
cd backend
bun install
cp .env.example .env
# Configure MONGO_URI, JWT_SECRET, MASTER_KEY, and SMTP credentials in .env
bun dev
```
*Backend runs on `http://localhost:5001`.*

### 3. Frontend Setup
```bash
cd ../frontend
pnpm install
pnpm dev
```
*Frontend runs on `http://localhost:5173`.*

### 4. Verify System
```bash
# Run the hardened MCP security test suite (25 assertions covering all Zero-Trust controls):
cd ../backend
bun test_mcp_hardened.js

# Run automated risk engine test suite:
bun test_risk_engine.js

# Build frontend bundle:
cd ../frontend
pnpm run build
```

---

## API Reference

### 1. Human Auth & Profile Governance
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Initiate login challenge (dispatches 6-digit email OTP) |
| `POST` | `/api/auth/verify-mfa` | Verify OTP challenge, issue session cookie & JWT |
| `POST` | `/api/auth/google` | OAuth authentication via verified Google credential |
| `GET` | `/api/auth/me` | Rehydrate authenticated user session |
| `GET` | `/api/auth/logout` | Revoke session cookies and clear tokens |
| `PUT` | `/api/users/update-profile` | Update username and avatar URL |
| `POST` | `/api/users/upload-avatar` | Upload profile image (JPEG/PNG, automated file check) |
| `POST` | `/api/users/request-password-change` | Request password change verification OTP |
| `POST` | `/api/users/confirm-password-change` | Verify OTP and update password |
| `GET` | `/api/users` | List platform user identities (Admin only) |
| `PUT` | `/api/users/:id/role` | Transition user RBAC role |
| `POST` | `/api/access/request` | Submit role elevation request |
| `PUT` | `/api/access/request/:id` | Approve or reject role elevation request |

### 2. Machine Credential Plane
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/keys/generate` | Issue new AES-256-GCM encrypted API Key with scopes |
| `GET` | `/api/keys` | List active credentials, fingerprints, status, & risk scores |
| `POST` | `/api/keys/:id/rotate` | Rotate secret using Rust entropy engine |
| `DELETE` | `/api/keys/:id` | Revoke and purge machine credential |
| `POST` | `/api/v1/token/issue` | Exchange root API key for Ephemeral SVID token |
| `POST` | `/api/v1/token/revoke` | Revoke specific ephemeral SVID token |
| `POST` | `/api/v1/nhi-validate` | Simulate step-by-step cryptographic handshake (Guardian Eye) |

### 3. AI Threat Sentinel & Containment
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/risk/events` | Stream paginated real-time risk evaluation events |
| `GET` | `/api/v1/risk/stats` | Retrieve threat heatmap metrics and anomaly distributions |
| `GET` | `/api/v1/risk/profiles` | List all learned machine behavioral baselines |
| `GET` | `/api/v1/risk/profile/:keyId` | Inspect behavioral baseline for a specific machine identity |
| `POST` | `/api/v1/risk/containment/:keyId/quarantine` | Immediately quarantine machine identity (HTTP 403 enforcement) |
| `POST` | `/api/v1/risk/containment/:keyId/release` | Human-in-the-loop quarantine release |
| `GET` | `/api/v1/policies` | List active containment policy rules |
| `POST` | `/api/v1/policies` | Deploy new automated containment policy |
| `PUT` | `/api/v1/policies/:id` | Enable or disable an automated containment policy |
| `POST` | `/api/v1/risk/simulate-attack` | Trigger tactical APT attack scenario for sandbox verification |

### 4. Protected Payment Infrastructure
| Method | Endpoint | Required Scope | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payment/charge` | `payment:initiate` | Authorize payment transaction |
| `POST` | `/api/v1/payment/settle` | `payment:settle` | Execute batch settlement |
| `POST` | `/api/v1/payment/refund` | `refund:process` | Process customer refund |
| `GET` | `/api/v1/ledger/transactions` | `ledger:read` | Inspect transactional ledger |

### 5. Model Context Protocol (MCP) Interface
| Method | Endpoint | Protocol | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/mcp` | JSON-RPC 2.0 | Master MCP gateway endpoint (`initialize`, `tools/call`, `resources/read`) |
| `GET` | `/api/v1/mcp/sse` | SSE Stream | Server-Sent Events channel for desktop AI clients (Claude, Cursor, Antigravity) |
| `GET` | `/api/v1/mcp/tools` | REST Catalog | Inspect registered tool schemas and risk tier definitions |
| `GET` | `/api/v1/mcp/audit/verify-chain` | Verification | Validate full HMAC-SHA256 WORM audit ledger integrity |

---

## MCP Client Configuration

To connect AKIRA's Sentinel MCP server to your AI desktop assistant (Claude Desktop, Cursor, Antigravity IDE, or Windsurf), add this snippet to your `claude_desktop_config.json` or `mcp_config.json`:

```json
{
  "mcpServers": {
    "akira-sentinel": {
      "url": "http://localhost:5001/api/v1/mcp/sse",
      "headers": {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

Or run via the standalone stdio transport:
```bash
AKIRA_SVID_TOKEN="eyJhbGciOiJIUz..." bun src/mcp/stdio.js
```

---

## Security Specifications Summary

| Feature | Specification | Standard / Reference |
| :--- | :--- | :--- |
| **Password Hashing** | Argon2id (m=64MB, t=3, p=4) | RFC 9106 |
| **Credential Encryption** | AES-256-GCM AEAD (12-byte IV, 16-byte Tag) | NIST SP 800-38D |
| **Memory Hygiene** | Rust FFI unmanaged memory zeroization | `zeroize` crate / ISO/IEC 15408 |
| **Machine Workload Tokens** | Ephemeral JWT SVIDs (HS256 / Ed25519) | SPIFFE Standard |
| **Audit Log Ledger** | HMAC-SHA256 WORM chain | Forward-secure HKDF ledger |
| **MCP Governance** | JSON-RPC 2.0 Zero-Trust Gateway & Injection Guard | Model Context Protocol v2.0 |
| **Containment Speed** | &le; 48ms from packet arrival to lockout | Zero-Trust Automated Defense |

---

## Academic Integrity & Attribution

* **Course:** 23CSE313 — Foundations of Cyber Security  
* **Institution:** Amrita Vishwa Vidyapeetham  
* **Developer:** K V L N Kushal [CB.SC.U4CSE23525]  

*AKIRA is built for advanced non-human identity security research, automated machine threat containment, and zero-trust payment defense.*
