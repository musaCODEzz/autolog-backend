import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('👤 Authentication & Authorization Engine', () => {
  const testOwner = {
    name: 'Wanjiku Kamau',
    email: 'wanjiku@autolog.co.ke',
    phone: '0712345678', // Local format
    password: 'Password123!',
    role: 'owner',
  };

  const testGarage = {
    name: 'Westlands Auto Clinic',
    email: 'info@westlandsauto.co.ke',
    phone: '0722998877',
    password: 'Password123!',
    role: 'garage',
    businessDetails: {
      businessName: 'Westlands Auto Clinic Ltd',
      location: 'Muthithi Road, Westlands, Nairobi',
    },
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a Car Owner and normalize phone to E.164 (+254...)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testOwner);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.phone).toBe('+254712345678');
      expect(res.body.data.user.role).toBe('owner');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined(); // Never leak password!
    });

    it('🛡️ should REJECT Car Owner providing business details (Anti-Fraud)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Fake Owner',
          email: 'fakeowner@autolog.co.ke',
          phone: '0799112233',
          password: 'Password123!',
          role: 'owner',
          businessDetails: {
            businessName: 'Rogue Garage',
            location: 'Nairobi',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toContain('Car owners cannot have business details');
    });

    it('🛡️ should REJECT Garage registering WITHOUT business name and location', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Anonymous Mechanic',
          email: 'nogarage@autolog.co.ke',
          phone: '0733445566',
          password: 'Password123!',
          role: 'garage',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toContain('Garage name is required');
    });

    it('should register a Garage and initialize isVerifiedPartner to false', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testGarage);

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('garage');
      expect(res.body.data.user.businessDetails.isVerifiedPartner).toBe(false);
      expect(res.body.data.user.businessDetails.rating).toBe(5);
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testOwner,
          phone: '0788776655', // Different phone, duplicate email
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Email already registered');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login using EMAIL', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testOwner.email,
          password: testOwner.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should login using KENYAN PHONE NUMBER (07...)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '0712345678', // tests phone normalization in login query
          password: testOwner.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testOwner.email);
    });

    it('should return 401 on incorrect password without leaking user existence', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testOwner.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should fetch user profile when valid Bearer token is provided', async () => {
      // First login to get fresh token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testOwner.email,
          password: testOwner.password,
        });

      const token = loginRes.body.data.token;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testOwner.email);
      expect(res.body.data.user.isSuspended).toBe(false);
    });

    it('should reject request without Bearer token with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Authentication required');
    });
  });
});
