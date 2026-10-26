import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

// These cover the HTTP layer only — nothing here reaches the database.
const app = createApp();

describe('http layer', () => {
  it('responds to health checks', async () => {
    await request(app).get('/health').expect(200, { ok: true });
  });

  it('rejects a booking with a bad phone number before touching the db', async () => {
    const res = await request(app)
      .post('/bookings')
      .send({ serviceId: 'x', startsAt: '2026-11-01T07:00:00Z', customerName: 'Sara', phone: '12345' })
      .expect(400);
    expect(res.body.issues.phone).toBeDefined();
  });

  it('rejects malformed json', async () => {
    await request(app).post('/bookings').set('Content-Type', 'application/json').send('{oops').expect(400);
  });

  it('keeps admin routes behind a session', async () => {
    await request(app).get('/admin/bookings').expect(401);
    await request(app).get('/admin/bookings').set('Cookie', 'mawid_session=garbage').expect(401);
  });

  it('refuses webhooks without the shared secret', async () => {
    await request(app).post('/payments/moyasar/webhook').send({ type: 'payment_paid', data: {} }).expect(401);
  });

  it('returns json 404s', async () => {
    const res = await request(app).get('/nope').expect(404);
    expect(res.body.error).toBe('not_found');
  });
});
