# 📋 Product Requirements Document (PRD) — AutoLog KE

**Project:** AutoLog KE — Kenya's Digital Vehicle Service Passport, Smart Maintenance Predictor, and Verified Spare-Parts RFQ Platform  
**Version:** 1.0.0  
**Status:** In Development  
**Target Market:** Kenya (Nairobi initial launch: Ngara, Grogan, Kirinyaga Road, Industrial Area)  
**Target Audience:** Car Owners, Independent Fundis/Garages, Kirinyaga Road & Industrial Area Spare-Parts Dealers.

---

## 1. Executive Summary & Vision
In Kenya, the second-hand vehicle market is riddled with lack of transparency:
1. **Clocked Odometers:** Unscrupulous sellers roll back digital and analog odometers before listing on Jiji or Facebook Marketplace.
2. **Falsified/Lost Records:** Vehicle service history is kept in physical booklets that are easily misplaced or fabricated.
3. **Counterfeit & Unregulated Spare Parts:** Sourcing parts from Kirinyaga Road involves price gouging, counterfeit packaging, and bait-and-switch tactics.

**AutoLog KE** solves this with three pillars:
- **Digital Vehicle Passport:** An immutable, shareable web passport (`autolog.ke/passport/:slug`) proving genuine service history with privacy masking.
- **Predictive Maintenance Engine:** Calculates dynamic mileage burn rate (~35 km/day Kenyan average) and alerts owners before critical service intervals (e.g. 5,000 km oil change, 40,000 km CVT fluid).
- **Verified RFQ Spare-Parts Engine:** Enables car owners to request genuine, OEM, or tested parts with a mandatory 48-hour price lock guarantee from vetted dealers.

---

## 2. The 7 Loophole Defenses (Business Rules)

| # | Attack Vector | Defense Engine | Technical Rule & Implementation |
|---|---------------|----------------|---------------------------------|
| 1 | **Fake historic logs before selling** | 3-Tier Verification Engine | Any log backdated by >30 days receives `isBackdated: true` flag and "⚠️ Historic Backdated Entry" warning badge on public passport. |
| 2 | **Car tracking & theft via plate** | Strict Data Masking | Public passport masks plates (`KD* ***P`) and VIN (`...WA3921`). No personal contact info or home address is ever exposed. |
| 3 | **Informal fundis without smartphones** | Zero-Friction Owner Capture | Fundi does not need an app or account. Owner uploads a photo of the paper receipt/job card via their phone camera. |
| 4 | **Odometer rollback** | Immutable Progression Curve | Mathematical validation: `mileageAtService >= previousServiceMileage`. Lower mileage triggers an `ODOMETER_ROLLBACK_DETECTED` red flag. |
| 5 | **Kirinyaga Road bait-and-switch** | 48-Hour Price Lock | Dealer quotes carry a cryptographic/timestamped 48-hour price lock. Buyers rate dealers (1–5 stars); bait-and-switch causes dealer de-listing. |
| 6 | **User laziness & forgetting to log** | SMS Micro-Checkins | Bi-monthly 1-click SMS check-in ("Reply with your dash km"). Algorithm recalibrates daily km burn rate automatically. |
| 7 | **Chicken-and-egg marketplace dilemma** | Single-Player Utility Strategy | The platform provides 100% utility to car owners immediately for tracking & resale, even before parts dealers join. |

---

## 3. The 3-Tier Verification Hierarchy

Every service record on AutoLog KE is stamped with a Trust Tier:

- ⚪ **Tier 1 — Self-Reported (Gray Badge):**
  - Logged by owner without photo evidence.
  - Public badge: *"Self-reported by owner without documentary proof."*
- 🟡 **Tier 2 — Documented Entry (Amber Badge):**
  - Owner uploads a photo of a stamped job card, physical garage invoice, or KRA ETR receipt.
  - Image stored on Cloudinary with metadata inspection.
  - Public badge: *"Documented with physical receipt/invoice snapshot."*
