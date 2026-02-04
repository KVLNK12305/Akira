# AKIRA | Secure Non-Human Identity Gateway

![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-NIST_800--63--2_Compliant-blue?style=for-the-badge)
![Tech](https://img.shields.io/badge/Stack-Bun_•_React_•_MongoDB-black?style=for-the-badge)

> **"Identity is not just for humans."**
> AKIRA is a cryptographic Identity Provider (IdP) designed specifically for **Non-Human Identities (NHI)**. It secures the Machine-to-Machine (M2M) economy by replacing static, vulnerable credentials with an encrypted, managed, and audited access architecture.

---

## 🛡️ Core Security Architecture

AKIRA implements a **Hybrid Identity Plane**, strictly separating human administrators from machine consumers.

### 1. The Control Plane (Human Identity)
* **Standard:** NIST SP 800-63-2 E-Authentication.
* **Auth:** **Argon2id Hashing** for passwords (memory-hard).
* **MFA:** Email-based 6-digit session validation (Fail-safe console logging supported).
* **Hardening:** Strict NoSQL Injection prevention via schema-driven type coercion.
* **Identity Management:** Profile avatars with automated file scanning and MFA-protected password transitions.
* **Role-Based Access Control (RBAC):** Admin, Developer, Auditor, Newbie tiers.
* **Transport Security:** MITM protection via **HSTS (Strict-Transport-Security)** and `nosniff` content typing.
* **Traffic Control:** Global Rate Limiting to prevent brute-force and DDoS exploration.

### 2. The Data Plane (Machine Identity)
* **Credential:** **AES-256-GCM** Encrypted API Keys.
* **Storage:** Keys are **never** stored in plaintext.
    * **DB Storage:** `AES-256-GCM(Key)` + `SHA-256(Fingerprint)`.
* **Transmission:** Base64 Encoded Bearer Tokens with `akira_` prefix.
* **Guardian Eye (NHI Lab):** Real-time machine handshake tracing and protocol verification.

### 3. Verification & Compliance
* **Immutable Audit Trails:** Every security action is stamped with an **HMAC-SHA256 Integrity Signature**.
* **Secure Evidence Export:** Cryptographically signed log reports available in Base64-JSON and Formatted PDF.

---

## 💎 Premium UI/UX Features

AKIRA features a state-of-the-art "Sentinel" dashboard designed for security professionals:
* **Aero-Glass Aesthetics**: High-end glassmorphism with `backdrop-blur-2xl` and professional micro-animations.
* **Fixed-Viewport Layout**: A stable, app-like experience with no vertical page scrolling.
* **Intelligent Menus**: Role management dropdowns with built-in collision detection (auto-flipping) and scale transitions.
* **Live Terminal**: Integrated NHI handshake console for real-time security observability.
* **Visual Identity**: Integrated profile management with secure avatar uploads and dynamic status indicators.

---

## ⚡ Tech Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime** | **Bun** | High-performance JS runtime for low-latency crypto operations. |
| **Backend** | **Express.js** | Robust REST API framework. |
| **Database** | **MongoDB Atlas** | Document store for encrypted key blobs and audit trails. |
| **Frontend** | **React + Vite** | High-performance dashboard with Glassmorphism UI. |
| **Styling** | **Vanilla CSS + GSAP** | Custom professional scrollbars and smooth animations. |
| **Reporting** | **jsPDF + AutoTable** | Client-side generation of secure compliance reports. |
| **Media** | **Multer** | Secure handling of multipart/form-data for identity assets. |
| **Security Handling** | **Helmet + RateLimit** | Automated MITM protection, HSTS, and request throttling. |

---

## 🚀 Getting Started

### Prerequisites
* [Bun](https://bun.sh/) (v1.0+)
* Node.js (v18+)
* MongoDB Atlas Account

### 1. Backend Setup
```bash
cd backend
bun install
cp .env.example .env # Configure MONGO_URI, JWT_SECRET, and MASTER_KEY
bun dev
```

### 2. Frontend Setup
```bash
cd frontend
pnpm install
pnpm dev
```

---

## 🔐 Cryptographic Implementation Details

### A. Key Generation
1. **Entropy:** 32 bytes of random data are generated.
2. **Encoding:** Converted to Base64 with an `akira_` security prefix.
3. **Display:** Shown **ONCE** to the user.

### B. Secure Vault
1. **Ciphertext:** Encrypted using **AES-256-GCM** with a hardware-secured `MASTER_KEY`.
2. **Fingerprint:** A `SHA-256` hash for indexed O(1) lookups during the handshake.

### C. Digital Signatures (Audit)
1. **Signing:** Auditable events are HMAC-SHA256 hashed using the system `MASTER_KEY`.
2. **Chain of Trust:** Prevents database manipulation by verifying the integrity of the log entry upon export.

### D. Transport Hardening (DAST Optimized)
1. **HSTS:** Enforced HTTPS context for 1 year (`max-age=31536000`).
2. **XSS Protection:** Strict Content Security Policy (CSP) and `X-Content-Type-Options`.
3. **Throttling:** 100 requests per 15-minute window per IP to neutralize brute-force automation.

---

## 📡 API Reference

### Human Auth & Profile
| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Initiate challenge (Issue OTP) |
| `POST` | `/api/auth/verify-mfa` | Finalize session & Issue JWT |
| `PUT` | `/api/users/update-profile` | Update identity metadata |
| `POST` | `/api/users/request-password-change` | MFA Challenge for credential rotation |
| `POST` | `/api/users/upload-avatar` | Secure media ingestion (JPG/PNG) |

### Machine Management & Evidence
| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/keys/generate` | Issue new Encrypted API Key |
| `GET` | `/api/keys` | List active fingerprints |
| `GET` | `/api/audit-logs/export` | Signed cryptographic evidence extraction |
| `POST` | `/api/v1/nhi-validate` | **Guardian Eye** Live Handshake |

---

## 📜 License & Academic Integrity

**Course:** 23CSE313 - Foundations of Cyber Security  
**Institution:** Amrita Vishwa Vidyapeetham  
**Developer:** K V L N Kushal [CB.SC.U4CSE23525]  

*This project is built strictly for educational purposes to demonstrate secure identity management principles.*

