import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('🏥 Health Check & Global Route Guards', () => {
  it('GET /health should return 200 and system uptime', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('app is alive and running');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api-docs should redirect to interactive docs', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/api-docs');
  });

  it('GET /non-existent-route should return 404 with structured error', async () => {
    const res = await request(app).get('/api/v1/invalid-route-xyz');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toContain('Route not found on the AUTOLOG KE API SERVER');
  });
});
