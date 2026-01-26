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
* **Auth:** Argon2id Hashing for passwords.
* **Session:** JWT (JSON Web Tokens) with HTTP-Only Cookies.
* **Role-Based Access Control (RBAC):** Admin, Developer, Auditor.

### 2. The Data Plane (Machine Identity)
* **Credential:** AES-256 Encrypted API Keys.
* **Storage:** Keys are **never** stored in plaintext.
    * **DB Storage:** `AES-256-CBC(Key)` + `SHA-256(Fingerprint)`.
* **Transmission:** Base64URL Encoded Bearer Tokens.
* **Integrity:** HMAC-SHA256 Digital Signatures on all Audit Logs.

---

## ⚡ Tech Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime** | **Bun** | High-performance JS runtime for low-latency crypto operations. |
| **Backend** | **Express.js** | Robust REST API framework. |
| **Database** | **MongoDB Atlas** | Document store for encrypted key blobs and audit trails. |
| **Frontend** | **React + Vite** | High-performance dashboard with Glassmorphism UI. |
| **Styling** | **Tailwind CSS + GSAP** | "Sentinel" aesthetic with smooth animations. |
| **Crypto** | **Node Crypto + Argon2** | Industry-standard cryptographic libraries. |

---

## 🚀 Getting Started

### Prerequisites
* [Bun](https://bun.sh/) (v1.0+)
* Node.js (v18+)
* MongoDB Atlas Account

### 1. Backend Setup (The Fortress)
```bash
cd backend

# Install dependencies
bun install

# Configure Environment
cp .env.example .env
# (Edit .env with your MONGO_URI and MASTER_KEY)

# Ignite the Engine
bun dev

```

### 2. Frontend Setup (The Dashboard)

```bash
cd frontend

# Install dependencies
pnpm install

# Launch UI
pnpm dev

```

---

## 🔐 Cryptographic Implementation Details

### A. Key Generation (The Birth of an Identity)

When a user requests an API Key:

1. **Entropy:** 32 bytes of random data are generated (`crypto.randomBytes(32)`).
2. **Encoding:** Converted to Base64URL for transmission (`akira_...`).
3. **Display:** Shown **ONCE** to the user.

### B. Secure Storage (The Vault)

We do not store the key. We store:

1. **Ciphertext:** The key encrypted with `AES-256-CBC` using a server-side `MASTER_KEY`.
2. **Fingerprint:** A `SHA-256` hash of the key for fast lookups (O(1) indexing) without decryption.

### C. Digital Signatures (The Audit Trail)

Every action (Key Generation, Access Denial) generates an Audit Log entry.

* **Mechanism:** `HMAC-SHA256(LogPayload, SECRET)`
* **Purpose:** Ensures database administrators cannot tamper with access logs without invalidating the signature.

---

## 📡 API Reference

### Human Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register new admin (Argon2 Hashed) |
| `POST` | `/api/auth/login` | Authenticate & Issue JWT |

### Machine Management

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/keys/generate` | Issue new Encrypted API Key |
| `GET` | `/api/keys` | List active keys (Fingerprints only) |

### Machine Access (Data Plane)

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/secret-report` | Access protected data using `Bearer akira_...` |

---

## 📸 Screenshots

*(Placeholders for your Lab Report)*

* **Login Screen:** Glassmorphism UI with MFA prompt.
* **Dashboard:** Active Keys list showing masked credentials.
* **Terminal:** `curl` request demonstrating successful machine authentication.

---

## 📜 License & Academic Integrity

**Course:** 23CSE313 - Foundations of Cyber Security
**Institution:** Amrita Vishwa Vidyapeetham
**Developer:** [Your Name / ID]

*This project is built strictly for educational purposes to demonstrate secure identity management principles.*

```

```
