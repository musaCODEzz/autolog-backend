# 🔄 App Flows & System Architecture Workflows — AutoLog KE

This document maps out the **complete end-to-end user journeys, sequence diagrams, state machines, and data synchronization flows** across the AutoLog KE platform.

---

## 1. High-Level Multi-Stakeholder Ecosystem

AutoLog KE connects five key automotive stakeholders in Kenya:

```mermaid
graph TD
    classDef owner fill:#2563eb,stroke:#1d4ed8,color:#fff
    classDef garage fill:#16a34a,stroke:#15803d,color:#fff
    classDef dealer fill:#d97706,stroke:#b45309,color:#fff
    classDef buyer fill:#9333ea,stroke:#7e22ce,color:#fff
    classDef platform fill:#0f172a,stroke:#334155,color:#fff

    Owner["🚗 Car Owner<br/>(Brian - Nairobi)"]:::owner
    Garage["🔧 Independent Garage<br/>(Fundi Juma - Ngara)"]:::garage
    Dealer["🔩 Spare Parts Dealer<br/>(Kirinyaga Road)"]:::dealer
    Buyer["🔍 Used Car Buyer<br/>(Jiji / Marketplace)"]:::buyer
    Engine["🛡️ AutoLog Platform Core<br/>(Node.js / Mongo / SHA-256)"]:::platform

    Owner -->|"1. Registers vehicle & logs services"| Engine
    Owner -->|"2. One-click weekly check-in via SMS/WhatsApp"| Engine
    Owner -->|"3. Posts Spare-Part RFQ"| Engine

    Garage -->|"4. Confirms job cards (Tier 3 badge)"| Engine
    Dealer -->|"5. Submits blind quotes with 48h price lock"| Engine

    Engine -->|"6. Computes predictions & TCO analytics"| Owner
    Engine -->|"7. Ranks competitive quotes"| Owner

    Owner -->|"8. Generates Digital Handover Certificate"| Buyer
    Buyer -->|"9. Verifies public passport by slug"| Engine
```

---

## 2. Journey 1: Weekly Magic Check-in & Sunday Dispatcher Loop

This flow eliminates motorist laziness by removing app installations and passwords.

```mermaid
sequenceDiagram
    autonumber
    participant Cron as ⏰ Node-Cron Daemon (Sunday 18:00 EAT)
    participant Dispatcher as 📡 Dispatcher Service
    participant DB as 🗄️ MongoDB Atlas
    participant SMS as 📱 WhatsApp / SMS Gateway
    participant Owner as 👤 Car Owner
    participant Server as 🛡️ AutoLog API Server

    Cron->>Dispatcher: Trigger scheduled weekly scan
    Dispatcher->>DB: Query active vehicles where lastCheckinPromptSentAt <= 7 days ago
    DB-->>Dispatcher: Return stale vehicles list

    loop For each stale vehicle
        Dispatcher->>Server: Generate signed 72h JWT Check-in Token
        Server-->>Dispatcher: Signed Magic Token
        Dispatcher->>SMS: Dispatch SMS / WhatsApp prompt
        SMS->>Owner: "Habari! Your Mazda CX-5 was at 64,000 km. Tap to check in: autolog.ke/checkin?token=..."
        Dispatcher->>DB: Update lastCheckinPromptSentAt = now()
    end

    Note over Owner: Motorist taps magic link on mobile browser

    Owner->>Server: GET /api/v1/vehicles/checkin/:token
    Server->>Server: Verify token signature and 72h expiry
    Server->>DB: Fetch vehicle details (plate, make, model, currentMileage)
    Server-->>Owner: Render 1-click check-in screen (Odometer slider / input)

    Owner->>Server: POST /api/v1/vehicles/checkin/submit { newMileage: 65200 }
    Server->>Server: Anti-Rollback Guard: newMileage >= currentMileage?
    alt Rollback Attempt (newMileage < currentMileage)
        Server-->>Owner: ❌ HTTP 400 Odometer Rollback Detected!
    else Valid Progression (newMileage >= currentMileage)
        Server->>Server: Recalculate dynamic burn rate (estDailyKm)
        Server->>DB: Update vehicle (currentMileage, estDailyKm, lastMileageUpdate)
        Server-->>Owner: ✅ HTTP 200 Odometer updated! Show health status.
    end
```

