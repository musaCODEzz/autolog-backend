import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { User } from '../src/models/User';
import { Vehicle } from '../src/models/Vehicle';

describe('📱 WhatsApp Micro-Checkin Engine (Twilio Webhook)', () => {
  let userPhone = '+254711223344';
  let vehicleId: string;

  beforeAll(async () => {
    // 1. Create a car owner
    const user = await User.create({
      name: 'Juma Mwangi',
      email: 'juma@example.com',
      phone: userPhone,
      password: 'hashedpassword123',
      role: 'owner',
    });

    // 2. Register a vehicle with currentMileage: 75,000 km
    const vehicle = await Vehicle.create({
      owner: user._id,
      plateNumber: 'KDA 789B',
      make: 'Subaru',
      model: 'Forester',
      year: 2017,
      fuelType: 'PETROL',
      transmission: 'AUTOMATIC',
      engine: '1995cc',
      initialMileage: 70000,
      currentMileage: 75000,
      estDailyKm: 35,
      mileageUnit: 'KM',
    });

    vehicleId = vehicle._id.toString();
  });

  it('should legitimately update odometer from 75,000 to 78,500 km via WhatsApp reply', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/webhook')
      .type('form')
      .send({
        From: `whatsapp:${userPhone}`,
        Body: '78500',
      });

    expect(res.status).toBe(200);

    // Verify DB update
    const updated = await Vehicle.findById(vehicleId);
    expect(updated?.currentMileage).toBe(78500);
  });

  it('should support colloquial Kenyan "k" suffix (e.g. "80k" -> 80,000 km)', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/webhook')
      .type('form')
      .send({
        From: `whatsapp:${userPhone}`,
        Body: '80k',
      });

    expect(res.status).toBe(200);

    const updated = await Vehicle.findById(vehicleId);
    expect(updated?.currentMileage).toBe(80000);
  });

  it('should reject odometer rollback attempt (e.g. 50,000 km when car is at 80,000 km)', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/webhook')
      .type('form')
      .send({
        From: `whatsapp:${userPhone}`,
        Body: '50000',
      });

    expect(res.status).toBe(200);

    // DB mileage must NOT have decreased
    const updated = await Vehicle.findById(vehicleId);
    expect(updated?.currentMileage).toBe(80000);
  });

  it('should handle unparseable text gracefully without crashing', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/webhook')
      .type('form')
      .send({
        From: `whatsapp:${userPhone}`,
        Body: 'Niko kwa jam Thika Road boss',
      });

    expect(res.status).toBe(200);

    const updated = await Vehicle.findById(vehicleId);
    expect(updated?.currentMileage).toBe(80000);
  });
});
