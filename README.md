# AKIRA | Secure Non-Human Identity Gateway & AI-Powered Risk Sentinel

![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-NIST_800--63--2_Compliant-blue?style=for-the-badge)
![AI Risk](https://img.shields.io/badge/AI_Risk-Automated_Containment-red?style=for-the-badge)
![Payment Infra](https://img.shields.io/badge/Domain-Payment_Infrastructure-emerald?style=for-the-badge)
![Tech](https://img.shields.io/badge/Stack-Bun_•_React_•_Rust_•_MongoDB-black?style=for-the-badge)

> **"Identity is not just for humans — and neither is threat detection."**
> AKIRA is an enterprise cryptographic Non-Human Identity (NHI) Gateway and real-time AI Risk Sentinel built for the Machine-to-Machine (M2M) economy and payment infrastructure. It combines encrypted credential lifecycle management with real-time heuristic anomaly detection and millisecond automated containment.

---

## Core Security Architecture

AKIRA implements a **Tri-Plane Architecture**, separating human administration, high-entropy machine workloads, and automated threat mitigation.

### 1. The Control Plane (Human Identity & Governance)
* **Standard:** NIST SP 800-63-2 E-Authentication.
* **Auth:** **Argon2id Hashing** for passwords (memory-hard).
* **MFA:** Email-based 6-digit session validation (Fail-safe console logging supported).
* **Hardening:** Strict NoSQL Injection prevention via schema-driven type coercion.
* **Identity Management:** Profile avatars with automated file scanning and MFA-protected password transitions.
* **Role-Based Access Control (RBAC):** Admin, Developer, Auditor, Newbie tiers with formal elevation request workflows.
* **Transport Security:** MITM protection via **HSTS (Strict-Transport-Security)** and `nosniff` content typing.

### 2. The Data Plane (Machine Workload Identity)
* **Credential:** **AES-256-GCM** Encrypted API Keys (AEAD) with 12-byte IV and 16-byte AuthTag.
* **Storage:** Plaintext is **never** persisted (`AES-256-GCM(Key)` + indexed `SHA-256(Fingerprint)`).
* **Rust Native Attestation:** Zero-allocation Rust FFI (`secure_attest`) zeroizes decrypted keys immediately from secure memory.
* **Ephemeral Credentials (SVID):** Dynamic exchange of root API keys for scoped, time-clamped (30s–1hr) ephemeral JWT tokens with client IP attestation.
* **Payment Scopes:** Domain-specific RBAC (`payment:initiate`, `payment:authorize`, `payment:settle`, `refund:process`, `ledger:read`, `ledger:write`).

### 3. 🤖 AI Threat Sentinel & Automated Containment (The Risk Plane)
* **Real-Time Anomaly Scoring:** Every machine request is evaluated against learned behavioral baselines across 8 weighted signals:
  * `IP_DEVIATION` (weight 25): Foreign or unlearned client IP addresses.
  * `SCOPE_ESCALATION` (weight 30): Attempted access to ungranted or uncharacteristic payment endpoints.
  * `VELOCITY_SPIKE` (weight 20): Request frequency exceeding learned baseline velocity (&gt; 3&times; moving average).
  * `FAILED_ATTESTATION` (weight 35): Rust memory-safe attestation mismatch.
  * `HIGH_VALUE_SCOPE` (weight 15): High-risk payment operations (`payment:authorize`, `payment:settle`, `refund:process`).
  * `TIME_ANOMALY` (weight 10): Out-of-hours transactions.
  * `EXPIRED_CREDENTIAL` (weight 40): Attempted use of stale credentials.
* **Automated Containment Pipeline:**
  * Instant status transition to `QUARANTINED`.
  * Mass-invalidation of all active ephemeral tokens for the compromised identity.
  * Immediate rejection (`403 ACCESS CONTAINED`) at the gateway edge.
  * Non-blocking automated high-priority email dispatch to all platform Administrators.
* **Human-in-the-Loop Clearance:** Administrators can review anomalous signals and release quarantined machine identities from the Threat Intel Console.
* **Policy Engine:** Admin-configurable automated response rules with customizable risk thresholds and action policies.

### 4. Verification & Compliance
* **Immutable Audit Trails:** Write-Once, Read-Many (WORM) hash-chained audit logs stamped with **HMAC-SHA256 Integrity Signatures** and forward-secure HKDF sequence keys.
* **Secure Evidence Export:** Tamper-evident forensic reports exportable in Base64-JSON and Formatted PDF with chain verification.

---

## Premium UI/UX Features

* **AI Threat Intel Console**: Real-time risk stream, threat heatmap cards, machine behavioral profile inspector, and automated containment controls.
* **Live Attack Simulator**: Interactive pitch and demo simulator triggering live attack scenarios (`PAYMENT_EXFILTRATION`, `UNAUTHORIZED_REFUND`) with instant containment.
* **Guardian Eye (NHI Lab)**: Real-time machine handshake tracing and stage-by-stage cryptographic protocol verification.
* **Aero-Glass Aesthetics**: High-end glassmorphism with `backdrop-blur-2xl`, custom typography, and dynamic micro-animations.
* **Fixed-Viewport Layout**: App-like SOC interface with responsive navigation.

---

## Tech Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime** | **Bun** | Ultra low-latency JS runtime for high-throughput crypto operations. |
| **Native Core** | **Rust + Bun FFI** | Memory-safe key attestation, secure entropy generation, and zeroization. |
| **Backend** | **Express.js** | Modular REST API with risk-scoring middleware pipeline. |
| **Database** | **MongoDB Atlas** | Vault for encrypted key blobs, behavioral profiles, and hash-chained audit logs. |
| **Frontend** | **React + Vite** | SOC Sentinel dashboard with glassmorphism aesthetics. |
| **Styling** | **Vanilla CSS + Lucide Icons** | High-performance styling and responsive design. |
| **Reporting** | **jsPDF + AutoTable** | Client-side generation of cryptographically signed compliance reports. |
| **Alerting** | **Brevo / Resend / Nodemailer** | High-priority security dispatch for automated containment alerts. |

---

## Getting Started

### Prerequisites
* [Bun](https://bun.sh/) (v1.0+)
* Node.js (v18+)
* MongoDB (Atlas or Local)
* Rust toolchain (optional, for compiling `native_core`)

### 1. Backend Setup
```bash
cd backend
bun install
cp .env.example .env # Configure MONGO_URI, JWT_SECRET, MASTER_KEY, and Brevo/SMTP keys
bun dev
```

### 2. Frontend Setup
```bash
cd frontend
pnpm install
pnpm dev
```

### 3. Run Automated Risk Engine Verification
```bash
cd backend
bun test_risk_engine.js
```

---

## API Reference

### 1. Human Auth & Governance
| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Initiate challenge (Issue OTP) |
| `POST` | `/api/auth/verify-mfa` | Finalize session & Issue JWT |
| `GET` | `/api/users` | List platform identities (Admin only) |
| `PUT` | `/api/users/:id/role` | RBAC Role transitions |
| `POST` | `/api/access/request` | Submit elevation request |
| `PUT` | `/api/access/request/:id` | Approve/Reject access elevation |

### 2. Machine Credential Plane
| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/keys/generate` | Issue new Encrypted API Key with payment scopes |
| `GET` | `/api/keys` | List active fingerprints, status, & risk scores |
| `POST` | `/api/keys/:id/rotate` | Rotate secret using Rust Entropy engine |
| `DELETE` | `/api/keys/:id` | Revoke & delete credential |
| `POST` | `/api/v1/token/issue` | Exchange root key for Ephemeral SVID token |
| `POST` | `/api/v1/token/revoke` | Revoke specific ephemeral token |

### 3. 🤖 AI Threat Intel & Containment
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/risk/events` | Stream paginated real-time risk evaluations |
| `GET` | `/api/v1/risk/stats` | Threat heatmap metrics & anomaly distributions |
| `GET` | `/api/v1/risk/profiles` | List all learned machine behavioral baselines |
| `GET` | `/api/v1/risk/profile/:keyId` | Inspect behavioral baseline for specific NHI |
| `POST` | `/api/v1/risk/containment/:keyId/quarantine` | Manually quarantine machine identity |
| `POST` | `/api/v1/risk/containment/:keyId/release` | Human-in-the-loop quarantine release |
| `GET` | `/api/v1/policies` | List active containment policy rules |
| `POST` | `/api/v1/policies` | Deploy new automated containment policy |
| `POST` | `/api/v1/risk/simulate-attack` | Live pitch attack simulation trigger |

### 4. 💳 Payment Infrastructure Operations
| Method | Endpoint | Required Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/payment/charge` | `payment:initiate` | Authorize payment transaction |
| `POST` | `/api/v1/payment/settle` | `payment:settle` | Execute batch settlement |
| `POST` | `/api/v1/payment/refund` | `refund:process` | Process customer refund |
| `GET` | `/api/v1/ledger/transactions` | `ledger:read` | Inspect transactional ledger |

---

## License & Academic Integrity

**Course:** 23CSE313 - Foundations of Cyber Security  
**Institution:** Amrita Vishwa Vidyapeetham  
**Developer:** K V L N Kushal [CB.SC.U4CSE23525]  

*Built for advanced non-human identity security research and automated threat containment demonstration.*
