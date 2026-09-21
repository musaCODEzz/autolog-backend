import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('🔧 Service Records & 3-Tier Verification Engine', () => {
  let ownerToken: string;
  let garageToken: string;
  let garageId: string;
  let vehicleId: string;
  let passportSlug: string;

  beforeAll(async () => {
    // 1. Create owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Grace Mutua',
        email: 'grace.service@autolog.co.ke',
        phone: '0722334455',
        password: 'Password123!',
        role: 'owner',
      });
    ownerToken = ownerRes.body.data.token;

    // 2. Create vehicle at 50,000 km
    const vehRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        plateNumber: 'KDA 777X',
        chassisNumber: 'JT111GJ120005555',
        make: 'Subaru',
        model: 'Forester',
        year: 2018,
        fuelType: 'PETROL',
        transmission: 'AUTOMATIC',
        engine: '1995cc FB20',
        initialMileage: 50000,
        currentMileage: 50000,
        mileageUnit: 'KM',
      });
    vehicleId = vehRes.body.data.vehicle._id;
    passportSlug = vehRes.body.data.vehicle.passportSlug;

    // 3. Create garage
    const garageRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Total Service Karen',
        email: 'karen@totalenergies.co.ke',
        phone: '0733889900',
        password: 'Password123!',
        role: 'garage',
        businessDetails: {
          businessName: 'TotalEnergies Karen Service Hub',
          location: 'Ngong Road, Karen, Nairobi',
        },
      });
    garageToken = garageRes.body.data.token;
    garageId = garageRes.body.data.user._id;
  });

  describe('POST /api/v1/services', () => {
    it('should assign TIER_1_SELF when owner logs without receipt proof', async () => {
      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          vehicleId,
          serviceType: ['OIL_CHANGE'],
          serviceDate: '2026-09-15',
          mileageAtService: 52000,
          costKes: 7500,
          garageName: 'Roadside Fundi Juma - Ngara',
          description: 'Engine oil 5W-30 and oil filter',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.serviceRecord.verificationTier).toBe('TIER_1_SELF');
      expect(res.body.data.serviceRecord.isBackdated).toBe(false);

      // Verify Automatic Odometer Progression: Vehicle mileage advanced to 52,000 km!
      const checkVeh = await request(app)
        .get(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(checkVeh.body.data.vehicle.currentMileage).toBe(52000);
    });

    it('should assign TIER_2_DOCUMENTED when receiptUrl is attached', async () => {
      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          vehicleId,
          serviceType: ['BRAKES'],
          serviceDate: '2026-09-18',
          mileageAtService: 55000,
          costKes: 18000,
          garageName: 'AutoXpress Lavington',
          receiptUrl: 'https://res.cloudinary.com/autolog/receipts/autoxpress_55k.pdf',
          description: 'Genuine brake pads and rotor skim',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.serviceRecord.verificationTier).toBe('TIER_2_DOCUMENTED');
      expect(res.body.data.serviceRecord.receiptUrl).toBeDefined();
    });

    it('🛡️ should auto-flag isBackdated = true for service dates older than 30 days', async () => {
      const pastDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          vehicleId,
          serviceType: ['BATTERY'],
          serviceDate: pastDate,
          mileageAtService: 51000,
          costKes: 12000,
          garageName: 'Chloride Exide Ngong Rd',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.serviceRecord.isBackdated).toBe(true);
    });

    it('🛡️ should REJECT future service dates with 400 Bad Request', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          vehicleId,
          serviceType: ['TIRES'],
          serviceDate: futureDate,
          mileageAtService: 60000,
          costKes: 35000,
          garageName: 'Kingsway Tyres',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toContain('Service date cannot be in the future');
    });
  });

  describe('Public Passport Trust Score Reflection', () => {
    it('should reflect calculated Trust Score metrics on public passport', async () => {
      const res = await request(app).get(`/api/v1/vehicles/passport/${passportSlug}`);

      expect(res.status).toBe(200);
      const trustScore = res.body.data.passport.trustScore;

      expect(trustScore.totalServices).toBe(3);
      expect(trustScore.tier2DocumentedCount).toBe(1);
      expect(trustScore.tier3PartnerVerifiedCount).toBe(0);
      expect(trustScore.verifiedPartnerStatus).toBe(false);
      expect(res.body.data.passport.currentMileage).toBe(55000);
    });
  });
});
