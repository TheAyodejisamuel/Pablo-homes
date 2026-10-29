// Shared helpers and vocabularies for the Pablo Homes site generator.

export const CATEGORIES = {
  land: { label: 'Land', plural: 'Land', schema: 'Place' },
  apartment: { label: 'Apartment', plural: 'Apartments', schema: 'Apartment' },
  duplex: { label: 'Duplex', plural: 'Duplexes', schema: 'SingleFamilyResidence' },
  terrace: { label: 'Terrace', plural: 'Terraces', schema: 'House' },
  commercial: { label: 'Commercial', plural: 'Commercial', schema: 'Place' },
  shortlet: { label: 'Shortlet', plural: 'Shortlets', schema: 'Apartment' },
  offplan: { label: 'Off-plan', plural: 'Off-plan', schema: 'House' },
};

export const PURPOSES = {
  sale: { label: 'For Sale', filter: 'buy' },
  rent: { label: 'For Rent', filter: 'rent' },
  shortlet: { label: 'Shortlet', filter: 'rent' },
};

// FR-04 property statuses
export const STATUSES = {
  available: { label: 'Available', tone: 'positive' },
  'for-sale': { label: 'For Sale', tone: 'positive' },
  'for-rent': { label: 'For Rent', tone: 'positive' },
  'off-plan': { label: 'Off-plan', tone: 'accent' },
  sold: { label: 'Sold', tone: 'closed' },
  rented: { label: 'Rented', tone: 'closed' },
};

export const isClosed = (p) => p.status === 'sold' || p.status === 'rented';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ngn = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });
export const naira = (n) => '₦' + ngn.format(n);

export function priceLabel(p, { short = false } = {}) {
  if (p.price == null) return 'Price on request';
  const unit = p.priceUnit ? (short ? ` /${p.priceUnit === 'year' ? 'yr' : p.priceUnit}` : ` per ${p.priceUnit}`) : '';
  return `${p.pricePrefix ? p.pricePrefix + ' ' : ''}${naira(p.price)}${unit}`;
}

export const propertySlug = (p) => `${slugify(p.title)}-${slugify(p.location.area)}-${slugify(p.id)}`;
export const propertyUrl = (p) => `/properties/${propertySlug(p)}/`;
export const locationLabel = (p) => `${p.location.area}, ${p.location.city}`;

export const dateFmt = (iso) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function waLink(phone, text) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function propertyWaText(p) {
  return `Hello Pablo Homes, I'm interested in ${p.title} (Ref: ${p.id}). Please provide more information.`;
}

// Tiny markdown subset: paragraphs, ## / ### headings, "- " lists, **bold**.
export function md(src) {
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return src
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => l.startsWith('- '))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      }
      let out = '';
      const rest = [];
      for (const l of lines) {
        if (l.startsWith('### ')) out += `<h3>${inline(l.slice(4))}</h3>`;
        else if (l.startsWith('## ')) out += `<h2>${inline(l.slice(3))}</h2>`;
        else if (l.startsWith('- ')) rest.push(`<li>${inline(l.slice(2))}</li>`);
        else out += `<p>${inline(l)}</p>`;
      }
      if (rest.length) out += `<ul>${rest.join('')}</ul>`;
      return out;
    })
    .join('\n');
}

// Deterministic PRNG so generated artwork is stable between builds.
export function seeded(str) {
  let h = 2166136261;
  for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
