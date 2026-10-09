# 🎨 Design Brief & Product Strategy — AutoLog KE

**Product:** AutoLog KE  
**Tagline:** Kenya's Verified Digital Vehicle Passport & Predictive Maintenance Platform  
**Target Market:** Urban & peri-urban Kenya (Nairobi initial launch: Ngara, Grogan, Kirinyaga Road, Industrial Area, Westlands, Karen)  
**Primary Platforms:** Mobile Web (PWA-first), Desktop Dashboard, WhatsApp Automation  

---

## 1. Product Vision & Market Problem

In Kenya, motor vehicle ownership is one of the largest financial commitments an individual or small business makes. Yet, the ecosystem operates on **asymmetric information and mistrust**:

1. **Odometer Tampering ("Clocking"):** Importers and used-car dealers routinely wind back odometers by 40,000 to 100,000 km before resale.
2. **Paper-Based Fragmentation:** Service receipts are printed on thermal paper that fades within 6 months or are kept in paper booklets that get lost during ownership transfer.
3. **Kirinyaga Road Parts Minefield:** Finding genuine spare parts is exhausting. Motorists are subjected to street brokers ("canvassers"), price inflation, and counterfeit parts packaged in fake OEM boxes.
4. **Informal Fundi Disconnect:** Over 80% of routine maintenance is performed by informal, independent mechanics who do not use laptops or formal ERP software.

**AutoLog KE bridges this reality** not by forcing everyone onto a complex native app, but by creating **lightweight, mobile-first web touchpoints** that work seamlessly alongside paper receipts, WhatsApp links, and mobile money.

---

## 2. Core User Personas

### 👤 Persona 1: "Brian the Commuter" (Car Owner)
- **Profile:** 32 years old, Tech/Finance Analyst living in Ruaka, working in Upper Hill. Drives a 2017 Toyota Fielder (82,000 km).
- **Behaviors:** Daily 35 km commute via Waiyaki Way. Uses WhatsApp constantly.
- **Pain Points:** 
  - Forgets when his engine oil or CVT fluid is due until a strange noise begins.
  - Doesn't want to install another native mobile app just to remember oil changes.
  - Terrified of fundis overcharging him for parts.
- **AutoLog Value:** Receives a 1-click WhatsApp check-in every Sunday at 18:00 EAT. Opens `autolog.ke/checkin?token=...`, slides his odometer in 5 seconds, and gets instant predictive service alerts.

### 👤 Persona 2: "Fundi Juma" (Independent Garage Mechanic)
- **Profile:** 46 years old, Lead Mechanic with a 3-bay open shed in Ngara. Specializes in Toyota, Subaru, and Nissan.
- **Behaviors:** Uses a physical handwritten job card and paper receipt book. Wipes grease off his Android phone to receive M-Pesa payments.
- **Pain Points:**
  - Has zero interest in complex software, typing, or entering passwords.
  - Wants customers to trust that he did honest work and used genuine parts.
- **AutoLog Value:** Doesn't need an account. He simply hands Brian the stamped paper job card. Brian snaps a photo, which AutoLog stores as a **Tier 2 Documented Entry**. If Juma registers as an accredited partner, his stamp turns into a **Tier 3 Green Verified Shield**.

### 👤 Persona 3: "Kamau the Parts Merchant" (Kirinyaga Road Dealer)
- **Profile:** 39 years old, Runs a spare parts shop on Kirinyaga Road importing Japanese brake pads, suspension bushings, and OEM filters.
- **Behaviors:** Manages inventory via physical shelves and WhatsApp inquiries.
- **Pain Points:**
  - Tired of casual "tyre-kickers" asking for prices all day without buying.
  - Hates brokers who stand outside his shop adding KES 1,000 markups to his genuine parts.
- **AutoLog Value:** Receives direct, verified RFQs from car owners with exact vehicle specs (make, model, year, chassis). Submits a blind quote with a **48-hour price lock**. When accepted, the owner walks directly into his shop.

