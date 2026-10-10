# 🛡️ AutoLog KE — Platform Overview & Technical Whitepaper

> **Kenya's Digital Vehicle Passport, Predictive Maintenance Engine, and Verified Spare-Parts RFQ Marketplace.**
> 
> *A comprehensive briefing document prepared for Engineering Teams, Product Stakeholders, and Strategic Investors.*

---

## Executive Summary

**AutoLog KE** is a vertically integrated automotive trust and maintenance platform engineered specifically for the Kenyan and broader East African automotive ecosystem.

In East Africa, purchasing and maintaining a vehicle is fraught with systemic market failures:
1. **Over 60% of used cars** sold across Kenyan car bazaars, classifieds, and yards have clocked (rolled-back) odometers.
2. **Paper service booklets fade, tear, or are routinely forged**, destroying vehicle resale value and leaving buyers blind to catastrophic mechanical neglect.
3. **The Kirinyaga Road spare-parts market** is plagued by unverified street middlemen (*"Kamagera"*), grey-market counterfeit parts, and the rampant *"Bei ilipanda asubuhi"* (price bait-and-switch) practice.
4. **Sales classifieds expose full registration plates**, exposing car owners to identity theft, tracking, and clone plate syndicates.

AutoLog KE resolves these market inefficiencies through a tamper-evident software ecosystem comprising:
* **A Privacy-Shielded Digital Vehicle Passport (`autolog.ke/passport/:slug`)** with masked plates and chassis numbers.
* **A 3-Tier Verifiable Service History Engine** linking car owners to verified partner mechanics.
* **An Immutable Anti-Rollback Odometer Engine** with dynamic daily driving burn rate recalibration.
* **A One-Click Mobile Web Check-in Engine** using cryptographically signed, zero-friction 72-hour magic tokens.
* **A Spare Parts RFQ Marketplace** with anti-cartel blind bidding and a contractually binding **48-Hour Price Lock Guarantee**.

---

## The Market Opportunity & Unit Economics

### The Market Size (Kenya & East Africa)
* **Registered Motor Vehicles in Kenya:** Over **4.2 Million** vehicles, growing at ~8% annually.
* **Annual Used Car Imports & Secondary Sales:** ~120,000 imports/year + ~350,000 local secondary market ownership transfers.
* **Annual Aftermarket Parts & Service Spend:** An estimated **$1.8 Billion USD** spent annually in Kenya across spare parts, regular servicing, and major repairs.

### Business Model & Monetization Vectors

| Revenue Stream | Target Customer | Pricing Structure | Value Proposition |
| :--- | :--- | :--- | :--- |
| **Partner Accreditation (SaaS)** | Garages & Workshops | 3,500 – 10,000 KES / month | Unlocks Tier-3 digital service stamping, verified badge, and priority RFQ job routing. |
| **Parts Marketplace Take-Rate** | Spare Parts Dealers | 3.5% – 5.0% per closed quote | Direct access to qualified, intent-driven parts buyers with fitment pre-validated. |
| **Buyer Passport Audits** | Used Car Buyers | 500 – 1,500 KES per full audit | Instant, comprehensive digital passport audit with rollback history & service score. |
| **Underwriting APIs** | Insurers & Auto Lenders | API consumption / volume tier | Actuarial verification of real odometer mileage, reducing insurance fraud & collateral risk. |

---

## Core Product Architecture

```
                                 ┌──────────────────────────────────────────────┐
                                 │              AutoLog KE Platform             │
                                 └──────────────────────┬───────────────────────┘
                                                        │
         ┌──────────────────┬───────────────────────────┼───────────────────────────┬──────────────────┐
         ▼                  ▼                           ▼                           ▼                  ▼
┌──────────────────┐ ┌──────────────────┐     ┌──────────────────┐        ┌──────────────────┐ ┌──────────────────┐
│ Digital Passport │ │ Check-in & Cron  │     │ Predictive Maint │        │ Spare Parts RFQ  │ │ Admin Governance │
│  & Public Health │ │    Dispatcher    │     │  Alerts Engine   │        │   Marketplace    │ │    & Security    │
├──────────────────┤ ├──────────────────┤     ├──────────────────┤        ├──────────────────┤ ├──────────────────┤
│• Masked Plates   │ │• 72h Magic Token │     │• Kenyan Intervals│        │• Fitment Link    │ │• Partner Vetting │
│• 3-Tier History  │ │• Anti-Rollback   │     │• Service Mapping │        │• Blind Bidding   │ │• Session Revoke  │
│• Trust Scoring   │ │• Sun 18:00 Cron  │     │• Urgency Status  │        │• 48h Price Lock  │ │• Health Metrics  │
│• Health Badges   │ │• Anti-Spam Guard │     │• Cambelt Advisory│        │• Atomic Closing  │ │• Fraud Defense   │
└──────────────────┘ └──────────────────┘     └──────────────────┘        └──────────────────┘ └──────────────────┘
```

