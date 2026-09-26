import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { Vehicle } from '../src/models/Vehicle';

describe('📲 One-Click Mobile Web Check-in Engine', () => {
  let ownerToken: string;
  let strangerToken: string;
  let vehicleId: string;
  let checkinToken: string;

  beforeAll(async () => {
    // 1. Register vehicle owner (Musa)
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Musa Driver',
        email: 'musa.driver@autolog.co.ke',
        phone: '0719328248',
        password: 'Password123!',
        role: 'owner',
      });
    ownerToken = ownerRes.body.data.token;

    // 2. Register stranger (to test authorization security)
    const strangerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Curious Stranger',
        email: 'stranger@autolog.co.ke',
        phone: '0722000001',
        password: 'Password123!',
        role: 'owner',
      });
    strangerToken = strangerRes.body.data.token;

    // 3. Register vehicle owned by Musa (Subaru Forester KDM 123A)
    const vehicleRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        plateNumber: 'KDM 123A',
        chassisNumber: 'SJG045892',
        make: 'Subaru',
        model: 'Forester',
        year: 2017,
        fuelType: 'PETROL',
        transmission: 'AUTOMATIC',
        engine: '2.0L Turbo FA20',
        initialMileage: 82000,
        currentMileage: 82000,
        estDailyKm: 35,
        mileageUnit: 'KM',
      });
    vehicleId = vehicleRes.body.data.vehicle._id;
  });

  describe('POST /api/v1/vehicles/:id/checkin-token (Protected)', () => {
    it('🛡️ should reject unauthenticated request for check-in token', async () => {
      const res = await request(app).post(`/api/v1/vehicles/${vehicleId}/checkin-token`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('🛡️ should reject stranger attempting to generate token for another vehicle', async () => {
      const res = await request(app)
        .post(`/api/v1/vehicles/${vehicleId}/checkin-token`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should generate a valid check-in token and url for the vehicle owner', async () => {
      const res = await request(app)
        .post(`/api/v1/vehicles/${vehicleId}/checkin-token`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.checkinUrl).toContain('/checkin?token=');
      expect(res.body.data.expiresIn).toBe('72h');

      checkinToken = res.body.data.token;
    });
  });

  describe('GET /api/v1/vehicles/checkin/:token (Public)', () => {
    it('should resolve vehicle details using a valid magic token', async () => {
      const res = await request(app).get(`/api/v1/vehicles/checkin/${checkinToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.make).toBe('Subaru');
      expect(res.body.data.model).toBe('Forester');
      expect(res.body.data.plateNumber).toBe('KDM 123A');
      expect(res.body.data.currentMileage).toBe(82000);
      expect(res.body.data.mileageUnit).toBe('KM');
    });

    it('🛡️ should reject forged or tampered magic token with 401', async () => {
      const res = await request(app).get('/api/v1/vehicles/checkin/forged.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired check-in token');
    });
  });

  describe('POST /api/v1/vehicles/checkin/:token (Public)', () => {
    it('🛡️ should BLOCK odometer rollback attempts when newMileage < currentMileage', async () => {
      const res = await request(app)
        .post(`/api/v1/vehicles/checkin/${checkinToken}`)
        .send({ newMileage: 79000 }); // Lower than 82000!

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Odometer rollback detected');
    });

    it('should successfully update odometer when newMileage is greater than current', async () => {
      const res = await request(app)
        .post(`/api/v1/vehicles/checkin/${checkinToken}`)
        .send({ newMileage: 83500 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.previousMileage).toBe(82000);
      expect(res.body.data.currentMileage).toBe(83500);
      expect(res.body.data.distanceTraveled).toBe(1500);
    });

    it('📊 should recalculate dynamic burn rate when >= 1 day has elapsed', async () => {
      // Simulate 5 days passing since the last update
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      await Vehicle.findByIdAndUpdate(vehicleId, {
        currentMileage: 83500,
        lastMileageUpdate: fiveDaysAgo,
      });

      // Driver traveled 250 km over 5 days => 250 / 5 = 50 km/day
      const res = await request(app)
        .post(`/api/v1/vehicles/checkin/${checkinToken}`)
        .send({ newMileage: 83750 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentMileage).toBe(83750);
      expect(res.body.data.distanceTraveled).toBe(250);
      expect(res.body.data.recalculatedDailyKm).toBe(50);
    });

    it('🛡️ should reject check-in submission with invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/vehicles/checkin/invalid-token')
        .send({ newMileage: 85000 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
