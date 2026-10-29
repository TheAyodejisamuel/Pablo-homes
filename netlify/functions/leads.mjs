// GET /api/leads — returns stored enquiries for the /admin/ page.
// Protected by the ADMIN_TOKEN environment variable (set it in Netlify → Site configuration → Environment variables).
// This is the seed of the future admin dashboard (SRS §19).
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';

export const config = { path: '/api/leads' };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

const digest = (s) => createHash('sha256').update(String(s)).digest();
export const tokenMatches = (given, expected) => !!expected && expected.length >= 12 && timingSafeEqual(digest(given), digest(expected));

const failures = new Map();

export async function handle(req, { store, env = {}, ip = '' } = {}) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 12) return json({ error: 'Admin access is not configured. Set ADMIN_TOKEN (12+ characters) in your hosting environment.' }, 503);
  const now = Date.now();
  const f = (failures.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (f.length >= 10) return json({ error: 'Too many attempts. Try again later.' }, 429);
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tokenMatches(given, env.ADMIN_TOKEN)) {
    f.push(now);
    failures.set(ip, f);
    return json({ error: 'Invalid admin key.' }, 401);
  }
  if (!store) return json({ error: 'Storage is unavailable.' }, 503);

  const type = new URL(req.url).searchParams.get('type');
  const prefix = ['inspection', 'details', 'contact'].includes(type) ? `${type}/` : undefined;
  const { blobs } = await store.list(prefix ? { prefix } : {});
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 500);
  const items = (await Promise.all(keys.map((k) => store.get(k, { type: 'json' })))).filter(Boolean);
  items.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
  return json({ items, count: items.length });
}

export default async (req, context) => {
  let store = null;
  try { store = getStore({ name: 'enquiries', consistency: 'strong' }); } catch (e) { console.error('[leads] blobs unavailable:', e.message); }
  return handle(req, { store, env: process.env, ip: context?.ip || '' });
};
