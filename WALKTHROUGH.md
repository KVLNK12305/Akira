# AKIRA | Security Walkthrough & Feature Guide

AKIRA is a state-of-the-art Non-Human Identity (NHI) gateway built to secure the machine-to-machine economy. This walkthrough highlights the critical security features and premium architectural components of the platform.

---

## 1. Human Identity (The Control Plane)
AKIRA implements NIST-standard authentication for human administrators.

### MFA & Multi-Factor Authentication
- **Email OTP**: Login triggers a 6-digit cryptographic challenge sent to the user's email.
- **Fail-Safe Logging**: During development, OTPs are also logged to the secure backend console to prevent lockout during email service delays.
- **Argon2id Hashing**: Passwords are never stored in plaintext. AKIRA uses the Argon2id algorithm, which is resistant to GPU-based cracking and side-channel attacks.

### Role-Based Access Control (RBAC)
- **Identity Tiers**: Users are assigned roles like Admin, Developer, Auditor, and Newbie.
- **Privilege Separation**: Only Admins can manage roles, while Developers can issue machine credentials. Newbies are restricted to read-only views.

---

## 2. Machine Identity (The Data Plane)
The core of AKIRA is managing high-entropy machine identities with military-grade encryption.

### AES-256 Encryption
- All API keys are encrypted at rest using AES-256-CBC (with an IV-per-entry strategy) and a hardware-secured MASTER_KEY.
- **Fingerprinting**: Keys are indexed in the database via SHA-256 fingerprints, allowing for O(1) lookups during handshakes without decrypting every key in the vault.

### Rust Entropy Engine (Advanced Feature)
- **Non-Deterministic Randomness**: AKIRA features a high-performance Rust entropy subsystem.
- **Secure Rotation**: When a key is rotated, AKIRA invokes a compiled Rust binary via Bun-FFI to generate true cryptographic randomness, ensuring that machine identities are never predictable.

---

## 3. Compliance & Auditability
AKIRA provides a "Paper Trail" for every security-sensitive action.

### Immutable Audit Trails
- **Integrity Signatures**: Every entry in the audit log is stamped with an HMAC-SHA256 signature generated from the log data and the system secret.
- **Chain of Trust**: If a database entry is manually modified by an attacker, the signature verification will fail upon export, detecting the tampering.

### Secure Evidence Export
- **Forensic PDF Reports**: High-fidelity reports generated with jsPDF and AutoTable, including cryptographic metadata and verification hashes.
- **Base64-JSON extraction**: For automated SIEM ingestion, logs can be exported in signed JSON format.

---

## 4. Guardian Eye (NHI Lab)
A real-time observability suite for monitoring machine handshakes.

- **Handshake Tracing**: The "Guardian Eye" terminal simulates and validates machine protocols.
- **Protocol Verification**: It breaks down the validation process into visible steps (Fingerprint lookup, Integrity check, Scope verification) to provide transparency for security auditors.

---

## 5. Premium UI/UX Sentinel Dashboard
The interface is designed to feel like a high-end security operations center (SOC).

- **Aero-Glass Aesthetics**: Uses transparency, backdrop-blur-2xl, and deep slate palettes to create a professional interface.
- **Fluid Animations**: Powered by GSAP and custom CSS transitions for smooth state changes.
- **System Heartbeat**: A live widget showing "Iron Core" integrity, active nodes, and CPU load, simulating a real-time hardware appliance.

---

## Technical Hardening
- **NoSQL Injection Prevention**: Strict type coercion using String() wrappers on all MongoDB queries.
- **Mass Assignment Protection**: Registration roles are hardcoded to Developer to prevent privilege escalation via request body manipulation.
- **Global Throttling**: Rate limiting is enforced to neutralize brute-force automation.
- **Transport Security**: HSTS headers and strict CSP policies are baked into the backend.

---
*Built for Foundations of Cyber Security (FoCS Lab).*