- 🟢 **Tier 3 — Partner Certified (Green Verified Shield):**
  - The record is verified and confirmed directly by a registered, vetted AutoLog partner garage or authorized dealer.
  - Highest trust level, guarantees authenticity to used car buyers.

---

## 4. Smart Maintenance Prediction Engine

### Algorithm & Kenyan Driving Calibration
1. **Baseline Daily Burn Rate:** Default to 35 km/day (Nairobi commuter average).
2. **Dynamic Recalibration:**
   $$\text{estDailyKm} = \frac{\text{CurrentMileage} - \text{InitialMileage}}{\text{DaysElapsed}}$$
3. **Service Triggers:**
   - **Minor Service (Engine Oil + Filter):** Every 5,000 km or 6 months (whichever comes first).
   - **Spark Plugs / Air & Cabin Filters:** Every 10,000 km.
   - **Brake Pads Inspection:** Every 15,000 km.
   - **Automatic/CVT Transmission Fluid:** Every 40,000 km.
   - **Timing Belt / Water Pump:** Every 100,000 km.
4. **SMS/WhatsApp Micro-Checkins:**
   - Sent every 30–45 days via Africa's Talking.
   - Message: *"AutoLog: Your [Make Model] is estimated at [Est Km] km. Reply with your dash number to keep service alerts accurate."*

---

## 5. Database Schema Specifications

### 5.1 User
- `_id`: ObjectId
- `name`: String (required)
- `email`: String (unique, required)
- `phone`: String (Kenyan standard `+254XXXXXXXXX`, required)
- `password`: String (bcrypt hashed)
- `role`: Enum (`'owner'`, `'dealer'`, `'garage'`, `'admin'`)
- `businessDetails`:
  - `businessName`: String
  - `location`: String (e.g. "Kirinyaga Road, Nairobi")
  - `mpesaTill`: String (optional)
  - `isVerified`: Boolean (default: false)
  - `rating`: Number (1.0 to 5.0)
  - `reviewCount`: Number (default: 0)
- `timestamps`: true

### 5.2 Vehicle
- `_id`: ObjectId
- `owner`: Ref `User` (required)
- `plateNumber`: String (format: `K[A-Z]{2}\s\d{3}[A-Z]`, uppercase, unique)
- `make`: String (e.g., "Toyota", "Subaru", "Mazda")
- `model`: String (e.g., "Fielder", "Forester", "CX-5")
- `year`: Number (e.g., 2018)
- `engine`: String (e.g., "2.0L FB20", "2.2 SkyActiv-D")
- `vin`: String (Chassis number, optional)
- `initialMileage`: Number (km)
- `currentMileage`: Number (km)
- `estDailyKm`: Number (default: 35)
- `lastMileageUpdate`: Date
- `passportSlug`: String (unique slug e.g., `kda-123a-7f89`)
- `status`: Enum (`'active'`, `'sold'`, `'archived'`)
- `timestamps`: true

### 5.3 ServiceRecord
- `_id`: ObjectId
- `vehicle`: Ref `Vehicle` (required)
- `serviceDate`: Date (required)
- `mileageAtService`: Number (required)
- `serviceType`: Enum (`'OIL_SERVICE'`, `'MAJOR_SERVICE'`, `'BRAKES'`, `'SUSPENSION'`, `'TIRES'`, `'TRANSMISSION'`, `'BATTERY'`, `'OTHER'`)
- `description`: String
- `partsReplaced`: Array of `{ name: String, brand: String, costKes: Number }`
- `costKes`: Number (required)
- `garageName`: String
- `receiptUrl`: String (Cloudinary URL, optional)
- `verificationTier`: Enum (`'TIER_1_SELF'`, `'TIER_2_DOCUMENTED'`, `'TIER_3_PARTNER'`)
- `isBackdated`: Boolean (calculated: true if serviceDate < entryDate - 30 days)
- `timestamps`: true

