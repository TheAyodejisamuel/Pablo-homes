// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle as enquiry } from '../netlify/functions/enquiry.mjs';
import { handle as leads } from '../netlify/functions/leads.mjs';

const memStore = () => {
  const m = new Map();
  return {
    m,
    async setJSON(k, v) { m.set(k, v); },
    async get(k) { return m.get(k) ?? null; },
    async list({ prefix = '' } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
};
const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const post = (body, headers = {}) => new Request('https://pablohomes.example/api/enquiry', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});
const valid = { type: 'inspection', name: 'Ada Obi', phone: '0803 000 0000', propertyId: 'PH-1001', propertyTitle: 'Duplex', date: tomorrow, time: 'Morning', started_at: String(Date.now() - 20000) };

test('stores a valid inspection request and returns a reference', async () => {
  const store = memStore();
  const res = await enquiry(post(valid), { store, ip: '1.1.1.1' });
  const j = await res.json();
  assert.equal(res.status, 200);
  assert.match(j.ref, /^INS-\d{6}-[A-Z0-9]{4}$/);
  const [rec] = store.m.values();
  assert.equal(rec.name, 'Ada Obi');
  assert.equal(rec.propertyId, 'PH-1001');
  assert.ok(rec.receivedAt);
  assert.equal(rec.enquirySource, 'website');
});

test('rejects missing required fields with 422', async () => {
  const res = await enquiry(post({ ...valid, phone: '', date: '' }), { store: memStore(), ip: '1.1.1.2' });
  const j = await res.json();
  assert.equal(res.status, 422);
  assert.ok(j.fields.phone && j.fields.date);
});

test('rejects past inspection dates', async () => {
  const res = await enquiry(post({ ...valid, date: '2020-01-01' }), { store: memStore(), ip: '1.1.1.3' });
  assert.equal(res.status, 422);
});

test('contact form requires email, reason and message', async () => {
  const res = await enquiry(post({ type: 'contact', name: 'Bisi', phone: '08030000000', email: 'bad', started_at: '1' }), { store: memStore(), ip: '1.1.1.4' });
  const j = await res.json();
  assert.equal(res.status, 422);
  assert.ok(j.fields.email && j.fields.reason && j.fields.message);
});

test('honeypot and too-fast submissions are silently discarded', async () => {
  const store = memStore();
  const a = await enquiry(post({ ...valid, company_website: 'http://spam' }), { store, ip: '1.1.1.5' });
  const b = await enquiry(post({ ...valid, started_at: String(Date.now()) }), { store, ip: '1.1.1.5' });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(store.m.size, 0);
});

test('blocks cross-origin posts and non-POST methods', async () => {
  const x = await enquiry(post(valid, { origin: 'https://evil.example' }), { store: memStore() });
  assert.equal(x.status, 403);
  const g = await enquiry(new Request('https://pablohomes.example/api/enquiry'), { store: memStore() });
  assert.equal(g.status, 405);
});

test('rate limits repeated submissions from one IP', async () => {
  const store = memStore();
  let last;
  for (let i = 0; i < 8; i++) last = await enquiry(post(valid), { store, ip: '9.9.9.9' });
  assert.equal(last.status, 429);
});

test('returns 503 when nothing could store or deliver the lead', async () => {
  const res = await enquiry(post(valid), { store: null, ip: '1.1.1.6' });
  assert.equal(res.status, 503);
});

test('escapes nothing dangerous into storage beyond plain text and trims length', async () => {
  const store = memStore();
  await enquiry(post({ ...valid, message: 'x'.repeat(5000) + '\u0007' }), { store, ip: '1.1.1.7' });
  const [rec] = store.m.values();
  assert.equal(rec.message.length, 2000);
});

test('leads endpoint requires a valid admin token', async () => {
  const store = memStore();
  await enquiry(post(valid), { store, ip: '2.2.2.2' });
  const env = { ADMIN_TOKEN: 'correct-horse-battery' };
  const bad = await leads(new Request('https://x/api/leads', { headers: { authorization: 'Bearer nope' } }), { store, env, ip: '3.3.3.3' });
  assert.equal(bad.status, 401);
  const ok = await leads(new Request('https://x/api/leads?type=inspection', { headers: { authorization: 'Bearer correct-horse-battery' } }), { store, env });
  const j = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(j.count, 1);
  const unset = await leads(new Request('https://x/api/leads'), { store, env: {} });
  assert.equal(unset.status, 503);
});