---

## Detailed Component Breakdown

### 1. The Digital Vehicle Passport Module

Every registered vehicle is assigned an opaque, SEO-friendly slug (e.g. `subaru-forester-7f9a2b`). Prospective buyers, insurance inspectors, and dealerships can inspect the vehicle's provenance without the owner sharing personal documents.

* **Privacy Shield:**
  * Number plates are normalized to NTSA format (`KDA 123A`) internally, but publicly masked as `KD* ***A`.
  * Chassis / VIN numbers are truncated to show only the last 4 digits (e.g. `...3842`).
  * Owner identity, phone numbers, and home addresses are completely stripped from public responses.
* **3-Tier Verification Engine:**
  * **Tier 1 (Self-Reported):** Owner manually inputs a service entry (e.g. self oil change).
  * **Tier 2 (Documented):** Owner uploads photographic evidence (KRA ETR receipt, physical job card via Cloudinary).
  * **Tier 3 (Partner Verified):** Stamped directly by an accredited, verified AutoLog partner garage.
* **Retroactive Fraud Defense:**
  * If a service record is logged with a date older than 30 days, the engine flags it with `isBackdated: true`, permanently preserving the audit trail so sellers cannot fabricate a clean history before listing.

---

### 2. The One-Click Mobile Web Check-in Engine (Milestone 12)

Vehicle odometers must stay up to date for predictive maintenance countdowns to work. However, forcing car owners to remember passwords or download a heavy app leads to 90%+ user drop-off.

#### How It Works:
1. **Automated Trigger:** The platform generates a single-purpose, cryptographically signed magic token:
   $$\text{Token} = \text{HMAC-SHA256}(\{\text{vehicleId}, \text{action}: \text{'checkin'}, \text{exp}: \text{now} + 72\text{h}\}, \text{JWT\_SECRET})$$
2. **Dispatched Link:** The driver receives a link (via SMS, WhatsApp link, or Email):
   `https://autolog.ke/checkin?token=eyJhbGciOi...`
3. **Instant Resolution:** Tapping the link opens a responsive mobile screen. The frontend calls:
   `GET /api/v1/vehicles/checkin/:token`
   This resolves the vehicle's Make, Model, Plate, and Current Mileage **without requiring any login**.
4. **Anti-Rollback Verification:**
   The user inputs their current odometer reading. When submitted:
   `POST /api/v1/vehicles/checkin/:token` `{ "newMileage": 83450 }`
   The server mathematically enforces:
   $$\text{newMileage} \ge \text{currentMileage}$$
   If an owner attempts to enter a lower number, the transaction is rejected with **HTTP 400 Bad Request**.

#### Dynamic Driving Burn Rate Recalibration Formula:
If $\ge 1$ day has elapsed since the last update, AutoLog recalibrates the driver's daily distance:
$$\Delta\text{Days} = \frac{T_{\text{now}} - T_{\text{last}}}{1000 \times 60 \times 60 \times 24}$$
$$\text{Observed Daily Rate} = \text{round}\left(\frac{\text{newMileage} - \text{currentMileage}}{\Delta\text{Days}}\right)$$
$$\text{recalculatedDailyKm} = \min(\max(\text{Observed Daily Rate}, 1), 1000)$$

This bounded rate automatically adjusts future maintenance predictions (e.g. predicting oil change due dates based on whether the owner drives $25\text{ km/day}$ in Nairobi traffic vs $90\text{ km/day}$ on highway commutes).

---

### 3. Automated Weekly Check-in Dispatcher Engine (Milestone 13)

To solve user inertia and ensure odometers remain current without nagging drivers, AutoLog features an autonomous background dispatcher:

