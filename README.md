# 🛡️ AutoLog KE — Backend API & Platform Engine

> **Kenya's Digital Vehicle Service Passport, Smart Maintenance Predictor, and Verified Spare-Parts RFQ Platform.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Zod](https://img.shields.io/badge/Validation-Zod_v4-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)
[![Swagger](https://img.shields.io/badge/API_Docs-OpenAPI_3.0-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](http://localhost:5001/api-docs)

---

## 🚘 The Problem in the Kenyan Automotive Market

1. **The Odometer Rollback Epidemic:** Over 60% of used cars sold on Kenyan classifieds (Jiji, Facebook Marketplace, physical yards along Ngong Road and Kiambu Road) have clocked odometers to artificially inflate resale values.
2. **Paper Record Amnesia:** Service books and paper receipts from mechanics in Industrial Area, Ngara, and Grogon fade, tear, or are thrown away. Buyers have zero visibility into past oil changes, timing belt replacements, or gearbox rebuilds.
3. **The "Kirinyaga Road Spare-Parts Roulette":** Sourcing genuine spare parts in Nairobi is fraught with bait-and-switch quotes, grey-market counterfeit parts, and wild price discrepancies.
4. **Stalker & Car Cloning Risks:** Publicly exposing a vehicle's full registration plate number on sales portals invites clone plates and security risks for owners.

---

## 💡 The AutoLog KE Solution

AutoLog KE creates an immutable, verifiable, privacy-safe digital lifecycle for every vehicle on Kenyan roads.

1. **Digital Vehicle Passport (`autolog.ke/passport/:slug`):**
   * Every vehicle receives an opaque, privacy-safe URL (e.g., `mazda-cx5-7f9a2b`).
   * The plate number is masked (`KD* ***A`) and the chassis/VIN is truncated (`...3842`) to prevent cloning.
2. **3-Tier Verified Service History:**
   * ⚪ **Tier 1 (Self-Reported):** Unverified entry logged by the owner.
   * 🟡 **Tier 2 (Documented):** Includes uploaded image proof (job card, KRA ETR receipt).
   * 🟢 **Tier 3 (Partner Verified):** Stamped directly by a verified partner garage or dealership.
3. **Immutable Odometer Protection:**
   * Strict database and validator guards block mileage rollbacks. Current mileage can never be updated to a lower number than previously recorded.
4. **Dual-Mode Kenyan Authentication:**
   * Log in using an **Email** OR any valid **Kenyan Phone Number** (`07...`, `01...`, `+254...`).
5. **Role-Based Commercial Isolation:**
   * Private car owners cannot be polluted with commercial fields.
   * Garages and Dealers must provide physical location details before quoting parts or stamping passports.

---

## 🛡️ Built-In Security & Anti-Fraud Defenses

Our backend is engineered specifically to prevent exploits in the Nairobi automotive ecosystem:

| Defense Layer | Threat / Attack Vector | How AutoLog KE Defends It |
| :--- | :--- | :--- |
| **Admin Privilege Escalation** | Attacker tries sending `{"role": "admin"}` in registration. | `registerRoleEnum` in Zod whitelists ONLY `['owner', 'dealer', 'garage']`. Admin accounts can never be created via the public API. |
| **Self-Verification Fraud** | Rogue parts dealer tries sending `isVerifiedPartner: true` and fake 5-star ratings. | Registration validator only accepts `businessName` and `location`. The server hardcodes `isVerifiedPartner: false`, `rating: 5.0`, and `totalReviews: 0`. |
| **Ghost Garage Prevention** | Commercial users trying to register without business details. | Zod's `.superRefine()` strictly requires `businessName` (min 2 chars) and `location` (min 2 chars) for `garage` and `dealer`. |
| **Polluted Owner Schema** | Car owners getting assigned dummy ratings or business profiles. | 1. Validator rejects owners who submit business details.<br>2. Model sets `businessDetails: { default: undefined }`.<br>3. Mongoose pre-save hook strips business details for owners. |
| **Banned User Token Invalidation** | Suspended garage using an existing 7-day JWT token to post fake records. | `protect` middleware checks `user.isSuspended` in MongoDB on **every single request**, immediately terminating banned sessions with `403 Forbidden`. |
| **Credential Harvesting** | Scrapers probing phone numbers to discover registered Kenyan accounts. | `auth.controller.ts` returns the identical generic message `"Invalid credentials"` (401) on both missing accounts and incorrect passwords. |
| **Kenyan Phone Normalization** | Mixed phone number inputs (`0712...`, `011...`, `254...`). | `formatKenyanPhone` converts every input to standard international E.164 (`+254XXXXXXXXX`) before saving or querying. |
| **Odometer Rollback Prevention** | Sellers attempting to lower mileage before listing a car for sale. | Mileage updates strictly validate: `newMileage >= currentMileage`. Rollback attempts are blocked with `400 Bad Request`. |

---

## 🏛️ Architecture & Directory Layout

AutoLog KE strictly enforces an **Express MVC + Validators + Middlewares + Utils** architecture:

```text
autolog-backend/
├── src/
│   ├── config/             # DB connection, Swagger setup, environment validation
│   │   ├── db.ts           # Resilient Mongo Atlas connection with auto-retry
│   │   └── swagger.ts      # OpenAPI 3.0 specification & bearerAuth config
│   │
│   ├── controllers/        # Business logic & response formatters
│   │   ├── auth.controller.ts     # Register, dual-mode login, getMe
│   │   └── vehicle.controller.ts  # Vehicle CRUD, odometer, public passport
│   │
│   ├── middlewares/        # Express HTTP interceptors & gatekeepers
│   │   ├── auth.middleware.ts     # JWT verify, suspension guard & RBAC authorize
│   │   └── validate.middleware.ts # Generic Zod validation bouncer (req.body)
│   │
│   ├── models/             # Mongoose schemas, TypeScript interfaces & hooks
│   │   ├── User.ts         # User model (owners, garages, dealers, admins)
│   │   ├── Vehicle.ts      # Vehicle passport model with auto-slug generation
│   │   ├── ServiceRecord.ts# Multi-tier service stamps & parts tracking
│   │   ├── PartRequest.ts  # Spare parts RFQ model
│   │   └── PartQuote.ts    # 48-hour price lock quote model
│   │
│   ├── routes/             # Express routers with Swagger JSDoc documentation
│   │   ├── auth.routes.ts  # /api/v1/auth routes
│   │   └── vehicle.routes.ts # /api/v1/vehicles routes
│   │
│   ├── utils/              # Pure helper functions (independent of Express)
│   │   ├── jwt.ts          # Cryptographic token generator & verifier
│   │   ├── phone.ts        # Kenyan E.164 normalizer (+254...) & regex check
│   │   └── plate.ts        # NTSA number plate normalizer & privacy maskers
│   │
│   ├── app.ts              # Express configuration, security headers (Helmet/CORS)
│   └── server.ts           # Server bootstrap with dotenv hoisting guard
│
├── .env.example            # Environment variables blueprint
├── package.json            # Dependencies & build scripts
├── tsconfig.json           # Strict TypeScript configuration
└── PRD.md                  # Comprehensive Product Requirement Document
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js**: v20+ or v22+
* **MongoDB**: A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or local MongoDB instance

### 2. Clone & Install
```bash
git clone https://github.com/musaCODEzz/autolog-backend.git
cd autolog-backend
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_64_character_hex_secret_key
JWT_EXPIRES_IN=7d
```

*(Note: Port `5001` is recommended on macOS to avoid conflicts with macOS AirPlay Receiver on port 5000).*

### 4. Running the Development Server
```bash
npm run dev
```
The server will boot with live reload on `http://localhost:5001`.

---

## 📚 Interactive API Documentation (Swagger UI)

AutoLog KE features interactive **OpenAPI 3.0** documentation:

* **Interactive Swagger UI:** [http://localhost:5001/api-docs](http://localhost:5001/api-docs)
* **Raw OpenAPI JSON Spec:** [http://localhost:5001/api-docs.json](http://localhost:5001/api-docs.json)
* **Health Check:** [http://localhost:5001/health](http://localhost:5001/health)

### Authenticating in Swagger UI:
1. Register or log in via `/api/v1/auth/register` or `/api/v1/auth/login`.
2. Copy the returned `token`.
3. Click the green **Authorize 🔓** button at the top right of the Swagger UI.
4. Paste the token into the `Value` field and click **Authorize**.
5. All protected endpoints (e.g. `/api/v1/auth/me`) are now unlocked for testing!

---

## 📡 API Endpoints Overview

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register an Owner, Garage, or Dealer account | Public |
| `POST` | `/api/v1/auth/login` | Dual-mode login using Email OR Kenyan Phone | Public |
| `GET` | `/api/v1/auth/me` | Fetch currently logged-in user profile | Authenticated |

### Vehicle Passport (`/api/v1/vehicles`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/vehicles` | Register a new vehicle to digital passport | Authenticated (Owner) |
| `GET` | `/api/v1/vehicles` | List all vehicles owned by logged-in user | Authenticated (Owner) |
| `GET` | `/api/v1/vehicles/:id` | Get vehicle details by ID (Owner isolation) | Authenticated (Owner) |
| `PATCH` | `/api/v1/vehicles/:id` | Update vehicle profile specs/photos | Authenticated (Owner) |
| `PATCH` | `/api/v1/vehicles/:id/mileage` | Update odometer (Rollback prevention) | Authenticated (Owner) |
| `GET` | `/api/v1/vehicles/passport/:slug` | Public sanitized passport with masked plate | **Public** |

### Service History & Verification Engine (`/api/v1/services`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/services` | Log service record (Auto-assigned Trust Tier 1/2/3, auto-advances odometer) | Authenticated (Owner / Garage) |
| `GET` | `/api/v1/services/vehicle/:vehicleId` | Fetch chronological service history for a vehicle | Authenticated |
| `GET` | `/api/v1/services/:id` | Fetch detailed service record by ID with parts and garage info | Authenticated |

---

## 🧪 Build & Verification Commands

```bash
# Type-check entire project without emitting JavaScript
npx tsc --noEmit

# Compile TypeScript to production bundle in dist/
npm run build

# Run production server
npm start
```

---

## 📄 License
MIT © [Musa](https://github.com/musaCODEzz)
