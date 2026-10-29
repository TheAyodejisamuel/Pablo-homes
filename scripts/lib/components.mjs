import {
  CATEGORIES, PURPOSES, STATUSES, esc, priceLabel, locationLabel, slugify, waLink, isClosed,
} from './util.mjs';

// Feather/Lucide-style stroke icons (MIT/ISC licensed shapes, redrawn).
const ICONS = {
  bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  bath: '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.7 3 4 3.7 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M2 12h20M7 19v2M17 19v2"/>',
  area: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  left: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  land: '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  apartment: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  duplex: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  terrace: '<path d="M2 21h20M4 21V9l4-3 4 3v12M12 21V9l4-3 4 3v12M7 13h2M15 13h2"/>',
  commercial: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  shortlet: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  offplan: '<path d="M3 21h18M6 21V10h8v11M10 3v7M10 3h9v3M18 6v4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3Z"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

export function statusBadge(p) {
  const s = STATUSES[p.status] || { label: p.status, tone: 'positive' };
  return `<span class="badge badge--${s.tone}">${esc(s.label)}</span>`;
}

export function facts(p, { withLabels = false } = {}) {
  const items = [];
  if (p.bedrooms != null) items.push(['bed', `${p.bedrooms}`, p.bedrooms === 1 ? 'Bed' : 'Beds']);
  if (p.bathrooms != null) items.push(['bath', `${p.bathrooms}`, p.bathrooms === 1 ? 'Bath' : 'Baths']);
  if (p.size) items.push(['area', `${p.size.toLocaleString('en-NG')} m²`, '']);
  else if (p.landSize) items.push(['land', p.landSize.replace(/\s*\(.*\)/, ''), '']);
  return items
    .map(([ic, v, l]) => `<li>${icon(ic)}<span>${esc(v)}${l ? ` <span class="${withLabels ? '' : 'sr-only-sm'}">${l}</span>` : ''}</span></li>`)
    .join('');
}

export function propertyCard(p, { eager = false } = {}) {
  const img = p.imageList[0];
  const purpose = PURPOSES[p.purpose]?.filter || 'buy';
  return `<article class="card${isClosed(p) ? ' card--closed' : ''}" data-card data-id="${esc(p.id)}" data-purpose="${purpose}" data-type="${p.category}" data-location="${slugify(p.location.area)}" data-city="${slugify(p.location.city)}" data-price="${p.price ?? ''}" data-beds="${p.bedrooms ?? ''}" data-baths="${p.bathrooms ?? ''}" data-status="${p.status}" data-date="${p.dateAdded}" data-title="${esc(p.title)}">
  <a class="card-media" href="${p.url}" tabindex="-1" aria-hidden="true">
    <img src="${img.src}" alt="" width="1200" height="800" ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>
    <span class="card-badges">${statusBadge(p)}${STATUSES[p.status]?.label === CATEGORIES[p.category].label ? '' : `<span class="badge badge--glass">${esc(CATEGORIES[p.category].label)}</span>`}</span>
    ${p.sample ? '<span class="card-sample">Sample listing</span>' : ''}
  </a>
  <div class="card-body">
    <p class="card-price">${esc(priceLabel(p, { short: true }))}</p>
    <h3 class="card-title"><a href="${p.url}">${esc(p.title)}</a></h3>
    <p class="card-loc">${icon('pin')}${esc(locationLabel(p))}</p>
    <ul class="card-facts">${facts(p, { withLabels: true })}</ul>
    <a class="card-link" href="${p.url}" aria-label="View details: ${esc(p.title)}">View Details ${icon('arrow')}</a>
  </div>
</article>`;
}

// ---- Forms (shared by inspection, contact and details request) ----
const honeypot = `<div class="hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div><input type="hidden" name="started_at" value="">`;

const field = (id, label, input, { hint = '', optional = false } = {}) =>
  `<div class="field"><label for="${id}">${label}${optional ? ' <span class="optional">(optional)</span>' : ''}</label>${input}${hint ? `<p class="hint" id="${id}-hint">${hint}</p>` : ''}<p class="field-error" id="${id}-error" aria-live="polite"></p></div>`;

export function inspectionForm(properties, selected, { idPrefix = 'ins', site }) {
  const open = properties.filter((p) => !isClosed(p));
  const opts = open
    .map((p) => `<option value="${esc(p.id)}"${selected && selected.id === p.id ? ' selected' : ''}>${esc(p.id)} — ${esc(p.title)}, ${esc(p.location.area)}</option>`)
    .join('');
  const i = (n) => `${idPrefix}-${n}`;
  return `<form class="form" data-form="inspection" novalidate>
  <input type="hidden" name="type" value="inspection">
  ${honeypot}
  <div class="form-grid">
    ${field(i('name'), 'Full name', `<input id="${i('name')}" name="name" type="text" autocomplete="name" required maxlength="100">`)}
    ${field(i('phone'), 'Phone number', `<input id="${i('phone')}" name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="20" placeholder="e.g. 0803 000 0000">`)}
    ${field(i('whatsapp'), 'WhatsApp number', `<input id="${i('whatsapp')}" name="whatsapp" type="tel" inputmode="tel" maxlength="20" placeholder="If different from phone">`, { optional: true })}
    ${field(i('email'), 'Email', `<input id="${i('email')}" name="email" type="email" autocomplete="email" maxlength="120">`, { optional: true })}
    <div class="span-2">${field(i('property'), 'Selected property', `<select id="${i('property')}" name="propertyId" required data-property-select><option value="">Choose a property…</option>${opts}<option value="GENERAL"${selected ? '' : ''}>Not sure yet — please advise me</option></select>`)}</div>
    ${field(i('date'), 'Preferred inspection date', `<input id="${i('date')}" name="date" type="date" required data-min-today>`)}
    ${field(i('time'), 'Preferred time', `<select id="${i('time')}" name="time" required><option value="">Choose a time…</option><option>Morning (9am – 12pm)</option><option>Afternoon (12pm – 3pm)</option><option>Late afternoon (3pm – 5pm)</option><option>Video walkthrough instead</option></select>`)}
    <div class="span-2">${field(i('message'), 'Additional message', `<textarea id="${i('message')}" name="message" rows="4" maxlength="2000"></textarea>`, { optional: true })}</div>
  </div>
  <p class="form-note">${icon('calendar')}<span>This is an inspection <strong>request</strong>. Pablo Homes will contact you to confirm the date and time before your appointment is booked.</span></p>
  <button class="btn btn-primary btn-block" type="submit">Request Inspection</button>
  <div class="form-status" role="status" aria-live="polite"></div>
</form>`;
}

export function contactForm({ idPrefix = 'ct' } = {}) {
  const i = (n) => `${idPrefix}-${n}`;
  const reasons = ['Buying a property', 'Renting a property', 'Buying land', 'Shortlet booking', 'Property investment', 'Booking an inspection', 'Listing my property', 'Something else'];
  return `<form class="form" data-form="contact" novalidate>
  <input type="hidden" name="type" value="contact">
  ${honeypot}
  <div class="form-grid">
    ${field(i('name'), 'Full name', `<input id="${i('name')}" name="name" type="text" autocomplete="name" required maxlength="100">`)}
    ${field(i('email'), 'Email', `<input id="${i('email')}" name="email" type="email" autocomplete="email" required maxlength="120">`)}
    ${field(i('phone'), 'Phone', `<input id="${i('phone')}" name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="20">`)}
    ${field(i('reason'), 'Reason for enquiry', `<select id="${i('reason')}" name="reason" required><option value="">Choose one…</option>${reasons.map((r) => `<option>${r}</option>`).join('')}</select>`)}
    <div class="span-2">${field(i('message'), 'Message', `<textarea id="${i('message')}" name="message" rows="5" required maxlength="2000"></textarea>`)}</div>
  </div>
  <button class="btn btn-primary" type="submit">Send Message</button>
  <div class="form-status" role="status" aria-live="polite"></div>
</form>`;
}

export function detailsForm(p) {
  const i = (n) => `det-${n}`;
  return `<form class="form" data-form="details" novalidate>
  <input type="hidden" name="type" value="details">
  <input type="hidden" name="propertyId" value="${esc(p.id)}">
  ${honeypot}
  ${field(i('name'), 'Full name', `<input id="${i('name')}" name="name" type="text" autocomplete="name" required maxlength="100">`)}
  ${field(i('phone'), 'Phone or WhatsApp number', `<input id="${i('phone')}" name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="20">`)}
  ${field(i('email'), 'Email', `<input id="${i('email')}" name="email" type="email" autocomplete="email" maxlength="120">`, { optional: true })}
  ${field(i('message'), 'What would you like to know?', `<textarea id="${i('message')}" name="message" rows="4" maxlength="2000">Please send me full details, documents available, and more photos or video of ${esc(p.title)} (Ref: ${esc(p.id)}).</textarea>`)}
  <button class="btn btn-primary btn-block" type="submit">Request Property Details</button>
  <div class="form-status" role="status" aria-live="polite"></div>
</form>`;
}

// ---- Search controls (hero + properties page share the same vocabulary) ----
export const PRICE_STEPS = [500000, 1000000, 2000000, 5000000, 10000000, 20000000, 50000000, 100000000, 200000000, 500000000];
const compactNaira = (n) => (n >= 1e6 ? `₦${n / 1e6}M` : `₦${n / 1e3}k`);

export function priceOptions(name, anyLabel) {
  return `<option value="">${anyLabel}</option>` + PRICE_STEPS.map((v) => `<option value="${v}">${compactNaira(v)}</option>`).join('');
}

export function locationOptions(properties) {
  const byCity = new Map();
  for (const p of properties) {
    const c = p.location.city;
    if (!byCity.has(c)) byCity.set(c, new Set());
    byCity.get(c).add(p.location.area);
  }
  // Grouped by city so additional cities/states can be added later without redesign (SRS §4).
  return [...byCity]
    .map(([city, areas]) => `<optgroup label="${esc(city)}">${[...areas].sort().map((a) => `<option value="${slugify(a)}">${esc(a)}</option>`).join('')}</optgroup>`)
    .join('');
}

export function typeOptions() {
  return Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${esc(v.plural)}</option>`).join('');
}

export const bedOptions = (any = 'Any') => `<option value="">${any}</option>` + [1, 2, 3, 4, 5].map((n) => `<option value="${n}">${n}+</option>`).join('');

export function waButton(site, text, label = 'Chat on WhatsApp', cls = 'btn btn-wa', track = 'whatsapp_click') {
  return `<a class="${cls}" href="${waLink(site.whatsapp, text)}" target="_blank" rel="noopener" data-track="${track}">${icon('chat')}<span>${label}</span></a>`;
}

export function callButton(site, label = 'Call Pablo Homes', cls = 'btn btn-outline') {
  return `<a class="${cls}" href="tel:${site.phoneIntl}" data-track="call_click">${icon('phone')}<span>${label}</span></a>`;
}