* **Sunday 18:00 EAT Cron Daemon:** Runs on a scheduled cron pattern (`0 18 * * 0` in East Africa Time `Africa/Nairobi`), timed right when Kenyan drivers finish weekend trips and prepare for the weekday commute.
* **Anti-Spam Idempotency Guard (`lastCheckinPromptSentAt`):**
  A vehicle is only dispatched if:
  $$\text{lastMileageUpdate} \le \text{now} - 7\text{ days} \quad \text{AND} \quad (\text{lastCheckinPromptSentAt} \le \text{now} - 7\text{ days} \lor \text{null})$$
  This strictly prevents spamming users who already checked in or who received a prompt recently.
* **On-Demand Admin Batch Trigger:** `POST /api/v1/vehicles/checkin/dispatch-stale` allows authorized administrators to manually trigger prompt generation and inspect batch dispatch metrics.

---

### 4. Smart Predictive Maintenance & Public Health Engine (Milestones 14 & 15)

The predictive maintenance engine bridges verified mileage data and historical garage service logs to calculate vehicle component lifespans tailored for Kenyan driving realities (dust, potholes, stop-and-go traffic).

#### Standard Service Rules & Kenyan Driving Intervals:
| Component Key | Maintenance Action | Interval | Est. Cost (KES) | Kenyan Condition Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `ENGINE_OIL` | Engine Oil & OEM Filter Replacement | 5,000 km | 6,500 | Synthetic 5W-30 / 0W-20 for high-temp urban traffic. |
| `AIR_FILTER` | Engine Air & Cabin AC Filters | 10,000 km | 3,000 | Essential for dusty Nairobi bypasses and upcountry marram roads. |
| `BRAKE_PADS` | Front/Rear Brake Pads & Caliper Inspection | 20,000 km | 7,500 | Wear inspection under heavy braking and matatu traffic. |
| `TRANSMISSION_FLUID` | Automatic / CVT Gearbox Fluid Flush | 40,000 km | 14,500 | Crucial for Subaru Lineartronic and Toyota Super CVT-i gearboxes. |
| `SPARK_PLUGS` | Iridium / Platinum Spark Plugs | 50,000 km | 8,500 | Prevents misfires and restores fuel economy. |
| `TIMING_BELT` | Timing Belt, Water Pump & Serpentine Belts | 100,000 km | 32,000 | Critical preventative replacement to avoid valve-piston collision. |

#### Service History Mapping & Dynamic Intervals:
- **With Service History:** When `ServiceRecord` logs exist (e.g. oil change done at $79,000\text{ km}$), next due mileage dynamically anchors to $79,000 + 5,000 = 84,000\text{ km}$.
- **Without Service History:** Calculates cycle milestone intervals based on current mileage.
- **Urgency Classification:**
  - `OVERDUE`: Current mileage exceeds target due mileage ($\le 0$ km remaining).
  - `DUE_SOON`: Within $500\text{ km}$ or $\le 14\text{ days}$ of service due date.
  - `HEALTHY`: More than $500\text{ km}$ and $> 14\text{ days}$ remaining.
- **Cambelt Advisory:** Automatically alerts on vehicles with $\ge 90,000\text{ km}$ without recorded cambelt replacement.
- **Public Passport Predictive Health:**
  `GET /api/v1/vehicles/passport/:slug` attaches `predictiveHealth` (`overallHealthStatus` and `nextUpcomingService`), giving prospective used-car buyers instant visibility into maintenance integrity with zero privacy leaks.

---

### 5. Spare Parts RFQ & 48-Hour Price Lock Engine

Sourcing auto parts in Nairobi often involves walking down Kirinyaga Road or calling multiple scrap yards in Grogon, only to be quoted inflated prices by street middlemen (*"Kamagera"*).

#### Features:
1. **Fitment Auto-Extraction:** When an owner creates a Part Request, the engine automatically extracts the vehicle's exact make, model, year, engine code, fuel type, and transmission.
2. **Anti-Cartel Blind Bidding:** Competing parts dealers cannot see other dealers' bids. They only see the vehicle's fitment specs, part category, and urgency level.
3. **48-Hour Price Lock Guarantee:**
   Every quote submitted by a dealer has a contractually binding `validUntil` timestamp:
   $$\text{validUntil} = \text{submittedAt} + 48\text{ Hours}$$
   Dealers cannot hike prices or claim *"the price changed this morning"* once the customer arrives.
