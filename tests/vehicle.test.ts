import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('🚗 Vehicle Digital Passport Module', () => {
  let ownerToken: string;
  let vehicleId: string;
  let passportSlug: string;

  beforeAll(async () => {
    // Register owner for vehicle tests
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'James Mwangi',
        email: 'james.prado@autolog.co.ke',
        phone: '0711223344',
        password: 'Password123!',
        role: 'owner',
      });
    ownerToken = res.body.data.token;
  });

  describe('POST /api/v1/vehicles', () => {
    it('should register a vehicle with valid NTSA plate format and auto-generate slug', async () => {
      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          plateNumber: 'kdd 842p', // lowercase test
          chassisNumber: 'JT111GJ120009842',
          make: 'Toyota',
          model: 'Land Cruiser Prado',
          year: 2019,
          fuelType: 'DIESEL',
          transmission: 'AUTOMATIC',
          engine: '2982cc 1KD-FTV',
          initialMileage: 75000,
          currentMileage: 75000,
          mileageUnit: 'KM',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicle.plateNumber).toBe('KDD 842P'); // Uppercase normalized
      expect(res.body.data.vehicle.passportSlug).toContain('toyota-landcruiserprado-');
      vehicleId = res.body.data.vehicle._id;
      passportSlug = res.body.data.vehicle.passportSlug;
    });

    it('🛡️ should REJECT invalid Kenyan plate format (e.g. ABC 123)', async () => {
      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          plateNumber: 'INVALID_PLATE',
          chassisNumber: 'JT111GJ120009843',
          make: 'Toyota',
          model: 'Prado',
          year: 2019,
          fuelType: 'DIESEL',
          transmission: 'AUTOMATIC',
          engine: '2982cc',
          initialMileage: 50000,
          currentMileage: 50000,
          mileageUnit: 'KM',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toContain('Invalid Kenyan number plate');
    });

    it('🛡️ should REJECT duplicate number plate registration', async () => {
      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          plateNumber: 'KDD 842P', // Same plate
          chassisNumber: 'DIFFERENT_CHASSIS',
          make: 'Toyota',
          model: 'Prado',
          year: 2020,
          fuelType: 'DIESEL',
          transmission: 'AUTOMATIC',
          engine: '2982cc',
          initialMileage: 10000,
          currentMileage: 10000,
          mileageUnit: 'KM',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already registered');
    });
  });

  describe('PATCH /api/v1/vehicles/:id/mileage', () => {
    it('should legitimately advance odometer from 75000 to 78000 km', async () => {
      const res = await request(app)
        .patch(`/api/v1/vehicles/${vehicleId}/mileage`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ currentMileage: 78000 });

      expect(res.status).toBe(200);
      expect(res.body.data.vehicle.currentMileage).toBe(78000);
    });

    it('🛡️ CRITICAL DEFENSE: should REJECT odometer rollback attempt (lower mileage)', async () => {
      const res = await request(app)
        .patch(`/api/v1/vehicles/${vehicleId}/mileage`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ currentMileage: 72000 }); // Lower than 78000!

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Odometer rollback detected');
    });
  });

  describe('GET /api/v1/vehicles/passport/:slug (Public Passport)', () => {
    it('🛡️ should return privacy-shielded public passport with masked identifiers', async () => {
      const res = await request(app).get(`/api/v1/vehicles/passport/${passportSlug}`);

      expect(res.status).toBe(200);
      const passport = res.body.data.passport;

      // Privacy Shield verifications:
      expect(passport.maskedPlate).toBe('KD* ***P');
      expect(passport.maskedChassis).toBe('...9842');
      expect(passport.owner).toBeUndefined(); // Owner completely hidden
      expect(passport.currentMileage).toBe(78000);
      expect(passport.trustScore.totalServices).toBe(0);
    });
  });
});
