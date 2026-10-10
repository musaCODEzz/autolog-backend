# 🏗️ Technical Requirements Document (TRD) — AutoLog KE

**Project Name:** AutoLog KE  
**System Classification:** High-Integrity Digital Vehicle Passport, Predictive Maintenance Engine & Spare-Parts RFQ Marketplace  
**Version:** 1.0.0  
**Target Environment:** Node.js (v20/v22 LTS), TypeScript 5.x, Express 5.x, MongoDB 7.x (Mongoose 9.x), Docker, Linux (Ubuntu LTS)  
**Author:** Musa Maxwell & The AutoLog Core Engineering Team  

---

## 1. Executive Summary & Purpose

The purpose of this document is to specify the **engineering architecture, non-functional requirements (NFRs), system boundaries, cryptographic protocols, data integrity guarantees, and API standards** governing the AutoLog KE backend.

In emerging automotive markets like Kenya, vehicle provenance data is fragmented across physical service booklets, paper invoices, and informal WhatsApp chats. This enables widespread fraud, including **odometer tampering (clocking)**, **counterfeit spare parts substitution on Kirinyaga Road**, **falsified service histories**, and **unregulated private vehicle sales**.

AutoLog KE provides an immutable digital record for motor vehicles in Kenya, combining:
1. **Mathematical Monotonicity Guards** to mathematically prevent odometer rollbacks.
2. **Deterministic Cryptographic Hashing (SHA-256)** for exportable digital handover certificates.
3. **Three-Tier Trust Badge Verification** distinguishing informal self-entries from accredited partner garage confirmations.
4. **Blind Bidding Reverse-Auction Architecture** for spare-parts requests to eliminate Kirinyaga Road price fixing.
5. **Dynamic Driving Burn Rate Prediction Engines** calibrated to Nairobi commuter driving patterns.

---

## 2. High-Level Architectural Topology

AutoLog KE employs a modular, layered architecture adhering strictly to the **Clean Separation of Concerns**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / CONSUMER TIER                          │
│   Web App (React/Vite)  •  Mobile Web Check-in  •  Public Passport    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS / REST (JSON)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        GATEWAY & SECURITY LAYER                        │
│   Helmet (Headers)  •  CORS  •  Rate Limiting  •  Morgan Logging       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION & VALIDATION                      │
│   JWT Bearer Auth  •  RBAC (Owner/Garage/Dealer/Admin)  •  Zod Schemas │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           CONTROLLER ROUTERS                           │
│   Auth  •  Vehicles  •  Check-in  •  Services  •  RFQ  •  Analytics   │
└──────────────────┬─────────────────┬─────────────────┬─────────────────┘
                   │                 │                 │
                   ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       DOMAIN UTILITIES & ENGINES                       │
│   Odometer Math  •  SHA-256 Hasher  •  Predictions  •  Kenyan Plates   │
└──────────────────┬─────────────────┬─────────────────┬─────────────────┘
                   │                 │                 │
                   ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE LAYER                             │
