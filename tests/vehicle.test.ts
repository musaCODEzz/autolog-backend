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

    it('🩺 should attach predictive maintenance health badges to public passport for buyers', async () => {
      const res = await request(app).get(`/api/v1/vehicles/passport/${passportSlug}`);

      expect(res.status).toBe(200);
      const passport = res.body.data.passport;

      expect(passport.predictiveHealth).toBeDefined();
      expect(passport.predictiveHealth.overallHealthStatus).toBe('HEALTHY');
      expect(passport.predictiveHealth.nextUpcomingService.name).toContain('Engine Oil');
      expect(passport.predictiveHealth.nextUpcomingService.kmRemaining).toBe(2000);
      expect(passport.predictiveHealth.nextUpcomingService.alertMessage).toBeDefined();
    });
  });

  describe('🧠 GET /api/v1/vehicles/:id/predictions (Predictive Maintenance REST API)', () => {
    let strangerToken: string;

    it('🛡️ should REJECT requests without JWT authorization token', async () => {
      const res = await request(app).get(`/api/v1/vehicles/${vehicleId}/predictions`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('🛡️ should REJECT requests from another user who does not own the vehicle', async () => {
      const strangerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Stranger User',
          email: 'stranger.predictions@autolog.co.ke',
          phone: '0799887766',
          password: 'Password123!',
          role: 'owner',
        });
      strangerToken = strangerRes.body.data.token;

      const res = await request(app)
        .get(`/api/v1/vehicles/${vehicleId}/predictions`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not have permission');
    });

    it('📊 should calculate baseline predictive maintenance schedules for vehicle owner', async () => {
      // Vehicle is at 78,000 km
      const res = await request(app)
        .get(`/api/v1/vehicles/${vehicleId}/predictions`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { vehicle, predictionsSummary } = res.body.data;
      expect(vehicle.plateNumber).toBe('KDD 842P');
      expect(vehicle.currentMileage).toBe(78000);

      expect(predictionsSummary.currentMileage).toBe(78000);
      expect(predictionsSummary.overallStatus).toBeDefined();
      expect(predictionsSummary.nextUpcomingService).toBeDefined();
      expect(predictionsSummary.predictions.length).toBeGreaterThanOrEqual(6);

      // Verify Engine Oil schedule (due at 80,000 km => 2,000 km remaining)
      const oilPrediction = predictionsSummary.predictions.find(
        (p: { key: string }) => p.key === 'ENGINE_OIL'
      );
      expect(oilPrediction).toBeDefined();
      expect(oilPrediction.nextDueMileage).toBe(80000);
      expect(oilPrediction.kmRemaining).toBe(2000);
      expect(oilPrediction.urgency).toBe('HEALTHY');
      expect(oilPrediction.estimatedCostKes).toBe(6500);
      expect(oilPrediction.alertMessage).toContain('Engine Oil');
    });

    it('🛠️ should dynamically adapt predictions when a new service record is logged', async () => {
      // Log an oil change performed at 79,000 km
      const serviceRes = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          vehicleId,
          serviceType: ['OIL_CHANGE'],
          serviceDate: '2026-09-20',
          mileageAtService: 79000,
          costKes: 7000,
          garageName: 'AutoXpress Nairobi West',
          description: 'Synthetic oil and OEM filter replacement',
          partsReplaced: [{ partName: 'Castrol Magnatec 5W-30', costKes: 5500 }],
        });

      expect(serviceRes.status).toBe(201);

      // Now query predictions again: next oil due should be 79,000 + 5,000 = 84,000 km
      const res = await request(app)
        .get(`/api/v1/vehicles/${vehicleId}/predictions`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      const oilPrediction = res.body.data.predictionsSummary.predictions.find(
        (p: { key: string }) => p.key === 'ENGINE_OIL'
      );

      expect(oilPrediction).toBeDefined();
      expect(oilPrediction.lastServiceMileage).toBe(79000);
      expect(oilPrediction.nextDueMileage).toBe(84000);
      // Vehicle auto-progressed to 79,000 km => 84,000 - 79,000 = 5,000 km remaining
      expect(oilPrediction.kmRemaining).toBe(5000);
      expect(oilPrediction.urgency).toBe('HEALTHY');
      expect(oilPrediction.alertMessage).toContain('84,000 km');
    });
  });

  describe('📜 Digital Handover Certificate Endpoints', () => {
    it('🔒 should reject unauthenticated requests to GET /api/v1/vehicles/:id/certificate with 401', async () => {
      const res = await request(app).get(`/api/v1/vehicles/${vehicleId}/certificate`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('📄 should generate official unmasked handover certificate for vehicle owner', async () => {
      const res = await request(app)
        .get(`/api/v1/vehicles/${vehicleId}/certificate`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const cert = res.body.data.certificate;
      expect(cert).toBeDefined();

      // Tamper-evident identity
      expect(cert.certificateNumber).toMatch(/^AL-KE-\d{4}-TOYOT-[A-Z0-9]{4}$/);
      expect(cert.verificationHash).toHaveLength(64);
      expect(cert.verificationUrl).toContain(`/passport/${passportSlug}`);

      // Owner sees unmasked plate and chassis
      expect(cert.vehicle.plateNumber).toBe('KDD 842P');
      expect(cert.vehicle.chassisNumber).toBe('JT111GJ120009842');
      expect(cert.vehicle.currentMileage).toBeGreaterThanOrEqual(75000);

      // Odometer integrity & trust metrics
      expect(cert.odometerIntegrity.status).toBe('PASSED_VERIFIED');
      expect(cert.trustScore.totalServices).toBeGreaterThanOrEqual(1);

      // Predictive health
      expect(cert.predictiveHealth.overallHealthStatus).toBeDefined();
      expect(cert.predictiveHealth.nextUpcomingService).toBeDefined();
    });

    it('🛡️ should generate public masked certificate with masked plate and chassis without auth', async () => {
      const res = await request(app).get(
        `/api/v1/vehicles/passport/${passportSlug}/certificate`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const cert = res.body.data.certificate;
      expect(cert).toBeDefined();

      // Masked identifiers for public buyer protection
      expect(cert.vehicle.plateNumber).toBe('KD* ***P');
      expect(cert.vehicle.chassisNumber).toContain('...9842');
      expect(cert.vehicle.chassisNumber).not.toBe('JT111GJ120009842');

      // Valid SHA-256 hash & serial
      expect(cert.certificateNumber).toMatch(/^AL-KE-\d{4}-TOYOT-[A-Z0-9]{4}$/);
      expect(cert.verificationHash).toHaveLength(64);
      expect(cert.odometerIntegrity.status).toBe('PASSED_VERIFIED');
    });

    it('🔍 should return 404 for unknown passport slug certificate', async () => {
      const res = await request(app).get(
        '/api/v1/vehicles/passport/unknown-slug-999xyz/certificate'
      );

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });
  });
});

