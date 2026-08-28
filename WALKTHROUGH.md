# AKIRA | Security Walkthrough & Feature Guide

AKIRA is an enterprise Non-Human Identity (NHI) gateway and real-time AI Risk Sentinel built to secure the machine-to-machine economy and payment infrastructure. This walkthrough highlights the critical security features, threat detection mechanisms, and automated containment components.

---

## 1. Human Identity (The Control Plane)
AKIRA implements NIST-standard authentication for human administrators.

### MFA & Multi-Factor Authentication
- **Email OTP**: Login triggers a 6-digit cryptographic challenge sent to the user's email.
- **Fail-Safe Logging**: During development, OTPs are also logged to the secure backend console to prevent lockout during email service delays.
- **Argon2id Hashing**: Passwords are never stored in plaintext. AKIRA uses the Argon2id algorithm, which is resistant to GPU-based cracking and side-channel attacks.

### Role-Based Access Control (RBAC) & Elevation Governance
- **Identity Tiers**: Users are assigned roles like Admin, Developer, Auditor, and Newbie.
- **Privilege Separation**: Only Admins can manage roles, while Developers can issue machine credentials.
- **Access Elevation Workflow**: Users can submit formal access requests with documented justification that Admins review and approve/reject in real time.

---

## 2. Machine Identity (The Data Plane)
The core of AKIRA is managing high-entropy machine identities with military-grade encryption and ephemeral credentialing.

### AES-256-GCM Authenticated Encryption
- All API keys are encrypted at rest using AES-256-GCM (with a 12-byte IV and 16-byte authentication tag per entry) and a hardware-secured `MASTER_KEY`.
- **Fingerprinting**: Keys are indexed in the database via SHA-256 fingerprints, allowing for O(1) lookups during handshakes without decrypting every key in the vault.

### Rust Memory-Safe Attestation (Zeroization)
- **Zero-Allocation FFI**: AKIRA invokes a compiled Rust binary via Bun-FFI (`secure_attest`).
- **Zeroization**: The decrypted key plaintext is compared against the expected fingerprint inside secure memory and immediately wiped using the `zeroize` crate before returning to JavaScript.

### Ephemeral SVID Tokens (Least Privilege)
- **Scope Narrowing**: Machine workloads exchange static root keys for short-lived (30s to 1 hour) ephemeral JWT tokens with client IP attestation.
- **Payment Domain Scopes**: Granular scopes (`payment:initiate`, `payment:authorize`, `payment:settle`, `refund:process`, `ledger:read`, `ledger:write`).

---

## 3. 🤖 AI Threat Sentinel & Automated Containment (The Risk Plane)
AKIRA continuously evaluates every machine transaction against learned behavioral baselines.

### 8-Signal Anomaly Detection
1. **`IP_DEVIATION`** (+25): Request originating from an unlearned or foreign IP.
2. **`SCOPE_ESCALATION`** (+30): Machine attempting to invoke high-privilege payment operations outside its typical profile.
3. **`VELOCITY_SPIKE`** (+20): Sudden burst of requests exceeding 3&times; the learned moving average.
4. **`FAILED_ATTESTATION`** (+35): Rust memory-safe decryption or fingerprint mismatch.
5. **`HIGH_VALUE_SCOPE`** (+15): Sensitive operations such as batch settlements or refund processing.
6. **`TIME_ANOMALY`** (+10): Transactions occurring outside standard operational UTC windows.
7. **`EXPIRED_CREDENTIAL`** (+40): Stale or invalidated credentials presented.
8. **`POLICY_MATCH`** (+20): Triggered custom containment rule.

### Automated Containment Actions
- **Instant Quarantine**: Machine status flips to `QUARANTINED`, terminating access across the entire gateway.
- **Mass Ephemeral Token Revocation**: All active ephemeral SVID sessions linked to the compromised key are immediately invalidated.
- **Admin Alerting**: Platform administrators receive high-priority security notifications with incident metrics.
- **Human-in-the-Loop Clearance**: Admins can inspect the anomaly breakdown and release quarantined identities from the Threat Intel Console.

---

## 4. Policy Engine (Custom Containment Rules)
Administrators can define custom declarative containment policies:
- Target specific payment scopes (e.g. `payment:settle`, `refund:process`).
- Set risk score thresholds (e.g., score &ge; 75 triggers automatic token revocation & key lockdown).
- Match specific anomaly signals.

---

## 5. Compliance & Auditability
AKIRA provides a cryptographically verifiable "Paper Trail" for every security-sensitive action.

### Immutable Audit Trails
- **HMAC-SHA256 Signatures**: Every entry in the audit log is signed using unique derived HKDF sequence keys.
- **WORM Hash Chain**: Each record is linked to the previous log's integrity signature. Any alteration or deletion instantly breaks the chain.

### Secure Evidence Export
- **Forensic PDF Reports**: High-fidelity reports generated with jsPDF and AutoTable, including chain validation status and cryptographic hashes.
- **Base64-JSON Extraction**: Signed structured JSON for SIEM ingestion.

---

## 6. Premium Sentinel Dashboard
- **Threat Intel Console**: Real-time stream of risk events, threat heatmap cards, and behavioral profile inspection.
- **Live Attack Simulator**: Interactive demo tool demonstrating instant containment of payment exfiltration and refund hijacks.
- **Guardian Eye**: Step-by-step cryptographic handshake terminal.
- **Aero-Glass Aesthetics**: High-end SOC interface with responsive design and fluid micro-animations.

---

*Built for Foundations of Cyber Security (FoCS Lab) & Advanced Non-Human Identity Research.*
