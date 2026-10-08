import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('📊 Vehicle Total Cost of Ownership (TCO) & Analytics Module', () => {
  let ownerToken: string;
  let otherOwnerToken: string;
  let vehicleId: string;

  beforeAll(async () => {
    const unique = Date.now();

    // 1. Register main owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Brian Otieno',
        email: `brian.analytics.${unique}@autolog.co.ke`,
        phone: `0722${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        role: 'owner',
      });
    ownerToken = ownerRes.body.data.token;

    // 2. Register other owner to test authorization isolation
    const otherRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Wanjiku Mwangi',
        email: `wanjiku.analytics.${unique}@autolog.co.ke`,
        phone: `0733${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password123!',
        role: 'owner',
      });
    otherOwnerToken = otherRes.body.data.token;

    // 3. Register vehicle: Initial 60,000 km, current 60,000 km
    const vehRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        plateNumber: `KDD ${Math.floor(100 + Math.random() * 899)}M`,
        chassisNumber: `ZRE152${unique}`,
        make: 'Toyota',
        model: 'Auris',
        year: 2017,
        fuelType: 'PETROL',
        transmission: 'AUTOMATIC',
        engine: '1798cc 2ZR-FAE',
        initialMileage: 60000,
        currentMileage: 60000,
        mileageUnit: 'KM',
      });
    vehicleId = vehRes.body.data.vehicle._id;
  });

  it('🔒 should reject unauthenticated request with 401', async () => {
    const res = await request(app).get(`/api/v1/vehicles/${vehicleId}/analytics`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('🛡️ should reject request from another user who does not own the vehicle with 404', async () => {
    const res = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}/analytics`)
      .set('Authorization', `Bearer ${otherOwnerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not found or you do not have permission');
  });

  it('📊 should return zero baseline analytics for vehicle with no logged services', async () => {
    const res = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}/analytics`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { summary, categoryBreakdown, vehicle } = res.body.data;
    expect(vehicle.id).toBe(vehicleId);
    expect(vehicle.trackedDistanceKm).toBe(0);
    expect(summary.totalSpendKes).toBe(0);
    expect(summary.totalServicesLogged).toBe(0);
    expect(summary.costPerKmKes).toBe(0);
    expect(summary.monthlyAverageSpendKes).toBe(0);
    expect(categoryBreakdown).toHaveLength(0);
  });

  it('📈 should accurately compute total spend, KES/km, and category breakdown after logging services', async () => {
    // 1. Log Service 1: OIL_CHANGE at 65,000 km for KES 6,000
    await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        vehicleId,
        serviceType: ['OIL_CHANGE'],
        serviceDate: '2026-08-01',
        mileageAtService: 65000,
        costKes: 6000,
        garageName: 'AutoXpress Westlands',
        description: 'Engine oil and filter renewal',
      });

    // 2. Log Service 2: BRAKES at 70,000 km for KES 14,000
    await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        vehicleId,
        serviceType: ['BRAKES'],
        serviceDate: '2026-09-15',
        mileageAtService: 70000,
        costKes: 14000,
        garageName: 'Fundi Juma Ngara',
        description: 'Front and rear brake pads replaced',
      });

    // 3. Query Analytics
    const res = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}/analytics`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { summary, categoryBreakdown, vehicle } = res.body.data;

    // Tracked Distance: currentMileage is now 70,000 km (auto-advanced by service 2) - initial 60,000 km = 10,000 km
    expect(vehicle.currentMileage).toBe(70000);
    expect(vehicle.trackedDistanceKm).toBe(10000);

    // Total Spend: 6,000 + 14,000 = 20,000 KES
    expect(summary.totalSpendKes).toBe(20000);
    expect(summary.totalServicesLogged).toBe(2);

    // Cost Per Km: 20,000 KES / 10,000 km = 2.00 KES/km
    expect(summary.costPerKmKes).toBe(2);

    // Category Breakdown should rank BRAKES first (14,000 = 70%) then OIL_CHANGE (6,000 = 30%)
    expect(categoryBreakdown).toHaveLength(2);

    const brakesCat = categoryBreakdown.find((c: { category: string }) => c.category === 'BRAKES');
    const oilCat = categoryBreakdown.find((c: { category: string }) => c.category === 'OIL_CHANGE');

    expect(brakesCat).toBeDefined();
    expect(brakesCat.totalAmountKes).toBe(14000);
    expect(brakesCat.percentageOfTotal).toBe(70);

    expect(oilCat).toBeDefined();
    expect(oilCat.totalAmountKes).toBe(6000);
    expect(oilCat.percentageOfTotal).toBe(30);
  });

  it('🧮 should proportionally split invoice costs across multi-category services so the breakdown sums up to total spend', async () => {
    // Register another vehicle to test multi-category allocation in isolation
    const vehRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        plateNumber: `KDH ${Math.floor(100 + Math.random() * 899)}K`,
        chassisNumber: `ZRE999${Date.now()}`,
        make: 'Mazda',
        model: 'Demio',
        year: 2016,
        fuelType: 'PETROL',
        transmission: 'AUTOMATIC',
        engine: '1298cc',
        initialMileage: 40000,
        currentMileage: 40000,
        mileageUnit: 'KM',
      });
    const multiVehId = vehRes.body.data.vehicle._id;

    // Log combined service: BRAKES and SUSPENSION for 20,000 KES
    await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        vehicleId: multiVehId,
        serviceType: ['BRAKES', 'SUSPENSION'],
        serviceDate: '2026-10-01',
        mileageAtService: 45000,
        costKes: 20000,
        garageName: 'AutoXpress Ngara',
        description: 'Brake pads and shocks combined job card',
      });

    const res = await request(app)
      .get(`/api/v1/vehicles/${multiVehId}/analytics`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    const { summary, categoryBreakdown } = res.body.data;

    expect(summary.totalSpendKes).toBe(20000);
    expect(categoryBreakdown).toHaveLength(2);

    // Each should get exactly 10,000 KES (50.0%)
    const brakes = categoryBreakdown.find((c: { category: string }) => c.category === 'BRAKES');
    const suspension = categoryBreakdown.find((c: { category: string }) => c.category === 'SUSPENSION');

    expect(brakes.totalAmountKes).toBe(10000);
    expect(brakes.percentageOfTotal).toBe(50);
    expect(suspension.totalAmountKes).toBe(10000);
    expect(suspension.percentageOfTotal).toBe(50);

    // Mathematical guarantee: category sum equals grand total spend
    const sumCategories = categoryBreakdown.reduce(
      (sum: number, c: { totalAmountKes: number }) => sum + c.totalAmountKes,
      0
    );
    expect(sumCategories).toBe(summary.totalSpendKes);
  });
});