### 👤 Persona 4: "Sarah the Prospective Buyer" (Used Car Shopper)
- **Profile:** 29 years old, buying her first car on Jiji / Facebook Marketplace. Looking at a Mazda CX-5.
- **Pain Points:**
  - How does she know if the 64,000 km on the dashboard is real or wound back?
  - Sellers claim "lady owned, well maintained", but have zero paper records.
- **AutoLog Value:** Seller shares `autolog.ke/passport/:slug`. Sarah sees the verified odometer progression graph, trust badges, predictive health score, and cryptographic SHA-256 certificate serial without needing an account.

---

## 3. UX Design Principles & Heuristics

1. **Zero-Friction Mobile Web:**
   - Any motorist receiving a weekly check-in link can update their odometer in **under 5 seconds** with **zero logins or passwords**.
2. **Privacy Shielding by Default:**
   - On all public passport URLs, plate numbers are masked (`KDA 123A` $\to$ `KD* ***A`) and chassis numbers are truncated (`...5161`). The owner's personal name and phone number are strictly protected.
3. **Visual Trust Hierarchy (The Traffic Light System):**
   - ⚪ **Gray Badge (Tier 1):** Self-reported by owner without documentary evidence.
   - 🟡 **Amber Badge (Tier 2):** Documented with a verified photo of a paper receipt or job card.
   - 🟢 **Green Shield (Tier 3):** Partner certified by an accredited AutoLog garage.
4. **Instant Comprehensibility (No Jargon):**
   - Maintenance urgency is clearly categorized into:
     - 🟢 **HEALTHY** ("Engine oil is in good health. Due in 3,200 km / ~91 days")
     - 🟡 **DUE SOON** ("Service due in 400 km / ~11 days — prepare budget of KES 6,500")
     - 🔴 **OVERDUE** ("OVERDUE by 1,200 km — immediate service recommended")

---

## 4. Visual Identity, Color System & Design Tokens

### Color Palette

| Token Name | Hex Code | Purpose & Semantic Meaning |
|---|---|---|
| `--color-brand-primary` | `#0f172a` (Slate 900) | Authority, security, premium Kenyan automotive foundation |
| `--color-brand-accent` | `#2563eb` (Blue 600) | Trust, digital passports, primary interactive actions |
| `--color-tier-partner` | `#16a34a` (Green 600) | Tier 3 Partner Verified Shield, Healthy maintenance status |
| `--color-tier-documented`| `#d97706` (Amber 600) | Tier 2 Documented receipt badge, Due-Soon service alerts |
| `--color-tier-self` | `#4b5563` (Gray 600) | Tier 1 Self-reported entries |
| `--color-alert-danger` | `#dc2626` (Red 600) | Overdue service alerts, Odometer rollback warnings |
| `--color-surface-bg` | `#f8fafc` (Slate 50) | Clean mobile background |
| `--color-surface-card` | `#ffffff` (White) | Elevation cards, job card views, certificates |

### Typography Guidelines
- **Primary Typeface:** `Inter` or `Plus Jakarta Sans` (Google Fonts) for crisp mobile readability on high-DPI screens.
- **Monospace Typeface:** `JetBrains Mono` or `Fira Code` for NTSA number plates, VIN chassis numbers, and SHA-256 certificate hashes.
- **Plate Visual Styling:** Kenyan license plate styling: Bold, black lettering on reflective white background with dark border (`border: 2px solid #000; border-radius: 4px; letter-spacing: 2px`).

---

## 5. Offline-First & Paper-to-Digital Bridge Mechanics

To ensure 100% adoption across Kenya:
- **Paper First, Digital Always:** Car owners are encouraged to keep their paper booklets. A photo upload converts any grease-stained paper receipt into a permanent, searchable Tier 2 cloud record.
- **Cloudinary Image Optimization:** Uploaded job cards are auto-compressed and watermarked with the vehicle's passport slug and upload timestamp to prevent photo recycling across different vehicles.