4. **Atomic Deal Finalization:**
   When the car owner accepts a quote (`PATCH /api/v1/rfq/quotes/:id/accept`):
   - The winning quote is marked `ACCEPTED`.
   - The RFQ status is marked `CLOSED`.
   - **All competing dealer bids are automatically and atomically marked `REJECTED`.**
   - Direct contact details are released between the buyer and the verified dealer.

---

### 4. Admin Governance & Security Architecture

The platform includes comprehensive defense-in-depth mechanisms:

| Threat Vector | Real-World Scenario | Platform Defense |
| :--- | :--- | :--- |
| **Privilege Escalation** | Rogue user passes `{"role": "admin"}` in registration. | Zod `registerRoleEnum` strictly allows only `owner`, `garage`, or `dealer`. Admin accounts can only be seeded via secure CLI scripts (`npm run seed:admin`). |
| **Banned Account Token Abuse** | Suspended dealer uses a pre-existing 7-day JWT token. | `protect` middleware performs a live check on `user.isSuspended` in MongoDB on **every single request**, immediately terminating banned sessions with `403 Forbidden`. |
| **Commercial Profile Pollution** | Private owner passes fake business ratings or location. | Zod validator bouncer and Mongoose pre-save hooks strip commercial fields from private owner records. |
| **Fake Partner Stamping** | Unvetted mechanic claims to be an authorized dealer. | Only admins can toggle `isVerifiedPartner: true`. Unverified garages are prevented from issuing Tier 3 stamps. |

---

## Technical Specifications

### Modern Technology Stack

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Runtime** | Node.js v22 LTS | Enterprise stability, modern ECMAScript features, fast V8 execution. |
| **Language** | TypeScript 5.x | Strict type safety, interface-driven contracts, zero runtime type errors. |
| **Web Framework** | Express 5.x | High-throughput asynchronous REST API routing and middleware pipeline. |
| **Database** | MongoDB Atlas 7.0 | Document flexibility for vehicle specs, nested service parts, and compound indexes. |
| **Validation** | Zod v4 | Runtime schema bouncers with custom Kenyan plate & phone refinements. |
| **Testing** | Vitest + Supertest | Blazing fast parallel execution (~18s) with in-memory MongoDB (`mongodb-memory-server`). |
| **Documentation** | OpenAPI 3.0 / Swagger UI | Interactive API explorer accessible at `/api-docs`. |
| **Containerization** | Docker (Alpine Multi-Stage) | Secure, minimal production container image (<180MB). |
| **CI/CD** | GitHub Actions | Automated matrix testing (Node 20 & 22) and Docker build gates. |

---

## Complete API Reference

### 1. Authentication Endpoints (`/api/v1/auth`)

#### Register Account
`POST /api/v1/auth/register`
```json
{
  "name": "Musa Kibet",
  "email": "musa@autolog.co.ke",
  "phone": "0712345678",
  "password": "Password123!",
  "role": "owner"
}
```
*Phone numbers are normalized to E.164 (`+254712345678`) automatically.*

#### Dual-Mode Login
`POST /api/v1/auth/login`
```json
{
  "identifier": "0712345678", 
  "password": "Password123!"
}
```
*(Accepts either email address OR Kenyan phone number).*

---

### 2. Vehicle Passport Endpoints (`/api/v1/vehicles`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/vehicles` | Register vehicle to passport (auto-slug generation) | Owner |
| `GET` | `/api/v1/vehicles` | List all vehicles owned by logged-in user | Owner |
| `GET` | `/api/v1/vehicles/:id` | Get vehicle details by ID | Owner |
| `PATCH` | `/api/v1/vehicles/:id/mileage` | Update odometer reading (Rollback protected) | Owner |
| `GET` | `/api/v1/vehicles/:id/predictions` | Predictive maintenance schedule & urgency alerts | Owner / Admin |
| `GET` | `/api/v1/vehicles/passport/:slug` | Public sanitized passport with masked plate & health | **Public** |

---

### 3. One-Click Check-in & Dispatcher Endpoints (`/api/v1/vehicles/checkin`)

#### Trigger Stale Check-in Dispatch Batch
`POST /api/v1/vehicles/checkin/dispatch-stale` *(Private - Admin Only)*
```json
// Response (200 OK)
{
  "success": true,
  "message": "Dispatched 12 check-in prompts to drivers with stale odometers",
  "data": {
    "dispatchedCount": 12,
    "timestamp": "2026-10-02T15:00:00.000Z"
  }
}
```

