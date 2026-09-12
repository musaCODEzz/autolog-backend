# 🛡️ AutoLog KE — Backend API

> Kenya's Digital Vehicle Service Passport, Smart Maintenance Predictor, and Verified Spare-Parts RFQ Platform.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

---

## 🚘 The Problem in Kenya
- **Used Car Blind Spots:** Buyers on Jiji / Marketplace are scammed daily with clocked odometers and falsified service books.
- **Lost Paperwork:** Receipts from Ngara, Grogan, and Industrial Area fundis fade or get lost.
- **Kirinyaga Road Parts Roulette:** Unregulated pricing, bait-and-switch quotes, and rampant counterfeit parts.

## 💡 The AutoLog Solution
1. **Digital Vehicle Passport (`autolog.ke/passport/:slug`):** Publicly verifiable service history with privacy masking (`KD* ***P`).
2. **3-Tier Verification Engine:**
   - ⚪ **Tier 1 (Self-Log):** Unverified entry by owner.
   - 🟡 **Tier 2 (Documented):** Stamped job card or KRA ETR receipt snapshot.
   - 🟢 **Tier 3 (Partner Certified):** Confirmed by a verified partner garage or parts vendor.
3. **Immutable Odometer Curve:** Prevents mileage rollback fraud by mathematically flagging non-linear drops.
4. **Verified RFQ Engine:** Spare-parts price lock guarantee (48-hour validity) and vendor ratings.
5. **Micro-Friction SMS Check-ins:** Periodic check-ins via Africa's Talking / Twilio to calibrate maintenance alerts.

---

## 🛠️ Tech Stack
- **Runtime:** Node.js (v22+)
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Validation:** Zod
- **Authentication:** JWT + Role-Based Access Control (`owner`, `dealer`, `garage`, `admin`)
- **Storage:** Cloudinary (receipts & vehicle photos)
- **Communications:** Africa's Talking / Twilio SMS
- **Payments:** M-Pesa Daraja API ready

---

## 📁 Project Structure
```text
src/
├── config/         # Database, env, and third-party configs
├── controllers/    # Route handler functions
├── middlewares/    # Auth, validation, error handlers
├── models/         # Mongoose schemas & TypeScript interfaces
├── routes/         # Express endpoint definitions
├── services/       # Business logic, odometer math, notification jobs
├── utils/          # Helpers, Kenyan phone formatters, plate validators
├── app.ts          # Express application setup
└── server.ts       # Server entry point
```

---

## 🔑 Environment Variables

Create a `.env` file in the root folder based on this configuration:

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGO_URI=mongodb://localhost:27017/autolog_ke

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Cloudinary (Receipt & Vehicle Photos)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Africa's Talking (SMS Check-ins)
AT_API_KEY=your_africas_talking_api_key
AT_USERNAME=sandbox
AT_SENDER_ID=AUTOLOG

# Safaricom Daraja M-Pesa (Optional / Future Ready)
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js:** v20+ or v22+
- **MongoDB:** Running locally or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/musaCODEzz/autolog-backend.git
cd autolog-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

### 3. Development Server
```bash
# Start with live reload via tsx
npm run dev
```

### 4. Build & Production Run
```bash
# Compile TypeScript to dist/
npm run build

# Start production server
npm start
```

---

## 📡 Core API Endpoints (Overview)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/health` | Server health check | Public |
| `POST` | `/api/v1/auth/register` | Register (Owner, Dealer, Garage) | Public |
| `POST` | `/api/v1/auth/login` | Login & receive JWT | Public |
| `GET` | `/api/v1/auth/me` | Current user profile | Authenticated |
| `POST` | `/api/v1/vehicles` | Add new vehicle to passport | Owner |
| `GET` | `/api/v1/vehicles` | List owner's vehicles | Owner |
| `GET` | `/api/v1/vehicles/passport/:slug` | Public masked vehicle passport | Public |
| `POST` | `/api/v1/services` | Add new service record | Owner / Garage |
| `GET` | `/api/v1/services/vehicle/:vehicleId` | List vehicle service history | Owner / Garage |
| `POST` | `/api/v1/rfq/request` | Create spare parts RFQ | Owner |
| `GET` | `/api/v1/rfq/feed` | Browse open RFQs in area | Dealer |
| `POST` | `/api/v1/rfq/quote` | Submit price-locked quote | Dealer |

---

## 📄 License
MIT © [Musa](https://github.com/musaCODEzz)