│   Mongoose 9 ODM  •  MongoDB Atlas 7.0 Cluster  •  In-Memory (Vitest)  │
└────────────────────────────────────────────────────────────────────────┘
```

### Architectural Decisions & Rationale:
- **TypeScript (ES2022 / NodeNext):** Enforces end-to-end type safety, preventing null-pointer exceptions and runtime schema violations in financial and odometer computations.
- **Express 5.x:** Native promise rejection handling without external `express-async-errors` monkey-patching.
- **MongoDB Atlas with Mongoose 9:** Schema-level hooks, compound indexing, and aggregation pipelines suited for document-oriented vehicle records with embedded part replacements.
- **Stateless JWT Tokens:** Authentication relies on cryptographic JWT tokens (`HS256`) with a 7-day TTL, accompanied by instantaneous database revocation checks (`user.isSuspended`) on every incoming request.

---

## 3. Core Technical Modules & Functional Boundaries

| Module | Core Responsibility | Key Endpoints | Integrity Guarantees |
|---|---|---|---|
| **Identity & Access Management (IAM)** | Authentication, Kenyan E.164 phone normalization, RBAC, Admin CLI seeding. | `POST /auth/register`<br>`POST /auth/login`<br>`GET /auth/me` | Bcrypt salt rounds 12. Public registration whitelist restricts role escalation. |
| **Digital Vehicle Passport** | NTSA plate validation, SEO slug generation, anti-rollback odometer checks. | `POST /vehicles`<br>`GET /vehicles/:id`<br>`PATCH /vehicles/:id/mileage`<br>`GET /vehicles/passport/:slug` | Strictly rejects mileage decreasing below recorded values. Masks plates & chassis numbers on public endpoints. |
| **3-Tier Service Records** | Maintenance logging, receipt proof attachment, odometer auto-advancement, backdating detection. | `POST /services`<br>`GET /services/vehicle/:id`<br>`PATCH /services/:id/receipt` | Flags any record backdated by >30 days. Auto-advances vehicle odometer. Dynamically upgrades Tier 1 (Self) to Tier 2 (Documented) upon receipt upload. |
| **Weekly Magic Check-in** | Zero-password 72-hour mobile web odometer updates. | `POST /vehicles/:id/checkin-token`<br>`POST /vehicles/checkin/submit`<br>`POST /vehicles/checkin/dispatch-stale` | Anti-tamper signed tokens. Anti-spam idempotency (`lastCheckinPromptSentAt <= 7 days`). |
| **Predictive Maintenance** | Kenyan road-calibrated service schedules, urgency classification. | `GET /vehicles/:id/predictions` | Calculates dynamic daily burn rate ($\Delta \text{Km} / \Delta \text{Days}$). Sorts by `OVERDUE` $\to$ `DUE_SOON` $\to$ `HEALTHY`. |
| **Handover Certificate Engine** | Tamper-evident exportable handover passports for car sales and bank financing. | `GET /vehicles/:id/certificate`<br>`GET /vehicles/passport/:slug/certificate` | Deterministic SHA-256 fingerprinting based on plate, mileage, service counts, and timestamp. |
| **TCO & Spend Analytics** | Total cost of ownership, cost per kilometer, category spend allocations. | `GET /vehicles/:id/analytics` | Proportional cost allocation across multi-category invoices. Prevents `$unwind` invoice double counting. |
| **Spare-Parts RFQ Marketplace** | Blind-bidding quotation system for Kirinyaga Road dealers. | `POST /rfq`<br>`POST /rfq/:id/quotes`<br>`PATCH /rfq/quotes/:quoteId/accept` | Blind bidding feed prevents dealer price fixing. 48-hour price lock guarantee. Atomic competitor rejection upon acceptance. |

---

## 4. Non-Functional Requirements (NFRs)

### 4.1 Security & Cryptography
1. **Password Hardening:** All passwords hashed using `bcryptjs` with salt work factor of **12**.
2. **Payload Validation:** All API inputs strictly validated via **Zod schemas** before reaching controllers. Extraneous fields are stripped automatically.
3. **Anti-Rollback Immutability:** Vehicle odometer readings can never decrease:
   $$\text{NewMileage} \ge \text{CurrentMileage}$$
   Any submission where $\text{NewMileage} < \text{CurrentMileage}$ returns HTTP `400 Bad Request` with an audit error payload.
4. **Certificate SHA-256 Tamper Resistance:**
   $$\text{Hash} = \text{SHA256}(\text{Plate} : \text{Mileage} : \text{TotalServices} : \text{Tier3Count} : \text{IssuedAt} : \text{Salt})$$
   Any retroactive alteration of service records or odometer numbers completely invalidates the verification hash.
5. **Defense-in-Depth RBAC:**
   - Public roles: `owner`, `garage`, `dealer`.
   - The `admin` role **cannot** be registered via public endpoints. It can only be provisioned through secure server CLI execution (`npm run seed:admin`).
   - Partner garage accreditation (`isVerifiedPartner: true`) is strictly locked to platform administrators.

### 4.2 Performance & Latency Targets
- **P95 Latency:** $< 120\text{ ms}$ for standard read/write endpoints.
- **P99 Latency:** $< 250\text{ ms}$ for complex MongoDB aggregation pipelines (Analytics, Predictions).
- **Concurrency:** Up to 500 concurrent connections per lightweight container instance without degradation.
- **In-Memory Testing Speed:** Full test suite executes in $< 45\text{ seconds}$ across 11 test suites (81 automated tests) via in-memory replica server (`mongodb-memory-server`).

### 4.3 High Availability & Resilience
- **Database Lifecycle Management:** `src/config/db.ts` registers event listeners for `disconnected`, `reconnected`, and `error`, automatically re-establishing connections to MongoDB Atlas with exponential backoff.
- **Graceful Process Shutdown:** Handles `SIGTERM` and `SIGINT` signals, closing open socket connections and draining active MongoDB client requests before process termination.
- **Container Portability:** Multi-stage production `Dockerfile` creates a minimal ~180MB runtime image running under unprivileged user `autolog:nodejs` (UID 1001).

---

## 5. API Design & Data Contract Standards

AutoLog KE enforces the following REST conventions:
- **Base URI:** `/api/v1`
- **Content Negotiation:** All requests and responses use `application/json`.
- **Response Format:**
  ```json
  {
    "success": true,
    "message": "Optional human-readable confirmation",
    "data": { ... }
  }
  ```
- **Standardized Error Envelope:**
  ```json
  {
    "success": false,
    "message": "Specific error description",
    "errors": [ ... ]
  }
  ```
- **HTTP Status Codes:**
  - `200 OK`: Successful retrieval or synchronous update.
  - `201 Created`: Successful entity creation (vehicle, user, service record, quote).
  - `400 Bad Request`: Validation failure or anti-rollback violation.
  - `401 Unauthorized`: Missing, expired, or malformed JWT token.
  - `403 Forbidden`: Insufficient role or suspended account access attempt.
  - `404 Not Found`: Entity not found or isolated by multi-tenant ownership query.
  - `409 Conflict`: Duplicate unique key (e.g. NTSA plate number, email, phone).
  - `500 Internal Server Error`: Unhandled exception caught by global error middleware.

---

## 6. Kenyan Localization & Environmental Specifics

1. **National Transport and Safety Authority (NTSA) Registration:**
   - Kenyan plates follow standard format: `K[A-Z]{2}\s\d{3}[A-Z]` (e.g. `KDA 123A`, `KDK 450P`).
   - Normalization converts lowercase input and strips rogue hyphens: `kda 123a` $\to$ `KDA 123A`.
2. **Telecommunications Standard (E.164):**
   - Kenyan prefixes `07...` and `01...` (Safaricom, Airtel, Telkom) are normalized to `+2547XXXXXXXX` and `+2541XXXXXXXX` before persistent storage or JWT check-in link dispatch.
3. **Driving Calibration (Nairobi Traffic Profile):**
   - High idling in traffic (Waiyaki Way, Mombasa Road, Thika Road) accelerates engine oil degradation. Baseline daily burn rate defaults to **35 km/day**, with oil service intervals conservatively set to **5,000 km**.
