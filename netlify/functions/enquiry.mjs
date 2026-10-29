// POST /api/enquiry — receives inspection requests, property-details requests and
// contact messages (SRS §12, §17, FR-05). Validates, filters spam, stores each lead
// in Netlify Blobs and (optionally) notifies Pablo Homes by email and/or webhook.
import { getStore } from '@netlify/blobs';

export const config = { path: '/api/enquiry' };

const TYPES = new Set(['inspection', 'details', 'contact']);
const LIMITS = { name: 100, phone: 20, whatsapp: 20, email: 120, propertyId: 20, propertyTitle: 200, date: 10, time: 60, reason: 80, message: 2000, source: 200 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s()-]{6,19}$/;
const PROPERTY_RE = /^(PH-\d{3,6}|GENERAL)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_FILL_MS = 2500; // humans don't complete these forms in under 2.5s
const RATE = { windowMs: 10 * 60 * 1000, max: 6 };
const hits = new Map(); // best-effort per-instance rate limiting

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

// Strip control characters and limit length.
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

function rateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE.max;
}

export function validate(input) {
  const type = clean(input.type, 20);
  if (!TYPES.has(type)) return { error: 'Unknown form type.' };
  const r = { type };
  for (const [k, max] of Object.entries(LIMITS)) r[k] = clean(input[k], max);
  const errors = {};
  if (r.name.length < 2) errors.name = 'Please enter your name.';
  if (r.email && !EMAIL_RE.test(r.email)) errors.email = 'Invalid email address.';
  if (r.phone && !PHONE_RE.test(r.phone)) errors.phone = 'Invalid phone number.';
  if (r.whatsapp && !PHONE_RE.test(r.whatsapp)) errors.whatsapp = 'Invalid WhatsApp number.';
  if (type === 'inspection' || type === 'details') {
    if (!r.phone) errors.phone = 'Phone number is required.';
    if (!PROPERTY_RE.test(r.propertyId)) errors.propertyId = 'Please choose a property.';
  }
  if (type === 'inspection') {
    if (!DATE_RE.test(r.date) || Number.isNaN(Date.parse(r.date))) errors.date = 'Please choose a date.';
    else if (Date.parse(r.date + 'T23:59:59Z') < Date.now() - 36 * 3600 * 1000) errors.date = 'Please choose a future date.';
    if (!r.time) errors.time = 'Please choose a time.';
  }
  if (type === 'contact') {
    if (!r.email) errors.email = 'Email is required.';
    if (!r.phone) errors.phone = 'Phone is required.';
    if (!r.reason) errors.reason = 'Please choose a reason.';
    if (r.message.length < 2) errors.message = 'Please enter a message.';
  }
  if (/(https?:\/\/|www\.)\S+/i.test(r.name)) errors.name = 'Please enter your name.';
  return Object.keys(errors).length ? { error: 'Please check the highlighted fields.', fields: errors } : { record: r };
}

const makeRef = (type) => {
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${{ inspection: 'INS', details: 'REQ', contact: 'MSG' }[type]}-${ymd}-${rand}`;
};

const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function summaryLines(r) {
  return [
    ['Reference', r.ref], ['Type', r.type], ['Received', r.receivedAt], ['Name', r.name], ['Phone', r.phone], ['WhatsApp', r.whatsapp], ['Email', r.email],
    ['Property', r.propertyId ? `${r.propertyId}${r.propertyTitle ? ' — ' + r.propertyTitle : ''}` : ''],
    ['Preferred date', r.date], ['Preferred time', r.time], ['Reason', r.reason], ['Message', r.message], ['Page', r.source],
  ].filter(([, v]) => v);
}

async function notify(record, env) {
  const tasks = [];
  const subjects = { inspection: 'New inspection request', details: 'New property details request', contact: 'New website message' };
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    const lines = summaryLines(record);
    tasks.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.FROM_EMAIL || 'Pablo Homes Website <onboarding@resend.dev>',
          to: env.NOTIFY_EMAIL.split(',').map((s) => s.trim()),
          reply_to: record.email || undefined,
          subject: `${subjects[record.type]}${record.propertyId ? ` — ${record.propertyId}` : ''} (${record.ref})`,
          text: lines.map(([k, v]) => `${k}: ${v}`).join('\n'),
          html: `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">${lines.map(([k, v]) => `<tr><td style="color:#6e6862;vertical-align:top">${escHtml(k)}</td><td><strong>${escHtml(v).replace(/\n/g, '<br>')}</strong></td></tr>`).join('')}</table>`,
        }),
        signal: AbortSignal.timeout(8000),
      }).then((r) => { if (!r.ok) throw new Error(`Email failed: ${r.status}`); return 'email'; }),
    );
  }
  if (env.NOTIFY_WEBHOOK_URL) {
    tasks.push(
      fetch(env.NOTIFY_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record), signal: AbortSignal.timeout(8000) })
        .then((r) => { if (!r.ok) throw new Error(`Webhook failed: ${r.status}`); return 'webhook'; }),
    );
  }
  const results = await Promise.allSettled(tasks);
  results.filter((x) => x.status === 'rejected').forEach((x) => console.error('[enquiry] notify error:', x.reason?.message));
  return results.some((x) => x.status === 'fulfilled');
}

// Core handler with injectable dependencies (used by tests).
export async function handle(req, { store, env = {}, ip = '' } = {}) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'POST' } });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405, { Allow: 'POST' });

  const origin = req.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== new URL(req.url).host) return json({ ok: false, error: 'Forbidden' }, 403); } catch { return json({ ok: false, error: 'Forbidden' }, 403); }
  }
  if (!(req.headers.get('content-type') || '').includes('application/json')) return json({ ok: false, error: 'Expected JSON' }, 415);
  const raw = await req.text();
  if (raw.length > 12000) return json({ ok: false, error: 'Request too large' }, 413);
  let input;
  try { input = JSON.parse(raw); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
  if (!input || typeof input !== 'object') return json({ ok: false, error: 'Invalid request' }, 400);

  // Spam traps: honeypot field and implausibly fast submissions are accepted silently but discarded.
  const started = Number(input.started_at);
  if (input.company_website || (started && Date.now() - started < MIN_FILL_MS)) {
    return json({ ok: true, ref: makeRef(TYPES.has(input.type) ? input.type : 'contact') });
  }
  if (rateLimited(ip)) return json({ ok: false, error: 'Too many requests. Please try again shortly or contact us on WhatsApp.' }, 429);

  const { error, fields, record } = validate(input);
  if (error) return json({ ok: false, error, fields }, 422);

  record.ref = makeRef(record.type);
  record.receivedAt = new Date().toISOString();
  record.enquirySource = 'website';
  record.userAgent = clean(req.headers.get('user-agent'), 200);

  let stored = false;
  if (store) {
    try {
      await store.setJSON(`${record.type}/${record.receivedAt}-${record.ref}`, record);
      stored = true;
    } catch (e) {
      console.error('[enquiry] storage error:', e.message);
    }
  }
  const notified = await notify(record, env);
  console.log(`[enquiry] ${record.type} ${record.ref} stored=${stored} notified=${notified}`);
  if (!stored && !notified) return json({ ok: false, error: 'We could not save your request.' }, 503);
  return json({ ok: true, ref: record.ref });
}

export default async (req, context) => {
  let store = null;
  try { store = getStore({ name: 'enquiries', consistency: 'strong' }); } catch (e) { console.error('[enquiry] blobs unavailable:', e.message); }
  return handle(req, { store, env: process.env, ip: context?.ip || '' });
};