---

## 3. Journey 2: 3-Tier Service Logging & Anti-Fraud Verification

This workflow handles the transition from informal fundis with paper receipts to verified digital records.

```mermaid
flowchart TD
    Start([Car Owner or Garage Logs Service]) --> Input[Fill Service Details: Date, Mileage, Cost, Garage Name, Parts]
    Input --> PhotoCheck{Is physical receipt or job card photo uploaded?}

    PhotoCheck -- No --> SetTier1[Assign: TIER_1_SELF<br/>Gray Badge: Self-reported without proof]
    PhotoCheck -- Yes --> SetTier2[Assign: TIER_2_DOCUMENTED<br/>Amber Badge: Verified by receipt snapshot]

    SetTier1 --> PartnerCheck{Is loggedBy an accredited Partner Garage?}
    SetTier2 --> PartnerCheck

    PartnerCheck -- Yes: isVerifiedPartner == true --> SetTier3[Upgrade: TIER_3_PARTNER<br/>Green Badge: Partner Certified Garage]
    PartnerCheck -- No --> BackdateCheck{Is serviceDate older than 30 days?}

    SetTier3 --> BackdateCheck

    BackdateCheck -- Yes: > 30 days ago --> FlagBackdated[Set isBackdated: true<br/>⚠️ Historic Backdated Entry Warning Badge]
    BackdateCheck -- No --> CleanRecord[Set isBackdated: false]

    FlagBackdated --> OdometerSync{Is mileageAtService > vehicle.currentMileage?}
    CleanRecord --> OdometerSync

    OdometerSync -- Yes --> AdvanceOdometer[Auto-advance vehicle.currentMileage to mileageAtService]
    OdometerSync -- No --> SaveRecord[Save ServiceRecord to MongoDB]
    AdvanceOdometer --> SaveRecord

    SaveRecord --> Recalculate[Trigger Predictive Maintenance Engine Recalibration]
    Recalculate --> End([Updated Digital Passport Ready])

    classDef green fill:#16a34a,stroke:#15803d,color:#fff;
    classDef amber fill:#d97706,stroke:#b45309,color:#fff;
    classDef gray fill:#4b5563,stroke:#374151,color:#fff;
    classDef red fill:#dc2626,stroke:#b91c1c,color:#fff;

    class SetTier3 green;
    class SetTier2 amber;
    class SetTier1 gray;
    class FlagBackdated red;
```

### 3.1 Asynchronous Receipt Attachment & Tier 2 Upgrade Loop (`PATCH /services/:id/receipt`)
When a motorist logs a roadside maintenance record in a hurry, it enters the ledger as `TIER_1_SELF` (Gray Badge). Once at home or upon finding the physical paper invoice:
1. Owner/logger calls `PATCH /api/v1/services/:id/receipt` with `{ receiptUrl: "https://..." }`.
2. Multi-tenant access guard ensures only the vehicle owner, recording garage, or admin can modify the record.
3. If current status is `TIER_1_SELF`, it automatically upgrades to `TIER_2_DOCUMENTED` (Amber Badge).
4. If already `TIER_3_PARTNER`, the high-trust partner status is preserved while storing the receipt photo URL.

---

## 4. Journey 3: Kirinyaga Road Spare Parts RFQ Blind-Bidding

This flow eliminates price fixing, broker commissions, and counterfeit substitutions.

