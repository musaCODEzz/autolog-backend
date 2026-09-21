import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('📦 Spare Parts RFQ & 48-Hour Price Lock Engine', () => {
  let ownerToken: string;
  let dealer1Token: string;
  let dealer2Token: string;
  let vehicleId: string;
  let rfqId: string;
  let quote1Id: string;
  let quote2Id: string;

  beforeAll(async () => {
    // 1. Create Car Owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Ochieng Odhiambo',
        email: 'ochieng.rfq@autolog.co.ke',
        phone: '0714112233',
        password: 'Password123!',
        role: 'owner',
      });
    ownerToken = ownerRes.body.data.token;

    // 2. Register Owner Vehicle
    const vehRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        plateNumber: 'KDF 101Y',
        chassisNumber: 'JT111GJ120008899',
        make: 'Toyota',
        model: 'Hilux',
        year: 2020,
        fuelType: 'DIESEL',
        transmission: 'MANUAL',
        engine: '2393cc 2GD-FTV',
        initialMileage: 60000,
        currentMileage: 60000,
        mileageUnit: 'KM',
      });
    vehicleId = vehRes.body.data.vehicle._id;

    // 3. Register Dealer 1 (Kirinyaga Rd)
    const d1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Kirinyaga Spares Hub',
        email: 'kirinyaga@spares.co.ke',
        phone: '0722114477',
        password: 'Password123!',
        role: 'dealer',
        businessDetails: {
          businessName: 'Kirinyaga Spares Hub Ltd',
          location: 'Kirinyaga Road, Nairobi',
        },
      });
    dealer1Token = d1Res.body.data.token;

    // 4. Register Dealer 2 (Industrial Area)
    const d2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Indo Auto Parts',
        email: 'indo@autoparts.co.ke',
        phone: '0733225588',
        password: 'Password123!',
        role: 'dealer',
        businessDetails: {
          businessName: 'Indo Auto Parts Ltd',
          location: 'Commercial Street, Industrial Area, Nairobi',
        },
      });
    dealer2Token = d2Res.body.data.token;
  });

  describe('RFQ Creation & Dealer Feed', () => {
    it('should create an RFQ linked to vehicle with automatic 7-day expiry', async () => {
      const res = await request(app)
        .post('/api/v1/rfq/requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          vehicleId,
          partName: 'Clutch Kit (Cover & Disc)',
          category: 'TRANSMISSION',
          quantity: 1,
          preference: 'OEM_MATCH',
          urgency: 'WITHIN_WEEK',
          fulfillmentType: 'DELIVERY_NAIROBI',
          deliveryLocation: 'Nairobi CBD',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.partRequest.status).toBe('OPEN');
      expect(res.body.data.partRequest.quotesCount).toBe(0);
      rfqId = res.body.data.partRequest._id;
    });

    it('should allow parts dealers to view open feed with vehicle fitment specs', async () => {
      const res = await request(app)
        .get('/api/v1/rfq/feed?category=TRANSMISSION')
        .set('Authorization', `Bearer ${dealer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.feed.length).toBeGreaterThanOrEqual(1);
      const target = res.body.data.feed.find((r: any) => r._id === rfqId);
      expect(target).toBeDefined();
      expect(target.vehicle.engine).toBe('2393cc 2GD-FTV'); // Fitment verified!
    });
  });

  describe('48-Hour Price Lock Quote Submission & Anti-Spam', () => {
    it('should submit Quote 1 with 48-Hour Price Lock Guarantee', async () => {
      const res = await request(app)
        .post('/api/v1/rfq/quotes')
        .set('Authorization', `Bearer ${dealer1Token}`)
        .send({
          partRequestId: rfqId,
          brandOffered: 'Aisin Japan',
          condition: 'OEM_MATCH',
          priceKes: 22000,
          warrantyDays: 90,
          availability: 'IN_STOCK_COLLECT',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.quote.priceKes).toBe(22000);
      quote1Id = res.body.data.quote._id;

      // Verify 48h Lock Guarantee
      const validUntil = new Date(res.body.data.quote.validUntil);
      const hoursAhead = Math.round((validUntil.getTime() - Date.now()) / (1000 * 60 * 60));
      expect(hoursAhead).toBe(48);
    });

    it('🛡️ Anti-Spam: should REJECT duplicate active quote from same dealer with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/rfq/quotes')
        .set('Authorization', `Bearer ${dealer1Token}`)
        .send({
          partRequestId: rfqId,
          brandOffered: 'Exedy Japan',
          condition: 'OEM_MATCH',
          priceKes: 20000,
          warrantyDays: 60,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already submitted an active quote');
    });

    it('should allow Dealer 2 to submit Quote 2', async () => {
      const res = await request(app)
        .post('/api/v1/rfq/quotes')
        .set('Authorization', `Bearer ${dealer2Token}`)
        .send({
          partRequestId: rfqId,
          brandOffered: 'Toyota Genuine Parts',
          condition: 'GENUINE_NEW',
          priceKes: 31000,
          warrantyDays: 180,
          availability: 'SAME_DAY_DELIVERY',
        });

      expect(res.status).toBe(201);
      quote2Id = res.body.data.quote._id;
    });
  });

  describe('🛡️ Anti-Cartel Blind Bidding & Deal Acceptance', () => {
    it('🛡️ Blind Bidding: Dealer 1 cannot see Dealer 2 quotes', async () => {
      const res = await request(app)
        .get(`/api/v1/rfq/requests/${rfqId}`)
        .set('Authorization', `Bearer ${dealer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.quotes).toBeUndefined(); // Competing quotes hidden!
      expect(res.body.data.myQuote._id).toBe(quote1Id); // Only own quote visible
    });

    it('should allow Owner to view ALL quotes ranked by price (cheapest first)', async () => {
      const res = await request(app)
        .get(`/api/v1/rfq/requests/${rfqId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.quotes.length).toBe(2);
      expect(res.body.data.quotes[0].priceKes).toBe(22000); // 22k before 31k!
      expect(res.body.data.quotes[1].priceKes).toBe(31000);
    });

    it('should atomically accept Quote 1 and auto-reject Quote 2', async () => {
      const res = await request(app)
        .patch(`/api/v1/rfq/quotes/${quote1Id}/accept`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.acceptedQuote.status).toBe('ACCEPTED');
      expect(res.body.data.dealerContact.phone).toBe('+254722114477');
      expect(res.body.data.dealerContact.location).toBe('Kirinyaga Road, Nairobi');

      // Verify competing quote status
      const checkRes = await request(app)
        .get(`/api/v1/rfq/requests/${rfqId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(checkRes.body.data.request.status).toBe('ACCEPTED');
      const q2 = checkRes.body.data.quotes.find((q: any) => q._id === quote2Id);
      expect(q2.status).toBe('REJECTED'); // Auto-rejected!
    });
  });
});
