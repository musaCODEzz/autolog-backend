import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { Vehicle } from '../src/models/Vehicle';
import { dispatchStaleCheckinPrompts } from '../src/services/dispatcher.service';

describe('⏰ Automated Weekly Check-in Dispatcher Engine', () => {
  let adminToken: string;
  let ownerToken: string;
  let freshVehicleId: string;
  let staleVehicleId: string;

  beforeAll(async () => {
    // 1. Register Super Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'AutoLog Dispatcher Admin',
        email: 'dispatch.admin@autolog.co.ke',
        phone: '0700998877',
        password: 'Password123!',
        role: 'owner',
      });
    adminToken = adminRes.body.data.token;

    // Promote to Admin in MongoDB
    const User = (await import('../src/models/User')).User;
    await User.findByIdAndUpdate(adminRes.body.data.user._id, { role: 'admin' });

    // 2. Register Regular Car Owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Dennis Kiprop',
        email: 'dennis.stale@autolog.co.ke',
        phone: '0712998877',
        password: 'Password123!',
        role: 'owner',
      });
    ownerToken = ownerRes.body.data.token;

    // 3. Register Fresh Vehicle (Updated Today)
    const freshRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        plateNumber: 'KDA 777A',
        chassisNumber: 'NZE141999111',
        make: 'Toyota',
        model: 'Corolla Axio',
        year: 2018,
        fuelType: 'PETROL',
        transmission: 'AUTOMATIC',
        initialMileage: 50000,
        currentMileage: 50000,
        mileageUnit: 'KM',
      });
    freshVehicleId = freshRes.body.data.vehicle._id;

    // 4. Register Stale Vehicle (Simulate last update 10 days ago)
    const staleRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        plateNumber: 'KDB 888B',
        chassisNumber: 'NZE141999222',
        make: 'Mazda',
        model: 'Demio',
        year: 2017,
        fuelType: 'PETROL',
        transmission: 'AUTOMATIC',
        initialMileage: 60000,
        currentMileage: 60000,
        mileageUnit: 'KM',
      });
    staleVehicleId = staleRes.body.data.vehicle._id;

    // Backdate the stale car's lastMileageUpdate to 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await Vehicle.findByIdAndUpdate(staleVehicleId, {
      lastMileageUpdate: tenDaysAgo,
    });
  });

  describe('Core Service: dispatchStaleCheckinPrompts()', () => {
    it('should identify stale vehicles and dispatch check-in magic links', async () => {
      const summary = await dispatchStaleCheckinPrompts();

      expect(summary.staleCount).toBeGreaterThanOrEqual(1);
      expect(summary.dispatchedCount).toBeGreaterThanOrEqual(1);

      // Verify the dispatched result contains our stale Mazda Demio
      const matched = summary.results.find((r) => r.vehicleId === staleVehicleId);
      expect(matched).toBeDefined();
      expect(matched?.plateNumber).toBe('KDB 888B');
      expect(matched?.checkinUrl).toContain('/checkin?token=');

      // Verify the audit timestamp was stamped in MongoDB
      const updatedVehicle = await Vehicle.findById(staleVehicleId);
      expect(updatedVehicle?.lastCheckinPromptSentAt).toBeDefined();
    });

    it('🛡️ ANTI-SPAM GUARD: Should NOT prompt the same vehicle twice in the same week', async () => {
      // Run the dispatch immediately a second time
      const secondRun = await dispatchStaleCheckinPrompts();

      // The stale vehicle was already stamped moments ago, so it must be SKIPPED
      const matched = secondRun.results.find((r) => r.vehicleId === staleVehicleId);
      expect(matched).toBeUndefined();
    });
  });

  describe('POST /api/v1/vehicles/checkin/dispatch-stale (Admin Trigger)', () => {
    it('🛡️ should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/v1/vehicles/checkin/dispatch-stale');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('🛡️ should reject non-admin car owners with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/vehicles/checkin/dispatch-stale')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow Super Admin to manually trigger batch dispatch on demand', async () => {
      const res = await request(app)
        .post('/api/v1/vehicles/checkin/dispatch-stale')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scannedAt).toBeDefined();
    });
  });
});