### 5.4 PartRequest (RFQ)
- `_id`: ObjectId
- `requester`: Ref `User` (required)
- `vehicle`: Ref `Vehicle` (required)
- `partName`: String (e.g., "Front Brake Discs")
- `category`: Enum (`'ENGINE'`, `'SUSPENSION'`, `'BRAKES'`, `'BODY'`, `'ELECTRICAL'`, `'FILTERS'`, `'TRANSMISSION'`, `'OTHER'`)
- `oemPartNumber`: String (optional)
- `preference`: Enum (`'GENUINE_NEW'`, `'OEM_MATCH'`, `'AFTERMARKET'`, `'USED_TESTED'`, `'ANY'`)
- `urgency`: Enum (`'CRITICAL'`, `'WITHIN_WEEK'`, `'FLEXIBLE'`)
- `photos`: Array of Strings (Cloudinary URLs)
- `deliveryLocation`: String (e.g. "Westlands, Nairobi")
- `status`: Enum (`'OPEN'`, `'QUOTED'`, `'FULFILLED'`, `'CANCELLED'`)
- `timestamps`: true

### 5.5 PartQuote
- `_id`: ObjectId
- `partRequest`: Ref `PartRequest` (required)
- `dealer`: Ref `User` (required)
- `brandOffered`: String (e.g., "Brembo", "Denso", "Toyota Genuine")
- `condition`: Enum (`'GENUINE_NEW'`, `'OEM_MATCH'`, `'AFTERMARKET'`, `'USED_TESTED'`)
- `priceKes`: Number (required)
- `warrantyDays`: Number (e.g. 30, 90, 180)
- `validUntil`: Date (automatically set to `createdAt + 48 hours`)
- `availability`: Enum (`'IN_STOCK_COLLECT'`, `'SAME_DAY_DELIVERY'`, `'1_TO_3_DAYS'`)
- `notes`: String
- `status`: Enum (`'PENDING'`, `'ACCEPTED'`, `'REJECTED'`, `'EXPIRED'`)
- `timestamps`: true

---

## 6. Security, Privacy & Kenyan Localization Rules

### 6.1 Data Privacy on Public Passports
- **Plate Masking:** `KDA 450P` $\to$ `KD* ***P`
- **VIN/Chassis Masking:** `ZRE142-9012345` $\to$ `...2345`
- **Owner Identity:** Owner's personal name, phone number, and physical residence are completely hidden from public view.

### 6.2 Kenyan Phone Number Standards
- Allowed formats: `+2547XXXXXXXX` or `+2541XXXXXXXX` (Safaricom, Airtel, Telkom).
- Input parser normalizes `07...` or `01...` into standard E.164 `+254...` format.

### 6.3 Kenyan Number Plate Validation
- Regex pattern: `/^K[A-Z]{2}\s\d{3}[A-Z]$/` (e.g., `KCA 123A`, `KDK 450P`).

---

## 7. Development Milestones

- [x] **Milestone 1:** Git repository initialized, dependencies installed, TypeScript & tsconfig configured.
- [x] **Milestone 2:** PRD & README documentation finalized with 7 Loophole Defenses.
- [ ] **Milestone 3:** Database models & TypeScript interfaces (`User`, `Vehicle`, `ServiceRecord`, `PartRequest`, `PartQuote`).
- [ ] **Milestone 4:** Database connection (`src/config/db.ts`) and environment validation.
- [ ] **Milestone 5:** Express server setup with middleware (`helmet`, `cors`, `morgan`, error handling).
- [ ] **Milestone 6:** Authentication system (JWT, bcrypt, role-based authorize middleware).
- [ ] **Milestone 7:** Vehicle Passport CRUD with slug generation and data masking.
- [ ] **Milestone 8:** Service Record logging with 3-Tier verification and odometer rollback protection.
- [ ] **Milestone 9:** Spare Parts RFQ engine with 48-hour price lock logic.
- [ ] **Milestone 10:** Africa's Talking SMS integration for micro-checkins.