```mermaid
sequenceDiagram
    autonumber
    participant Owner as 🚗 Car Owner
    participant API as 🛡️ AutoLog Backend
    participant DealerA as 🔩 Kirinyaga Road Dealer A
    participant DealerB as 🔩 Industrial Area Dealer B
    participant DB as 🗄️ MongoDB Atlas

    Owner->>API: POST /api/v1/rfq { partName: "Front Brake Discs", preference: "OEM_MATCH", urgency: "CRITICAL" }
    API->>DB: Save PartRequest (status: 'OPEN')
    API-->>Owner: RFQ Broadcasted (status: 201)

    Note over DealerA,DealerB: Dealers view open feed, but CANNOT see competing quotes

    DealerA->>API: POST /api/v1/rfq/:id/quotes { brand: "Brembo", priceKes: 14500, warrantyDays: 90 }
    API->>API: Set validUntil = now() + 48 hours (Price Lock)
    API->>DB: Save Quote A (status: 'PENDING')

    DealerB->>API: POST /api/v1/rfq/:id/quotes { brand: "Ferodo", priceKes: 12000, warrantyDays: 60 }
    API->>API: Set validUntil = now() + 48 hours (Price Lock)
    API->>DB: Save Quote B (status: 'PENDING')

    Owner->>API: GET /api/v1/rfq/:id/quotes
    API->>DB: Fetch quotes for this RFQ (Authorized for vehicle owner only)
    API-->>Owner: Return ranked quotes with prices, warranties, and dealer ratings

    Note over Owner: Owner accepts Dealer B's quote (KES 12,000)

    Owner->>API: PATCH /api/v1/rfq/quotes/:quoteIdB/accept
    API->>DB: Transaction: Set Quote B -> 'ACCEPTED', RFQ -> 'FULFILLED'
    API->>DB: Auto-Reject all other pending quotes (Quote A -> 'REJECTED')
    API-->>Owner: ✅ Quote locked! Dealer contact and Kirinyaga Road pickup shop revealed.
    API-->>DealerB: 🔔 Notification: Quote accepted! 48h price lock in effect.
```

---

## 5. Journey 4: Digital Handover Certificate & Used Car Buyer Verification

How a buyer verifies vehicle authenticity before wiring money on M-Pesa.

```mermaid
flowchart LR
    classDef buyer fill:#2563eb,stroke:#1d4ed8,color:#fff
    classDef server fill:#0f172a,stroke:#334155,color:#fff
    classDef cert fill:#16a34a,stroke:#15803d,color:#fff

    Owner([Seller / Owner]):::buyer -->|Calls GET /vehicles/:id/certificate| API[AutoLog API]:::server
    API --> GenerateHash[Compute SHA-256 Hash<br/>plate + mileage + services + tier3 + timestamp]:::server
    GenerateHash --> FormSerial[Format Serial:<br/>AL-KE-2026-TOYOT-A3F1]:::server
    FormSerial --> IssueCert[Issue Handover Certificate]:::cert

    IssueCert -->|Exports PDF / Share Link| Buyer([Prospective Car Buyer]):::buyer
    Buyer -->|Scans QR or opens autolog.ke/passport/:slug/certificate| API
    API --> PrivacyMask{Is Public Request?}

    PrivacyMask -- Yes --> MaskData[Mask Identifiers:<br/>Plate: KD* ***A<br/>Chassis: ...5161]:::server
    PrivacyMask -- No (Owner/Bank) --> FullData[Show Full NTSA Plate & Chassis]:::server

    MaskData --> Display[Render Tamper-Proof Passport Certificate:<br/>• SHA-256 Fingerprint<br/>• Odometer Progression Curve<br/>• Trust Badges<br/>• Predictive Health Status]:::cert
    FullData --> Display
```

---

## 6. Journey 5: Total Cost of Ownership (TCO) Proportional Aggregation

How multi-category invoices are parsed without mathematical double counting.

```mermaid
flowchart TD
    Request([GET /vehicles/:id/analytics]) --> Match[Stage 1: $match vehicle ID]
    Match --> AddFields[Stage 2: $addFields allocatedCostKes = costKes / size of serviceType]
    AddFields --> Unwind[Stage 3: $unwind serviceType]
    Unwind --> Group[Stage 4: $group by serviceType, sum allocatedCostKes]
    Group --> Sort[Stage 5: $sort totalAmountKes descending]
    Sort --> CalculatePerKm[Calculate KES/km = totalSpend / trackedDistanceKm]
    CalculatePerKm --> CalculateMonthly[Calculate KES/month = totalSpend / elapsedMonths]
    CalculateMonthly --> Response([Return Clean TCO Financial Dashboard])
```