#### Generate Check-in Token
`POST /api/v1/vehicles/:id/checkin-token` *(Private - Owner / Admin)*
```json
// Response (200 OK)
{
  "success": true,
  "message": "Check-in link generated successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "checkinUrl": "http://localhost:5173/checkin?token=eyJhbGciOi...",
    "expiresIn": "72h"
  }
}
```

#### Resolve Mobile Screen Data
`GET /api/v1/vehicles/checkin/:token` *(Public - Token Governed)*
```json
// Response (200 OK)
{
  "success": true,
  "data": {
    "vehicleId": "6aac3e02bacb9ba29db43973",
    "plateNumber": "KDA 123A",
    "make": "Toyota",
    "model": "Fielder",
    "year": 2018,
    "currentMileage": 82000,
    "mileageUnit": "KM",
    "estDailyKm": 35,
    "lastMileageUpdate": "2026-09-24T19:31:23.122Z"
  }
}
```

#### Submit New Odometer Reading
`POST /api/v1/vehicles/checkin/:token` *(Public - Token Governed)*
```json
// Request Body
{
  "newMileage": 83500
}

// Response (200 OK)
{
  "success": true,
  "message": "Toyota Fielder (KDA 123A) odometer updated to 83,500 KM",
  "data": {
    "vehicleId": "6aac3e02bacb9ba29db43973",
    "plateNumber": "KDA 123A",
    "make": "Toyota",
    "model": "Fielder",
    "previousMileage": 82000,
    "currentMileage": 83500,
    "distanceTraveled": 1500,
    "recalculatedDailyKm": 50,
    "lastMileageUpdate": "2026-09-26T18:11:59.203Z"
  }
}
```

---

### 4. Predictive Maintenance Endpoints (`/api/v1/vehicles/:id/predictions`)

#### Get Comprehensive Predictive Maintenance Schedule
`GET /api/v1/vehicles/:id/predictions` *(Private - Owner / Admin)*
```json
// Response (200 OK)
{
  "success": true,
  "data": {
    "vehicle": {
      "id": "6abd140445018a7fc28b6570",
      "plateNumber": "KDD 842P",
      "make": "Toyota",
      "model": "Land Cruiser Prado",
      "year": 2019,
      "currentMileage": 79000,
      "estDailyKm": 35,
      "lastMileageUpdate": "2026-10-01T13:52:06.000Z"
    },
    "predictionsSummary": {
      "currentMileage": 79000,
      "estDailyKm": 35,
      "overallStatus": "HEALTHY",
      "nextUpcomingService": {
        "key": "ENGINE_OIL",
        "name": "Engine Oil & Oil Filter Replacement",
        "intervalKm": 5000,
        "lastServiceMileage": 79000,
        "nextDueMileage": 84000,
        "kmRemaining": 5000,
        "daysRemaining": 143,
        "estimatedDueDate": "2027-02-20T13:52:06.000Z",
        "estimatedCostKes": 6500,
        "urgency": "HEALTHY",
        "alertMessage": "Engine Oil & Oil Filter Replacement is healthy. Next due at 84,000 km (in 5,000 km / ~143 days)"
      },
      "predictions": [
        {
          "key": "ENGINE_OIL",
          "name": "Engine Oil & Oil Filter Replacement",
          "intervalKm": 5000,
          "nextDueMileage": 84000,
          "kmRemaining": 5000,
          "daysRemaining": 143,
          "estimatedCostKes": 6500,
          "urgency": "HEALTHY"
        }
      ]
    }
  }
}
```

---

### 5. Official Handover Certificate Endpoints (`/api/v1/vehicles/:id/certificate`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/vehicles/:id/certificate` | Generate unmasked handover certificate with SHA-256 hash | Private (Owner/Admin) |
| `GET` | `/api/v1/vehicles/passport/:slug/certificate` | Public digital handover certificate with masked plate & chassis | Public (No Auth) |

---

### 6. Total Cost of Ownership (TCO) & Analytics (`/api/v1/vehicles/:id/analytics`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/vehicles/:id/analytics` | TCO spend breakdown, running cost per km (KES/km), monthly average | Private (Owner/Admin) |

---

