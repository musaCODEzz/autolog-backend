import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { Waitlist } from '../src/models/Waitlist';

describe('🚀 Early Access Waitlist & Launch Landing Page Engine', () => {
  const sampleLead = {
    fullName: 'Dennis Kiprop',
    email: 'dennis.lead@autolog.ke',
    phone: '0712998877',
    role: 'CAR_OWNER',
    vehicleInterest: 'Mazda Demio 2017 SkyActiv',
    phoneConsent: true,
    utmSource: 'twitter',
    utmMedium: 'cpc',
    utmCampaign: 'nairobi_launch_2026',
  };

  it('🛡️ Checklist Item #23: should REJECT submission without explicit phone consent', async () => {
    const res = await request(app)
      .post('/api/v1/waitlist')
      .send({
        ...sampleLead,
        email: 'no.consent@autolog.ke',
        phoneConsent: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const hasConsentError = res.body.errors.some((err: any) => err.message.includes('phone consent'));
    expect(hasConsentError).toBe(true);
  });

  it('🛡️ should REJECT submission with invalid Kenyan phone format', async () => {
    const res = await request(app)
      .post('/api/v1/waitlist')
      .send({
        ...sampleLead,
        phone: '1234567', // Invalid
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const hasPhoneError = res.body.errors.some((err: any) => err.message.includes('valid Kenyan mobile number'));
    expect(hasPhoneError).toBe(true);
  });

  it('✅ Checklist Item #30: should successfully register lead, normalize phone (+254), and capture UTM attribution', async () => {
    const res = await request(app)
      .post('/api/v1/waitlist')
      .send(sampleLead);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe('+254712998877');
    expect(res.body.data.utmSource).toBe('twitter');
    expect(res.body.data.waitlistPosition).toBeGreaterThan(0);

    // Verify in database
    const saved = await Waitlist.findOne({ email: sampleLead.email });
    expect(saved).not.toBeNull();
    expect(saved?.phoneConsent).toBe(true);
    expect(saved?.utmCampaign).toBe('nairobi_launch_2026');
  });

  it('🛡️ should REJECT duplicate email registration with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/waitlist')
      .send(sampleLead);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already registered');
  });

  it('📊 should return live waitlist counter at GET /api/v1/waitlist/count', async () => {
    const res = await request(app).get('/api/v1/waitlist/count');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.totalJoined).toBe('number');
    expect(res.body.data.totalJoined).toBeGreaterThan(0);
  });

  it('🌐 should serve Early Access Landing Page at GET /early-access and /landing', async () => {
    const resEarly = await request(app).get('/early-access');
    expect(resEarly.status).toBe(200);
    expect(resEarly.text).toContain('AutoLog Kenya');
    expect(resEarly.text).toContain('Apply for Early Access');

    const resLanding = await request(app).get('/landing');
    expect(resLanding.status).toBe(200);
    expect(resLanding.text).toContain('AutoLog Kenya');
  });

  it('🤖 Checklist Items #17 & #19: should serve robots.txt and llms.txt for AI bots and search engines', async () => {
    const resRobots = await request(app).get('/robots.txt');
    expect(resRobots.status).toBe(200);
    expect(resRobots.text).toContain('GPTBot');
    expect(resRobots.text).toContain('ClaudeBot');

    const resLlms = await request(app).get('/llms.txt');
    expect(resLlms.status).toBe(200);
    expect(resLlms.text).toContain('AutoLog Kenya (AL-KE)');
  });

  it('📚 should serve static API docs (docs.html) and openapi.json', async () => {
    const resDocs = await request(app).get('/docs.html');
    expect(resDocs.status).toBe(200);
    expect(resDocs.text).toContain('AutoLog Kenya — REST API Documentation');

    const resSpec = await request(app).get('/openapi.json');
    expect(resSpec.status).toBe(200);
    expect(resSpec.body.openapi).toBe('3.0.0');
  });
});
