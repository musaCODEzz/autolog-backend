import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { User } from '../src/models/User';

describe('👑 Admin Operations, Moderation & Security Guards', () => {
  let adminToken: string;
  let adminId: string;
  let ownerToken: string;
  let ownerId: string;
  let garageId: string;
  let rogueDealerToken: string;
  let rogueDealerId: string;

  beforeAll(async () => {
    // 1. Create Super Admin directly in in-memory test DB
    const admin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@autolog.co.ke',
      phone: '+254700000099',
      password: 'SuperAdminPass123!',
      role: 'admin',
      isSuspended: false,
    });
    adminId = admin._id.toString();

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'superadmin@autolog.co.ke',
        password: 'SuperAdminPass123!',
      });
    adminToken = adminLoginRes.body.data.token;

    // 2. Create standard Car Owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Regular Driver',
        email: 'driver@autolog.co.ke',
        phone: '0711559900',
        password: 'Password123!',
        role: 'owner',
      });
    ownerToken = ownerRes.body.data.token;
    ownerId = ownerRes.body.data.user._id;

    // 3. Create unverified Garage
    const garageRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Valley Auto Garage',
        email: 'valley@garage.co.ke',
        phone: '0722330011',
        password: 'Password123!',
        role: 'garage',
        businessDetails: {
          businessName: 'Valley Auto Garage Ltd',
          location: 'Valley Arcade, Lavington, Nairobi',
        },
      });
    garageId = garageRes.body.data.user._id;

    // 4. Create Rogue Dealer to test suspension
    const dealerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Rogue Spares',
        email: 'rogue@spares.co.ke',
        phone: '0733667788',
        password: 'Password123!',
        role: 'dealer',
        businessDetails: {
          businessName: 'Rogue Spares Shop',
          location: 'Grogan, Nairobi',
        },
      });
    rogueDealerToken = dealerRes.body.data.token;
    rogueDealerId = dealerRes.body.data.user._id;
  });

  describe('🛡️ RBAC Route Protection', () => {
    it('should reject Car Owner with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not authorized to access this resource');
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/admin/stats');
      expect(res.status).toBe(401);
    });

    it('should allow Super Admin to fetch platform metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.total).toBeGreaterThanOrEqual(4);
    });
  });

  describe('🛡️ Partner Accreditation & Role Defense', () => {
    it('🛡️ Role Type Defense: should REJECT verifying an OWNER as a partner garage', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/garages/${ownerId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isVerifiedPartner: true });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("only 'garage' accounts can be accredited");
    });

    it('should accredit a legitimate garage as a Verified Partner', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/garages/${garageId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isVerifiedPartner: true });

      expect(res.status).toBe(200);
      expect(res.body.data.garage.businessDetails.isVerifiedPartner).toBe(true);
    });
  });

  describe('🛡️ Account Suspension & Instant Token Revocation', () => {
    it('🛡️ Self-Lockout Defense: should block Admin from suspending themselves', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${adminId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isSuspended: true, reason: 'Accident' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('You cannot suspend your own admin account');
    });

    it('should suspend Rogue Dealer and immediately invalidate their active JWT session', async () => {
      // 1. Admin suspends the rogue dealer
      const suspendRes = await request(app)
        .patch(`/api/v1/admin/users/${rogueDealerId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isSuspended: true,
          reason: 'Counterfeit parts detected in shipments',
        });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.user.isSuspended).toBe(true);

      // 2. Rogue dealer tries to make an API call with their existing token -> MUST BE BLOCKED!
      const breachRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${rogueDealerToken}`);

      expect(breachRes.status).toBe(403);
      expect(breachRes.body.message).toContain('Your account has been suspended');
    });

    it('should restore access when Admin reactivates account', async () => {
      const reactivateRes = await request(app)
        .patch(`/api/v1/admin/users/${rogueDealerId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isSuspended: false });

      expect(reactivateRes.status).toBe(200);

      // Access restored with same token
      const accessRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${rogueDealerToken}`);

      expect(accessRes.status).toBe(200);
      expect(accessRes.body.data.user.email).toBe('rogue@spares.co.ke');
    });
  });
});