### 7. Service Record Endpoints (`/api/v1/services`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/services` | Log new maintenance record (Tier 1, 2, or 3) | Private (Owner/Garage) |
| `GET` | `/api/v1/services/vehicle/:vehicleId` | Retrieve full service history for vehicle | Private (Owner/Garage) |
| `GET` | `/api/v1/services/:id` | Get single service record details | Private |
| `PATCH`| `/api/v1/services/:id/receipt` | Attach receipt photo URL and upgrade from Tier 1 to Tier 2 | Private (Owner/Logger/Admin) |

---

### 8. Spare Parts RFQ Endpoints (`/api/v1/rfq`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/rfq/requests` | Post spare part request linked to vehicle fitment | Owner / Garage |
| `GET` | `/api/v1/rfq/requests/my` | View my requested parts and quote counts | Owner / Garage |
| `GET` | `/api/v1/rfq/feed` | Dealer Feed: Open RFQs filtered by category | Dealer / Admin |
| `POST` | `/api/v1/rfq/quotes` | Submit quote with mandatory 48-Hour Price Lock | Dealer |
| `PATCH` | `/api/v1/rfq/quotes/:id/accept` | Accept winning quote (Locks deal & auto-rejects others)| Requester |

---

## Testing & Quality Assurance Summary

The platform is fortified by **81 automated integration tests** executing against an isolated in-memory MongoDB cluster across **11 dedicated test suites**. Zero cloud databases are polluted during test runs.

```bash
# Execute entire test suite sequentially with zero port collisions
npm test
```

### Verified Test Matrix (81/81 Passing - 100% Green)

| Test Suite | File | Tests | Key Invariants Verified |
| :--- | :--- | :--- | :--- |
| **System Health** | `tests/health.test.ts` | 3 | API liveness, uptime tracker, Swagger docs endpoint. |
| **Auth Engine** | `tests/auth.test.ts` | 10 | Kenyan phone normalization (`+254`), dual login, password hashing, commercial isolation. |
| **Vehicle Passport**| `tests/vehicle.test.ts` | 15 | NTSA plate regex, duplicate rejection, anti-rollback, public slug passport, health badges, certificate generation. |
| **Mobile Check-in** | `tests/checkin.test.ts` | 9 | 72h magic tokens, owner authorization, rollback rejection (400), dynamic burn rate recalibration. |
| **Weekly Dispatcher** | `tests/dispatcher.test.ts` | 5 | Cron schedule, stale vehicle discovery, anti-spam idempotency guard (`lastCheckinPromptSentAt`). |
| **Service Engine** | `tests/service.test.ts` | 7 | Tier 1/2/3 stamps, auto-odometer progression, 30-day backdating fraud detection, receipt upgrade to Tier 2. |
| **Spare Parts RFQ** | `tests/rfq.test.ts` | 8 | Fitment extraction, blind dealer feed, 48h price locks, atomic winning quote acceptance. |
| **Admin Operations**| `tests/admin.test.ts` | 8 | Partner accreditation, live token suspension revocation, platform aggregate analytics. |
| **Predictive Engine**| `tests/predictions.test.ts` | 7 | Kenyan service intervals, service history mapping, overdue urgency sorting, high-mileage cambelt advisory. |
| **Handover Certificate** | `tests/certificate.test.ts` | 4 | Deterministic SHA-256 fingerprint, serial generation (`AL-KE-YYYY-...`), privacy masking for public buyers. |
| **TCO Analytics** | `tests/analytics.test.ts` | 5 | Proportional cost allocation across multi-category records, KES/km calculation, zero-spend baseline. |

---

## Future Roadmap (Phase 2 & Beyond)

1. **Frontend Passport Dashboard:** Rich interactive UI displaying trust score badges, dynamic countdown dials, and service timeline history (`autolog-frontend`).
2. **AI Dashboard Camera OCR:** Car owners snap a photo of their physical dashboard cluster; Google Gemini Vision / OCR extracts the verified odometer reading and cross-verifies against check-engine warning lights.
3. **Automated WhatsApp / SMS Gateway:** Official Meta WhatsApp Cloud API / Africa's Talking integration to dispatch magic links directly via WhatsApp chats.
4. **Insurance & Bank Underwriting Portal:** Dedicated B2B portal for Kenyan insurers (e.g. Jubilee, Britam, CIC) and asset financers to inspect vehicle histories before underwriting comprehensive policies.

---

*Authored by the AutoLog KE Core Engineering Team.*  
*Repository: [github.com/musaCODEzz/autolog-backend](https://github.com/musaCODEzz/autolog-backend)*
