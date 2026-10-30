#!/usr/bin/env node
/* =====================================================================
   PABLO HOMES — STATIC SITE BUILDER
   Usage:   node build/build.js            (outputs to ./site)
            SITE_URL=https://yourdomain node build/build.js
   No dependencies. Generates every page as real HTML (SEO-friendly URLs),
   plus assets/js/data.js for the client-side property search.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const { SITE, IMG, IMG_FALLBACK, CATEGORIES, PROPERTIES, ARTICLES, FAQS } = require('./data');

const OUT = path.join(__dirname, '..', 'site');
const YEAR = new Date().getFullYear();

/* ---------------- helpers ---------------- */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const naira = (n) => '₦' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const unitLabel = (u) => (u === 'year' ? ' / year' : u === 'night' ? ' / night' : '');
const priceText = (p) => naira(p.price) + unitLabel(p.priceUnit);
const catOf = (key) => CATEGORIES.find((c) => c.key === key);
const purposeLabel = { sale: 'For sale', rent: 'For rent', shortlet: 'Shortlet' };
const imgUrl = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=72`;
const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const waLink = (msg) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(msg)}`;
const waPropertyMsg = (p) => `Hello Pablo Homes, I'm interested in ${p.title}, ${p.area} (Ref: ${p.id}). Please provide more information.`;
const abs = (rel) => (SITE.url ? SITE.url.replace(/\/$/, '') + '/' + rel.replace(/^\//, '') : '');

function img({ id, alt, widths = [640, 1024, 1600], sizes = '100vw', cls = '', fb = 'exterior', eager = false, ratio }) {
  const w = widths[widths.length - 1];
  const srcset = widths.map((x) => `${imgUrl(id, x)} ${x}w`).join(', ');
  return `<img src="${imgUrl(id, widths[1] || w)}" srcset="${srcset}" sizes="${sizes}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''} data-fb="${fb}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${ratio ? ` width="${ratio[0]}" height="${ratio[1]}"` : ''}>`;
}

const ICON = {
  bed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18v-6.5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5V18M3 15h18M3 18v2M21 18v2M6 10V7.5A1.5 1.5 0 0 1 7.5 6h3A1.5 1.5 0 0 1 12 7.5V10M12 10V7.5A1.5 1.5 0 0 1 13.5 6h3A1.5 1.5 0 0 1 18 7.5V10"/></svg>',
  bath: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2ZM6 12V6a2 2 0 0 1 3.6-1.2M7 19l-1 2M17 19l1 2"/></svg>',
  area: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6M4 4v6M20 20h-6M20 20v-6M4 4l6 6M20 20l-6-6M14 4h6v6M10 20H4v-6"/></svg>',
  plot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7ZM9 4v13M15 7v13"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico-fill"><path d="M12 2.2A9.7 9.7 0 0 0 3.7 16.9L2.3 21.8l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.8 2c0 1.2.8 2.3 1 2.5.1.2 1.7 2.6 4.1 3.6 1.5.7 2.1.7 2.9.6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.4Z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7V3Z"/><path d="M14 3v4h4M10 12h5M10 16h5"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m4 7 8 6 8-6"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  chevL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
};

/* ---------------- layout ---------------- */
const NAV = [
  ['index.html', 'Home', 'home'],
  ['properties.html', 'Properties', 'properties'],
  ['services.html', 'Services', 'services'],
  ['investment.html', 'Investment', 'investment'],
  ['about.html', 'About', 'about'],
  ['insights.html', 'Insights', 'insights'],
  ['contact.html', 'Contact', 'contact'],
];

function layout({ file, title, desc, active = '', body, jsonld = [], ogImage = IMG.extPoolDusk, mobileBar, pageClass = '', heroOverlay = false }) {
  const root = file.includes('/') ? '../'.repeat(file.split('/').length - 1) : '';
  const fullTitle = file === 'index.html' ? `Pablo Homes | Property for sale, rent and land in Benin City` : `${title} | Pablo Homes`;
  const canonical = abs(file === 'index.html' ? '' : file);
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  const bar = mobileBar || `
    <a class="mbar-btn" href="tel:${SITE.phoneTel}" data-track="call_click">${ICON.phone}<span>Call</span></a>
    <a class="mbar-btn mbar-wa" href="${waLink('Hello Pablo Homes, I would like to make an enquiry.')}" target="_blank" rel="noopener" data-track="whatsapp_click">${ICON.wa}<span>WhatsApp</span></a>
    <a class="mbar-btn mbar-primary" href="${root}properties.html">View properties</a>`;
  return `<!DOCTYPE html>
<html lang="en-NG">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pablo Homes">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${imgUrl(ogImage, 1200, 630)}">
${canonical ? `<meta property="og:url" content="${canonical}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1F1E1B">
<link rel="icon" href="${root}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://images.unsplash.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Marcellus&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${root}assets/css/style.css">
<script>window.PH_FALLBACK=${JSON.stringify(IMG_FALLBACK)};document.documentElement.classList.add('js');
document.addEventListener('error',function(e){var t=e.target;if(!t||t.tagName!=='IMG'||!t.dataset.fb)return;var c=window.PH_FALLBACK[t.dataset.fb]||window.PH_FALLBACK.exterior;var i=+(t.dataset.fbi||0);t.removeAttribute('srcset');while(i<c.length&&t.src.indexOf(c[i])>-1)i++;if(i<c.length){t.dataset.fbi=i+1;t.src='https://images.unsplash.com/photo-'+c[i]+'?auto=format&fit=crop&w=1200&q=72';}else{t.classList.add('img-failed');t.parentNode&&t.parentNode.classList.add('img-failed-wrap');}},true);</script>
${ld}
</head>
<body class="${pageClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header${heroOverlay ? ' over-hero' : ''}" data-header>
  <div class="wrap header-inner">
    <a class="wordmark" href="${root}index.html" aria-label="Pablo Homes, home">PABLO<span>HOMES</span></a>
    <nav class="nav" id="site-nav" aria-label="Main">
      <ul>
        ${NAV.map(([href, label, key]) => `<li><a href="${root}${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n        ')}
      </ul>
      <a class="btn btn-solid nav-cta" href="${root}properties.html">View properties</a>
    </nav>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>${ICON.menu}<span class="sr">Menu</span></button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <a class="wordmark wordmark-light" href="${root}index.html">PABLO<span>HOMES</span></a>
      <p>Property sales, rentals and land in Benin City, Edo State.</p>
    </div>
    <div>
      <h2 class="footer-h">Explore</h2>
      <ul>
        <li><a href="${root}properties.html">All properties</a></li>
        <li><a href="${root}properties.html?purpose=sale">Buy</a></li>
        <li><a href="${root}properties.html?purpose=rent">Rent</a></li>
        <li><a href="${root}investment.html">Investment</a></li>
        <li><a href="${root}book-inspection.html">Book an inspection</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">Company</h2>
      <ul>
        <li><a href="${root}about.html">About</a></li>
        <li><a href="${root}services.html">Services</a></li>
        <li><a href="${root}insights.html">Insights</a></li>
        <li><a href="${root}faq.html">FAQ</a></li>
        <li><a href="${root}contact.html">Contact</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">Talk to us</h2>
      <ul class="footer-contact">
        <li><a href="tel:${SITE.phoneTel}" data-track="call_click">${ICON.phone}${SITE.phoneDisplay}</a></li>
        <li><a href="${waLink('Hello Pablo Homes, I would like to make an enquiry.')}" target="_blank" rel="noopener" data-track="whatsapp_click">${ICON.wa}WhatsApp</a></li>
        <li><a href="mailto:${SITE.email}" data-track="email_click">${ICON.mail}<span class="break">${SITE.email}</span></a></li>
        <li>${ICON.pin}Benin City, Edo State</li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-base">
    <p>&copy; ${YEAR} Pablo Homes. All rights reserved.</p>
    <p>Listings marked “Sample listing” are demonstration content with stock photography.</p>
  </div>
</footer>
<a class="wa-float" href="${waLink('Hello Pablo Homes, I would like to make an enquiry.')}" target="_blank" rel="noopener" aria-label="Chat with Pablo Homes on WhatsApp" data-track="whatsapp_click">${ICON.wa}</a>
<nav class="mbar" aria-label="Quick contact">${bar}</nav>
<script>window.PH_SITE=${JSON.stringify({ whatsapp: SITE.whatsapp, phone: SITE.phoneTel, phoneDisplay: SITE.phoneDisplay, email: SITE.email, enquiryEndpoint: SITE.enquiryEndpoint, root })};</script>
<script src="${root}assets/js/api.js" defer></script>
<script src="${root}assets/js/main.js" defer></script>
${pageClass.includes('page-properties') || pageClass.includes('page-home') || pageClass.includes('page-book') ? `<script src="${root}assets/js/data.js" defer></script><script src="${root}assets/js/listings.js" defer></script>` : ''}
</body>
</html>`;
}

/* ---------------- components ---------------- */
function specs(p) {
  const out = [];
  if (p.bedrooms) out.push(`<li>${ICON.bed}<span>${p.bedrooms} bed${p.bedrooms > 1 ? 's' : ''}</span></li>`);
  if (p.bathrooms) out.push(`<li>${ICON.bath}<span>${p.bathrooms} bath${p.bathrooms > 1 ? 's' : ''}</span></li>`);
  if (p.size) out.push(`<li>${ICON.area}<span>${p.size} m²</span></li>`);
  else if (p.landSize) out.push(`<li>${ICON.plot}<span>${esc(p.landSize.split(' (')[0])}</span></li>`);
  return out.join('');
}
const statusClass = (s) => 'st-' + s.toLowerCase().replace(/[^a-z]+/g, '-');

function card(p, root = '', { sizes = '(min-width: 1100px) 33vw, (min-width: 700px) 50vw, 100vw' } = {}) {
  const closed = p.status === 'Sold' || p.status === 'Rented';
  return `<article class="card${closed ? ' is-closed' : ''}">
  <a class="card-link" href="${root}properties/${p.slug}.html" aria-label="${esc(p.title)}, ${esc(p.area)}, ${esc(priceText(p))}">
    <div class="card-media ratio-43">
      ${img({ id: p.images[0], alt: `${p.title} in ${p.area}, Benin City (sample photo)`, widths: [480, 800], sizes, fb: p.fb })}
      <span class="tag ${statusClass(p.status)}">${p.status}</span>
      <span class="tag tag-sample">Sample listing</span>
    </div>
    <div class="card-body">
      <p class="card-price">${priceText(p)}</p>
      <h3 class="card-title">${esc(p.title)}</h3>
      <p class="card-loc">${ICON.pin}${esc(p.area)}, Benin City</p>
      <ul class="specs">${specs(p)}</ul>
      <p class="card-foot"><span>${catOf(p.category).label}</span><span class="card-cta">View details</span></p>
    </div>
  </a>
</article>`;
}

function pageHead({ title, lead, crumbs, image, fb = 'exterior', alt }) {
  const crumbHtml = crumbs ? `<nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map(([h, l], i) => (i === crumbs.length - 1 ? `<li aria-current="page">${esc(l)}</li>` : `<li><a href="${h}">${esc(l)}</a></li>`)).join('')}</ol></nav>` : '';
  if (image) {
    return `<section class="page-hero">
  <div class="page-hero-media">${img({ id: image, alt: alt || '', fb, eager: true, widths: [800, 1400, 2000] })}</div>
  <div class="wrap page-hero-inner">${crumbHtml}<h1>${esc(title)}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div>
</section>`;
  }
  return `<section class="page-head"><div class="wrap">${crumbHtml}<h1>${esc(title)}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div></section>`;
}

function inspectionFields({ prefix, selectedId, hideProperty = false }) {
  const avail = PROPERTIES.filter((p) => p.status !== 'Sold' && p.status !== 'Rented');
  const sel = PROPERTIES.find((p) => p.id === selectedId);
  const propField = hideProperty && sel
    ? `<input type="hidden" name="property" value="${esc(sel.id)} – ${esc(sel.title)}, ${esc(sel.area)}"><div class="field field-full"><span class="label">Property</span><p class="fixed-value">${esc(sel.title)}, ${esc(sel.area)} <span class="muted">(${sel.id})</span></p></div>`
    : `<div class="field field-full"><label for="${prefix}-property">Property</label>
        <select id="${prefix}-property" name="property" required data-property-select>
          <option value="">Choose a property</option>
          ${avail.map((p) => `<option value="${esc(p.id)} – ${esc(p.title)}, ${esc(p.area)}"${p.id === selectedId ? ' selected' : ''} data-id="${p.id}">${esc(p.title)}, ${esc(p.area)} (${p.id})</option>`).join('')}
          <option value="Not sure yet – please advise">Not sure yet, please advise</option>
        </select></div>`;
  return `
    ${propField}
    <div class="field"><label for="${prefix}-name">Full name</label><input id="${prefix}-name" name="name" autocomplete="name" required></div>
    <div class="field"><label for="${prefix}-phone">Phone number</label><input id="${prefix}-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required pattern="[+0-9 ()-]{7,20}"></div>
    <div class="field"><label for="${prefix}-wa">WhatsApp number <span class="opt">optional</span></label><input id="${prefix}-wa" name="whatsapp" type="tel" inputmode="tel" pattern="[+0-9 ()-]{7,20}"><label class="check"><input type="checkbox" data-same-as-phone> Same as phone</label></div>
    <div class="field"><label for="${prefix}-email">Email <span class="opt">optional</span></label><input id="${prefix}-email" name="email" type="email" autocomplete="email"></div>
    <div class="field"><label for="${prefix}-date">Preferred date</label><input id="${prefix}-date" name="date" type="date" required data-min-today></div>
    <div class="field"><label for="${prefix}-time">Preferred time</label>
      <select id="${prefix}-time" name="time" required>
        <option value="">Choose a time</option>
        <option>Morning (9am–12pm)</option>
        <option>Afternoon (12pm–3pm)</option>
        <option>Late afternoon (3pm–5pm)</option>
        <option>Video inspection (I’m outside Benin City)</option>
      </select></div>
    <div class="field field-full"><label for="${prefix}-msg">Message <span class="opt">optional</span></label><textarea id="${prefix}-msg" name="message" rows="3" placeholder="Anything we should know before the visit?"></textarea></div>
    <div class="hp" aria-hidden="true"><label>Company<input name="company" tabindex="-1" autocomplete="off"></label></div>`;
}

function formShell({ type, inner, submit, note, source }) {
  return `<form class="form" data-enquiry="${type}" data-source="${source}" novalidate>
  <div class="form-grid">${inner}</div>
  ${note ? `<p class="form-note">${note}</p>` : ''}
  <p class="form-error" role="alert" hidden></p>
  <button class="btn btn-solid btn-block" type="submit">${submit}</button>
</form>
<div class="form-done" hidden tabindex="-1">
  <h3 class="form-done-h"></h3>
  <p class="form-done-p"></p>
  <div class="form-done-actions"></div>
</div>`;
}

const INSPECTION_NOTE = 'This is a request. Pablo Homes will contact you to confirm the date and time before the inspection.';

function ctaBand(root) {
  return `<section class="cta-band">
  <div class="cta-media">${img({ id: IMG.extPoolDusk, alt: 'Modern home at dusk with lights on', fb: 'exterior', widths: [800, 1400, 2000] })}</div>
  <div class="wrap cta-inner">
    <h2>Seen something you like?</h2>
    <p>Book an inspection, or ask us anything on WhatsApp. We reply with real answers about the property, not a sales script.</p>
    <div class="btn-row">
      <a class="btn btn-light" href="${root}book-inspection.html">Book an inspection</a>
      <a class="btn btn-ghost-light" href="${waLink('Hello Pablo Homes, I would like to make an enquiry.')}" target="_blank" rel="noopener" data-track="whatsapp_click">${ICON.wa}Chat on WhatsApp</a>
    </div>
  </div>
</section>`;
}

/* ---------------- pages ---------------- */
const pages = {};
const locations = [...new Set(PROPERTIES.map((p) => p.area))].sort();
const priceSteps = [500000, 1000000, 3000000, 5000000, 10000000, 25000000, 50000000, 100000000, 200000000, 300000000];
const priceOptions = (label) => `<option value="">${label}</option>` + priceSteps.map((v) => `<option value="${v}">${naira(v).replace(',000,000', 'M').replace(',000', 'k')}</option>`).join('');

/* HOME */
(function home() {
  const featured = PROPERTIES.filter((p) => p.featured).slice(0, 6);
  const recent = [...PROPERTIES].filter((p) => !['Sold', 'Rented'].includes(p.status)).sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 4);
  const body = `
<section class="hero">
  <div class="hero-media">${img({ id: IMG.extLuxPool, alt: 'Modern two-storey home with a pool and landscaped garden', fb: 'exterior', eager: true, widths: [800, 1400, 2200] })}</div>
  <div class="wrap hero-inner">
    <div class="hero-copy">
      <h1>Find your place in Benin City.</h1>
      <p>Homes for sale and rent, and land to build on, across Benin City, with clear details on every listing and a direct line to Pablo Homes.</p>
      <div class="btn-row">
        <a class="btn btn-light" href="properties.html">View properties</a>
        <a class="btn btn-ghost-light" href="book-inspection.html">Book an inspection</a>
      </div>
    </div>
  </div>
  <div class="wrap hero-search-wrap">
    <form class="search" action="properties.html" method="get" role="search" aria-label="Search properties" data-search>
      <fieldset class="search-toggle">
        <legend class="sr">Buy or rent</legend>
        <label><input type="radio" name="purpose" value="sale" checked><span>Buy</span></label>
        <label><input type="radio" name="purpose" value="rent"><span>Rent</span></label>
        <label><input type="radio" name="purpose" value="shortlet"><span>Shortlet</span></label>
      </fieldset>
      <div class="search-fields">
        <div class="sf"><label for="s-loc">Location</label><select id="s-loc" name="location"><option value="">All of Benin City</option>${locations.map((l) => `<option>${esc(l)}</option>`).join('')}</select></div>
        <div class="sf"><label for="s-type">Property type</label><select id="s-type" name="type"><option value="">Any type</option>${CATEGORIES.map((c) => `<option value="${c.key}">${c.plural}</option>`).join('')}</select></div>
        <div class="sf"><label for="s-min">Min price</label><select id="s-min" name="min">${priceOptions('No min')}</select></div>
        <div class="sf"><label for="s-max">Max price</label><select id="s-max" name="max">${priceOptions('No max')}</select></div>
        <div class="sf"><label for="s-beds">Bedrooms</label><select id="s-beds" name="beds"><option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option><option value="5">5+</option></select></div>
        <button class="btn btn-solid search-go" type="submit">Search</button>
      </div>
    </form>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head">
      <div><h2>Featured properties</h2><p class="sec-lead">A selection of homes, land and investment opportunities currently listed with us.</p></div>
      <a class="link-quiet" href="properties.html">View all properties</a>
    </div>
    <div class="grid-cards">${featured.map((p) => card(p)).join('\n')}</div>
  </div>
</section>

<section class="section section-ivory">
  <div class="wrap">
    <div class="sec-head"><div><h2>Browse by property type</h2></div></div>
    <ul class="types">
      ${CATEGORIES.map((c, i) => `<li class="type type-${i}"><a href="properties.html?type=${c.key}">
        ${img({ id: c.img, alt: '', widths: [480, 900], sizes: '(min-width: 900px) 30vw, 50vw', fb: c.fb })}
        <span class="type-text"><span class="type-name">${c.plural}</span><span class="type-blurb">${c.blurb}</span></span>
      </a></li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head"><div><h2>What we do</h2><p class="sec-lead">Three services, done carefully.</p></div><a class="link-quiet" href="services.html">About our services</a></div>
    <div class="services">
      ${[
        ['Property sales', 'Duplexes, terraces, apartments and commercial buildings for buyers who want clear information and a straightforward process.', 'properties.html?purpose=sale', 'Browse homes for sale', IMG.extLawn, 'exterior', 'Detached modern home with a lawn'],
        ['Property rentals', 'Apartments, homes, offices and furnished shortlets, with the full cost of moving in made clear up front.', 'properties.html?purpose=rent', 'Browse homes for rent', IMG.livBright, 'interior', 'Bright living room with neutral furniture'],
        ['Land sales', 'Residential plots in growing parts of Benin City, with survey details and documents available for your lawyer to check.', 'properties.html?type=land', 'View available land', IMG.landSunset, 'land', 'Open land at sunset'],
      ].map(([h, t, href, cta, im, fb, alt]) => `<article class="service">
        <div class="service-media ratio-54">${img({ id: im, alt, widths: [480, 900], sizes: '(min-width: 900px) 33vw, 100vw', fb })}</div>
        <h3>${h}</h3><p>${t}</p><a class="link-arrow" href="${href}">${cta}</a>
      </article>`).join('')}
    </div>
  </div>
</section>

<section class="section section-ink">
  <div class="wrap why">
    <div class="why-intro">
      <h2>Why people come to Pablo Homes</h2>
      <p>We focus on Benin City, and on making each step from first search to inspection easy to follow.</p>
      <a class="btn btn-light" href="about.html">About Pablo Homes</a>
    </div>
    <dl class="why-list">
      <div><dt>Clear property information</dt><dd>Price, size, rooms, location and status on every listing, so you can shortlist before you travel.</dd></div>
      <div><dt>Easy property discovery</dt><dd>Search by area, type, budget and bedrooms, and share the results with family.</dd></div>
      <div><dt>Direct enquiry</dt><dd>Reach us on WhatsApp or by phone from any property page, with the property reference already included.</dd></div>
      <div><dt>Inspection booking</dt><dd>Pick a date and time online. We confirm the appointment with you directly.</dd></div>
      <div><dt>Local market focus</dt><dd>Our attention is on Benin City neighbourhoods, from GRA and Ugbor to Oluku and Sapele Road.</dd></div>
    </dl>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head"><div><h2>Recently added</h2></div><a class="link-quiet" href="properties.html?sort=newest">See newest listings</a></div>
    <ul class="recent">
      ${recent.map((p) => `<li><a href="properties/${p.slug}.html">
        <span class="recent-media ratio-11">${img({ id: p.images[0], alt: '', widths: [240, 400], sizes: '120px', fb: p.fb })}</span>
        <span class="recent-text"><span class="recent-title">${esc(p.title)}</span><span class="recent-meta">${esc(p.area)}</span><span class="recent-price">${priceText(p)}</span></span>
      </a></li>`).join('')}
    </ul>
  </div>
</section>

<section class="invest-band">
  <div class="invest-media">${img({ id: IMG.extEstate, alt: 'Contemporary residential development', fb: 'exterior', widths: [800, 1400, 2000] })}</div>
  <div class="wrap invest-inner">
    <div class="invest-card">
      <h2>Property opportunities in Benin City</h2>
      <p>For investors and Nigerians abroad: land, off-plan homes with payment plans, and commercial property, with the details you need to make your own decision.</p>
      <a class="btn btn-solid" href="investment.html">Explore investment</a>
    </div>
  </div>
</section>

${ctaBand('')}`;
  pages['index.html'] = layout({
    file: 'index.html', title: 'Home', active: 'home', pageClass: 'page-home', heroOverlay: true,
    desc: 'Find homes for sale, homes for rent, shortlets and land in Benin City, Edo State. Browse listings, book an inspection or chat with Pablo Homes on WhatsApp.',
    body,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: 'Pablo Homes', telephone: SITE.phoneTel, email: SITE.email, areaServed: 'Benin City, Edo State, Nigeria', address: { '@type': 'PostalAddress', addressLocality: 'Benin City', addressRegion: 'Edo State', addressCountry: 'NG' }, ...(SITE.url ? { url: SITE.url } : {}) }],
  });
})();

/* PROPERTIES LIST */
(function list() {
  const body = `
${pageHead({ title: 'Properties in Benin City', lead: 'Search homes for sale and rent, shortlets, commercial property and land.', crumbs: [['index.html', 'Home'], ['', 'Properties']] })}
<section class="section section-tight">
  <div class="wrap listing-layout">
    <aside class="filters" id="filters" aria-label="Filter properties">
      <form data-filters>
        <div class="filters-head"><h2>Filter</h2><button type="reset" class="link-quiet" data-reset>Clear all</button></div>
        <fieldset class="seg">
          <legend>Looking to</legend>
          <div class="seg-opts">
          <label><input type="radio" name="purpose" value="" checked><span>All</span></label>
          <label><input type="radio" name="purpose" value="sale"><span>Buy</span></label>
          <label><input type="radio" name="purpose" value="rent"><span>Rent</span></label>
          <label><input type="radio" name="purpose" value="shortlet"><span>Shortlet</span></label>
          </div>
        </fieldset>
        <div class="field"><label for="f-loc">Location</label><select id="f-loc" name="location"><option value="">All of Benin City</option>${locations.map((l) => `<option>${esc(l)}</option>`).join('')}</select></div>
        <div class="field"><label for="f-type">Property type</label><select id="f-type" name="type"><option value="">Any type</option>${CATEGORIES.map((c) => `<option value="${c.key}">${c.plural}</option>`).join('')}</select></div>
        <div class="field-pair">
          <div class="field"><label for="f-min">Min price</label><select id="f-min" name="min">${priceOptions('No min')}</select></div>
          <div class="field"><label for="f-max">Max price</label><select id="f-max" name="max">${priceOptions('No max')}</select></div>
        </div>
        <div class="field-pair">
          <div class="field"><label for="f-beds">Bedrooms</label><select id="f-beds" name="beds"><option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option><option value="5">5+</option></select></div>
          <div class="field"><label for="f-baths">Bathrooms</label><select id="f-baths" name="baths"><option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></div>
        </div>
        <div class="field"><label for="f-status">Status</label><select id="f-status" name="status"><option value="">Any status</option><option value="open">Available now (hide sold &amp; rented)</option>${['Available', 'For Sale', 'For Rent', 'Off-plan', 'Sold', 'Rented'].map((s) => `<option>${s}</option>`).join('')}</select></div>
        <button class="btn btn-solid btn-block filters-apply" type="button" data-close-filters>Show results</button>
      </form>
    </aside>
    <div class="results">
      <div class="results-bar">
        <p class="results-count" aria-live="polite" data-count>${PROPERTIES.length} properties</p>
        <div class="results-tools">
          <button class="btn btn-outline btn-sm filters-open" type="button" data-open-filters aria-controls="filters" aria-expanded="false">${ICON.filter}Filters</button>
          <label class="sort"><span>Sort</span><select name="sort" data-sort>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select></label>
        </div>
      </div>
      <p class="active-filters" data-active hidden></p>
      <div class="grid-cards grid-cards-2" data-results>${[...PROPERTIES].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).map((p) => card(p, '', { sizes: '(min-width: 1100px) 30vw, (min-width: 700px) 50vw, 100vw' })).join('\n')}</div>
      <div class="empty" data-empty hidden>
        <h2>No properties match those filters</h2>
        <p>Try a wider price range or another area. Or tell us what you’re looking for and we’ll let you know when something suitable comes up.</p>
        <div class="btn-row"><button class="btn btn-outline" type="button" data-reset-btn>Clear filters</button><a class="btn btn-solid" href="${waLink('Hello Pablo Homes, I am looking for a property in Benin City. ')}" target="_blank" rel="noopener" data-track="whatsapp_click">${ICON.wa}Tell us on WhatsApp</a></div>
      </div>
    </div>
  </div>
</section>`;
  pages['properties.html'] = layout({ file: 'properties.html', title: 'Properties for sale and rent in Benin City', active: 'properties', pageClass: 'page-properties', desc: 'Search property in Benin City by location, type, price, bedrooms and status: duplexes, apartments, terraces, land, shortlets, off-plan and commercial property.', body });
})();

/* PROPERTY DETAIL PAGES */
PROPERTIES.forEach((p) => {
  const file = `properties/${p.slug}.html`;
  const root = '../';
  const cat = catOf(p.category);
  const closed = p.status === 'Sold' || p.status === 'Rented';
  const mapQ = encodeURIComponent(`${p.area}, Benin City, Edo State, Nigeria`);
  const similar = PROPERTIES.filter((x) => x.id !== p.id && !['Sold', 'Rented'].includes(x.status))
    .map((x) => ({ x, s: (x.category === p.category ? 3 : 0) + (x.purpose === p.purpose ? 2 : 0) + (x.area === p.area ? 1 : 0) }))
    .sort((a, b) => b.s - a.s).slice(0, 3).map((o) => o.x);
  const facts = [
    ['Reference', p.id],
    ['Status', p.status],
    ['Type', cat.label],
    ['Listing', purposeLabel[p.purpose]],
    p.bedrooms && ['Bedrooms', p.bedrooms],
    p.bathrooms && ['Bathrooms', p.bathrooms],
    p.size && ['Property size', `${p.size} m²`],
    p.landSize && ['Land size', p.landSize],
    ['Location', `${p.area}, Benin City`],
    ['Listed', fmtDate(p.dateAdded)],
  ].filter(Boolean);
  const gallery = p.images.map((id, i) => ({ id, alt: `${p.title}, ${p.area}: sample photo ${i + 1} of ${p.images.length}` }));
  const shareUrl = abs(file);
  const waMsg = waPropertyMsg(p);
  const mobileBar = `
    <a class="mbar-btn" href="tel:${SITE.phoneTel}" data-track="call_click" data-property="${p.id}">${ICON.phone}<span>Call</span></a>
    <a class="mbar-btn mbar-wa" href="${waLink(waMsg)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-property="${p.id}">${ICON.wa}<span>WhatsApp</span></a>
    ${closed ? `<a class="mbar-btn mbar-primary" href="${root}properties.html?type=${p.category}">Similar homes</a>` : `<button class="mbar-btn mbar-primary" type="button" data-open-dialog="dlg-inspect">Book inspection</button>`}`;

  const body = `
<div class="sample-bar"><div class="wrap"><strong>Sample listing.</strong> This is demonstration content. Photos are stock images, not the actual property.</div></div>
<section class="pd-top">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${root}index.html">Home</a></li><li><a href="${root}properties.html">Properties</a></li><li><a href="${root}properties.html?type=${p.category}">${cat.plural}</a></li><li aria-current="page">${esc(p.title)}</li></ol></nav>
    <div class="pd-head">
      <div>
        <p class="pd-tags"><span class="tag tag-inline ${statusClass(p.status)}">${p.status}</span><span class="pd-ref">Ref ${p.id}</span></p>
        <h1>${esc(p.title)}</h1>
        <p class="pd-loc">${ICON.pin}${esc(p.area)}, Benin City, Edo State</p>
      </div>
      <div class="pd-price"><p class="pd-price-val">${priceText(p)}</p>${p.paymentPlan ? '<p class="pd-price-note">Payment plan available</p>' : ''}</div>
    </div>
  </div>
  <div class="wrap">
    <div class="gallery g-${Math.min(gallery.length, 5)}" data-gallery>
      ${gallery.slice(0, 5).map((g, i) => `<button type="button" class="g-item" data-index="${i}" aria-label="Open photo ${i + 1} of ${gallery.length}">${img({ id: g.id, alt: g.alt, widths: i === 0 ? [800, 1400] : [480, 800], sizes: i === 0 ? '(min-width: 900px) 60vw, 100vw' : '(min-width: 900px) 20vw, 50vw', fb: i === 0 ? p.fb : (p.fb === 'land' ? 'land' : 'interior'), eager: i === 0 })}</button>`).join('')}
      <span class="g-count">${gallery.length} photos</span>
    </div>
  </div>
</section>

<section class="section section-tight">
  <div class="wrap pd-layout">
    <div class="pd-main">
      <ul class="pd-keys">
        ${p.bedrooms ? `<li>${ICON.bed}<span><strong>${p.bedrooms}</strong> bedrooms</span></li>` : ''}
        ${p.bathrooms ? `<li>${ICON.bath}<span><strong>${p.bathrooms}</strong> bathrooms</span></li>` : ''}
        ${p.size ? `<li>${ICON.area}<span><strong>${p.size} m²</strong> floor area</span></li>` : ''}
        ${p.landSize ? `<li>${ICON.plot}<span><strong>${esc(p.landSize.split(' (')[0])}</strong> land</span></li>` : ''}
      </ul>

      <div class="pd-block prose">
        <h2>About this property</h2>
        ${p.description.map((d) => `<p>${esc(d)}</p>`).join('\n        ')}
      </div>

      ${p.paymentPlan ? `<div class="pd-block pd-plan"><h2>Payment plan</h2><p>${esc(p.paymentPlan)}</p></div>` : ''}

      <div class="pd-block">
        <h2>Features and amenities</h2>
        <ul class="amenities">${p.amenities.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      </div>

      <div class="pd-block">
        <h2>Property details</h2>
        <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      </div>

      <div class="pd-block">
        <h2>Video tour</h2>
        ${p.video ? `<div class="video ratio-169"><iframe src="${esc(p.video)}" title="Video tour of ${esc(p.title)}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
          : `<div class="video-ask"><p>A video walkthrough of this property can be arranged on request, live or recorded. Useful if you’re outside Benin City.</p><a class="btn btn-outline btn-sm" href="${waLink(`Hello Pablo Homes, could I get a video walkthrough of ${p.title}, ${p.area} (Ref: ${p.id})?`)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-property="${p.id}">${ICON.wa}Request a video tour</a></div>`}
      </div>

      <div class="pd-block">
        <h2>Location</h2>
        <p class="muted">${esc(p.area)}, Benin City. The map shows the general area; the exact address is shared when your inspection is confirmed.</p>
        <div class="map ratio-169" data-map data-src="https://maps.google.com/maps?q=${mapQ}&z=14&output=embed">
          <button type="button" class="btn btn-outline map-load" data-load-map>${ICON.pin}Show map of ${esc(p.area)}</button>
        </div>
      </div>
    </div>

    <aside class="pd-side">
      <div class="enquire">
        <p class="enquire-price">${priceText(p)}</p>
        <p class="enquire-sub">${esc(p.title)}, ${esc(p.area)}</p>
        ${closed ? `<p class="enquire-closed">This property has been ${p.status.toLowerCase()}. Ask us about similar ${cat.plural.toLowerCase()}.</p>` : `<button class="btn btn-solid btn-block" type="button" data-open-dialog="dlg-inspect">${ICON.calendar}Book an inspection</button>`}
        <a class="btn btn-wa btn-block" href="${waLink(waMsg)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-property="${p.id}">${ICON.wa}Chat on WhatsApp</a>
        <a class="btn btn-outline btn-block" href="tel:${SITE.phoneTel}" data-track="call_click" data-property="${p.id}">${ICON.phone}Call ${SITE.phoneDisplay}</a>
        <button class="btn btn-outline btn-block" type="button" data-open-dialog="dlg-details">${ICON.doc}Request property details</button>
        <div class="share">
          <span>Share</span>
          <a href="https://wa.me/?text=${encodeURIComponent(p.title + ', ' + p.area + ' - Pablo Homes ')}" data-share="whatsapp" target="_blank" rel="noopener" aria-label="Share on WhatsApp">${ICON.wa}</a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=" data-share="facebook" target="_blank" rel="noopener" aria-label="Share on Facebook"><svg viewBox="0 0 24 24" aria-hidden="true" class="ico-fill"><path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a21 21 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3Z"/></svg></a>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(p.title + ', ' + p.area + ' - Pablo Homes')}" data-share="x" target="_blank" rel="noopener" aria-label="Share on X"><svg viewBox="0 0 24 24" aria-hidden="true" class="ico-fill"><path d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.2l-4.9-6.3L5.4 21H2.3l7.2-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"/></svg></a>
          <button type="button" data-copy-link aria-label="Copy link">${ICON.share}</button>
        </div>
      </div>
    </aside>
  </div>
</section>

<section class="section section-ivory">
  <div class="wrap">
    <div class="sec-head"><div><h2>Similar properties</h2></div><a class="link-quiet" href="${root}properties.html?type=${p.category}">More ${cat.plural.toLowerCase()}</a></div>
    <div class="grid-cards">${similar.map((x) => card(x, root)).join('\n')}</div>
  </div>
</section>

<dialog class="dlg" id="dlg-inspect" aria-labelledby="dlg-inspect-h">
  <div class="dlg-inner">
    <button class="dlg-close" type="button" data-close-dialog aria-label="Close">${ICON.close}</button>
    <h2 id="dlg-inspect-h">Book an inspection</h2>
    <p class="dlg-sub">${esc(p.title)}, ${esc(p.area)} <span class="muted">(${p.id})</span></p>
    ${formShell({ type: 'inspection', source: 'property-page', submit: 'Send inspection request', note: INSPECTION_NOTE, inner: inspectionFields({ prefix: 'pi', selectedId: p.id, hideProperty: true }) })}
  </div>
</dialog>

<dialog class="dlg" id="dlg-details" aria-labelledby="dlg-details-h">
  <div class="dlg-inner">
    <button class="dlg-close" type="button" data-close-dialog aria-label="Close">${ICON.close}</button>
    <h2 id="dlg-details-h">Request property details</h2>
    <p class="dlg-sub">${esc(p.title)}, ${esc(p.area)} <span class="muted">(${p.id})</span></p>
    ${formShell({ type: 'details', source: 'property-page', submit: 'Request details', inner: `
      <input type="hidden" name="property" value="${esc(p.id)} – ${esc(p.title)}, ${esc(p.area)}">
      <div class="field"><label for="pd-name">Full name</label><input id="pd-name" name="name" autocomplete="name" required></div>
      <div class="field"><label for="pd-phone">Phone or WhatsApp</label><input id="pd-phone" name="phone" type="tel" inputmode="tel" required pattern="[+0-9 ()-]{7,20}"></div>
      <div class="field field-full"><label for="pd-email">Email <span class="opt">optional</span></label><input id="pd-email" name="email" type="email" autocomplete="email"></div>
      <fieldset class="field field-full chips"><legend>What would you like?</legend>
        <label><input type="checkbox" name="wants" value="More photos"> More photos</label>
        <label><input type="checkbox" name="wants" value="Video tour"> Video tour</label>
        <label><input type="checkbox" name="wants" value="Document copies"> Document copies</label>
        <label><input type="checkbox" name="wants" value="Payment terms"> Payment terms</label>
      </fieldset>
      <div class="field field-full"><label for="pd-msg">Message <span class="opt">optional</span></label><textarea id="pd-msg" name="message" rows="3"></textarea></div>
      <div class="hp" aria-hidden="true"><label>Company<input name="company" tabindex="-1" autocomplete="off"></label></div>` })}
  </div>
</dialog>

<div class="lightbox" data-lightbox hidden role="dialog" aria-modal="true" aria-label="Photo gallery">
  <button class="lb-close" type="button" data-lb-close aria-label="Close gallery">${ICON.close}</button>
  <button class="lb-nav lb-prev" type="button" data-lb-prev aria-label="Previous photo">${ICON.chevL}</button>
  <figure class="lb-fig"><img alt="" data-lb-img data-fb="${p.fb}"><figcaption data-lb-cap></figcaption></figure>
  <button class="lb-nav lb-next" type="button" data-lb-next aria-label="Next photo">${ICON.chevR}</button>
</div>
<script>window.PH_GALLERY=${JSON.stringify(gallery.map((g) => ({ src: imgUrl(g.id, 1800), alt: g.alt })))};</script>`;

  const offerType = p.purpose === 'sale' ? 'SellAction' : 'RentAction';
  pages[file] = layout({
    file, title: `${p.title} ${purposeLabel[p.purpose].toLowerCase()} in ${p.area}, Benin City`, active: 'properties', pageClass: 'page-detail', ogImage: p.images[0], mobileBar,
    desc: `${p.title} ${purposeLabel[p.purpose].toLowerCase()} in ${p.area}, Benin City. ${priceText(p)}. ${p.summary}`,
    body,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'RealEstateListing', name: `${p.title}, ${p.area}`, description: p.summary, datePosted: p.dateAdded, image: p.images.map((i) => imgUrl(i, 1200)), ...(shareUrl ? { url: shareUrl } : {}),
        offers: { '@type': 'Offer', price: p.price, priceCurrency: 'NGN', availability: closed ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', businessFunction: offerType === 'SellAction' ? 'http://purl.org/goodrelations/v1#Sell' : 'http://purl.org/goodrelations/v1#LeaseOut' },
        contentLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: `${p.area}, Benin City`, addressRegion: 'Edo State', addressCountry: 'NG' } } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Home', ''], ['Properties', 'properties.html'], [p.title, file]].map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, ...(SITE.url ? { item: abs(u) } : {}) })) },
    ],
  });
});

/* SERVICES */
(function services() {
  const rows = [
    ['Property sales', 'For buyers looking for a home or a long-term asset in Benin City.', ['Duplexes, terraces and apartments', 'Commercial buildings', 'Off-plan homes with payment plans', 'Inspections in person or by video', 'Document copies shared for your lawyer to verify'], 'properties.html?purpose=sale', 'Browse properties for sale', IMG.extContemporary, 'exterior', 'Contemporary family home'],
    ['Property rentals', 'For individuals, families and businesses looking to rent, short or long term.', ['Apartments and family homes', 'Offices and shops', 'Furnished shortlets by the night', 'The full move-in cost confirmed before you commit', 'Inspections at a time that suits you'], 'properties.html?purpose=rent', 'Browse properties for rent', IMG.livNeutral, 'interior', 'Calm, modern living room'],
    ['Land sales', 'For people who want to build, or hold land in growing parts of the city.', ['Residential plots across Benin City', 'Land size and access shown on every listing', 'Survey details on request', 'Payment plans on selected plots', 'Site visits arranged on request'], 'properties.html?type=land', 'View available land', IMG.landField, 'land', 'Open green land'],
  ];
  const body = `
${pageHead({ title: 'Services', lead: 'Pablo Homes helps people buy, rent and find land in Benin City.', crumbs: [['index.html', 'Home'], ['', 'Services']], image: IMG.extLawn, alt: 'Modern home with a lawn' })}
<section class="section">
  <div class="wrap svc-rows">
    ${rows.map(([h, intro, list, href, cta, im, fb, alt], i) => `<article class="svc-row${i % 2 ? ' flip' : ''}">
      <div class="svc-media ratio-43">${img({ id: im, alt, widths: [640, 1100], sizes: '(min-width: 900px) 50vw, 100vw', fb })}</div>
      <div class="svc-text">
        <h2>${h}</h2>
        <p class="lead-sm">${intro}</p>
        <ul class="ticks">${list.map((l) => `<li>${l}</li>`).join('')}</ul>
        <a class="btn btn-solid" href="${href}">${cta}</a>
      </div>
    </article>`).join('\n    ')}
  </div>
</section>
${ctaBand('')}`;
  pages['services.html'] = layout({ file: 'services.html', title: 'Services: property sales, rentals and land', active: 'services', desc: 'Pablo Homes offers property sales, property rentals and land sales in Benin City, Edo State.', body });
})();

/* INVESTMENT */
(function investment() {
  const inv = PROPERTIES.filter((p) => p.investment && !['Sold', 'Rented'].includes(p.status));
  const offplan = PROPERTIES.filter((p) => p.category === 'offplan');
  const land = PROPERTIES.filter((p) => p.category === 'land' && !['Sold'].includes(p.status));
  const body = `
${pageHead({ title: 'Property investment in Benin City', lead: 'Land, off-plan homes and commercial property, with the information you need to make your own decision.', crumbs: [['index.html', 'Home'], ['', 'Investment']], image: IMG.cityWide, fb: 'city', alt: 'City skyline at dusk' })}
<section class="section">
  <div class="wrap two-col">
    <div class="prose">
      <h2>A considered approach to property</h2>
      <p>Benin City is the capital of Edo State and one of the larger cities in southern Nigeria. People buy property here to live in, to let, or to hold for the long term.</p>
      <p>Pablo Homes lists opportunities across those needs: residential land in growing areas, homes sold off-plan with staged payments, and commercial buildings with road frontage. For each one, we share what we know: size, location, status, price and payment terms where they apply.</p>
    </div>
    <aside class="note-box">
      <h3>Please note</h3>
      <p>Pablo Homes does not promise investment returns or future values. Property prices can go down as well as up. Take independent legal and financial advice, and verify title documents before you commit.</p>
    </aside>
  </div>
</section>

<section class="section section-ivory">
  <div class="wrap">
    <div class="sec-head"><div><h2>Investment-oriented listings</h2><p class="sec-lead">Land, off-plan and commercial property currently listed.</p></div><a class="link-quiet" href="properties.html?status=open">All available properties</a></div>
    <div class="grid-cards">${inv.map((p) => card(p)).join('\n')}</div>
  </div>
</section>

<section class="section">
  <div class="wrap split">
    <div>
      <h2>Off-plan opportunities</h2>
      <p>Off-plan homes are sold before construction is complete, usually with a deposit and instalments while the home is built. Payment terms, timelines and specifications are set out for each project.</p>
      <ul class="mini-list">${offplan.map((p) => `<li><a href="properties/${p.slug}.html"><span>${esc(p.title)}, ${esc(p.area)}</span><span>${priceText(p)}</span></a></li>`).join('')}</ul>
      <a class="link-arrow" href="insights/how-off-plan-payment-plans-work.html">How off-plan payment plans usually work</a>
    </div>
    <div>
      <h2>Land opportunities</h2>
      <p>Residential plots across Benin City, listed with size, access and the documents available. Buy to build, or hold.</p>
      <ul class="mini-list">${land.map((p) => `<li><a href="properties/${p.slug}.html"><span>${esc(p.title)}, ${esc(p.area)}</span><span>${priceText(p)}</span></a></li>`).join('')}</ul>
      <a class="link-arrow" href="insights/what-to-check-before-buying-land-in-benin-city.html">What to check before buying land</a>
    </div>
  </div>
</section>

<section class="abroad">
  <div class="abroad-media">${img({ id: IMG.extVilla, alt: 'Elegant modern home at twilight', fb: 'exterior', widths: [800, 1400, 2000] })}</div>
  <div class="wrap abroad-inner">
    <div class="abroad-card">
      <h2>For Nigerians abroad</h2>
      <p>Living in the UK, the US, Canada or elsewhere? You can shortlist from photos and full details, ask for a live video walkthrough, and talk to us on WhatsApp at a time that suits your time zone. A family member or representative can attend inspections for you.</p>
      <a class="link-arrow link-light" href="insights/buying-property-in-nigeria-from-abroad.html">Read our checklist for buying from abroad</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2>How to enquire</h2>
    <ol class="steps">
      <li><h3>Shortlist</h3><p>Browse listings and note the reference numbers of properties you’re interested in.</p></li>
      <li><h3>Request details</h3><p>Ask for more photos, a video tour, document copies or payment terms, on WhatsApp or through the property page.</p></li>
      <li><h3>Inspect</h3><p>Visit in person, send a representative, or join a live video inspection.</p></li>
      <li><h3>Verify and decide</h3><p>Have your own lawyer review the documents. When you’re ready, we’ll explain the next steps for that property.</p></li>
    </ol>
    <div class="btn-row">
      <a class="btn btn-solid" href="${waLink('Hello Pablo Homes, I am interested in property investment opportunities in Benin City.')}" target="_blank" rel="noopener" data-track="whatsapp_click">${ICON.wa}Talk to Pablo Homes</a>
      <a class="btn btn-outline" href="contact.html">Send a message</a>
    </div>
  </div>
</section>`;
  pages['investment.html'] = layout({ file: 'investment.html', title: 'Property investment in Benin City', active: 'investment', ogImage: IMG.cityWide, desc: 'Land, off-plan homes and commercial property in Benin City for investors and Nigerians abroad. Clear details, video inspections and direct contact with Pablo Homes.', body });
})();

/* ABOUT */
(function about() {
  const body = `
${pageHead({ title: 'About Pablo Homes', lead: 'A Benin City real estate business helping people buy, rent and find land.', crumbs: [['index.html', 'Home'], ['', 'About']], image: IMG.cityDusk, fb: 'city', alt: 'City buildings at dusk' })}
<section class="section">
  <div class="wrap two-col">
    <div class="prose">
      <h2>Who we are</h2>
      <p>Pablo Homes is a real estate business based in Benin City, Edo State. We list homes for sale and rent, furnished shortlets, commercial property and land across the city.</p>
      <p>Our work is to make finding property simpler. That means putting clear information on every listing, answering questions directly, and arranging inspections at times that suit you, whether you live in Benin City or are buying from abroad.</p>
      <h2>Who we work with</h2>
      <p>First-time buyers and growing families. Renters looking for the right flat. Businesses that need office or retail space. Investors and Nigerians abroad looking at land and off-plan homes. Each needs something different, and we try to give each the information that matters to them.</p>
    </div>
    <div class="about-media ratio-45">${img({ id: IMG.extTwoStorey, alt: 'Two-storey contemporary home', widths: [640, 1000], sizes: '(min-width: 900px) 40vw, 100vw', fb: 'exterior' })}</div>
  </div>
</section>
<section class="section section-ivory">
  <div class="wrap">
    <h2>How we work</h2>
    <dl class="principles">
      <div><dt>Information first</dt><dd>Price, size, status and location on every listing. If something isn’t known yet, we say so.</dd></div>
      <div><dt>Straight answers</dt><dd>Ask on WhatsApp or by phone and speak to someone who knows the property.</dd></div>
      <div><dt>Inspection before commitment</dt><dd>We encourage every buyer and renter to see the property, in person or by video, before paying anything.</dd></div>
      <div><dt>Verify independently</dt><dd>We share available documents so your own lawyer can check them.</dd></div>
    </dl>
  </div>
</section>
${ctaBand('')}`;
  pages['about.html'] = layout({ file: 'about.html', title: 'About us', active: 'about', ogImage: IMG.cityDusk, desc: 'Pablo Homes is a real estate business in Benin City, Edo State, offering property sales, rentals and land sales.', body });
})();

/* INSIGHTS */
(function insights() {
  const sorted = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date));
  const [lead, ...rest] = sorted;
  const body = `
${pageHead({ title: 'Insights', lead: 'Practical guides to buying, renting and investing in property in Benin City.', crumbs: [['index.html', 'Home'], ['', 'Insights']] })}
<section class="section section-tight">
  <div class="wrap">
    <a class="feature-post" href="insights/${lead.slug}.html">
      <span class="fp-media ratio-169">${img({ id: lead.img, alt: '', widths: [800, 1400], sizes: '(min-width: 900px) 60vw, 100vw', fb: lead.fb, eager: true })}</span>
      <span class="fp-text"><span class="post-topic">${lead.topic}</span><span class="fp-title">${esc(lead.title)}</span><span class="post-excerpt">${esc(lead.excerpt)}</span><span class="post-date">${fmtDate(lead.date)}</span></span>
    </a>
    <div class="posts">
      ${rest.map((a) => `<a class="post" href="insights/${a.slug}.html">
        <span class="post-media ratio-32">${img({ id: a.img, alt: '', widths: [480, 800], sizes: '(min-width: 900px) 33vw, 100vw', fb: a.fb })}</span>
        <span class="post-topic">${a.topic}</span><span class="post-title">${esc(a.title)}</span><span class="post-excerpt">${esc(a.excerpt)}</span><span class="post-date">${fmtDate(a.date)}</span>
      </a>`).join('\n      ')}
    </div>
  </div>
</section>`;
  pages['insights.html'] = layout({ file: 'insights.html', title: 'Insights: property guides for Benin City', active: 'insights', desc: 'Guides to buying land, renting, property documents, off-plan payment plans and buying property in Nigeria from abroad.', body });

  ARTICLES.forEach((a) => {
    const file = `insights/${a.slug}.html`;
    const others = sorted.filter((x) => x.slug !== a.slug).slice(0, 3);
    const content = a.body.map(([t, c]) => (t === 'ul' ? `<ul>${c.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>` : `<${t}>${esc(c)}</${t}>`)).join('\n');
    const body = `
<article>
  <header class="article-head">
    <div class="wrap wrap-narrow">
      <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="../index.html">Home</a></li><li><a href="../insights.html">Insights</a></li><li aria-current="page">${esc(a.topic)}</li></ol></nav>
      <h1>${esc(a.title)}</h1>
      <p class="lead">${esc(a.excerpt)}</p>
      <p class="post-date">${fmtDate(a.date)}</p>
    </div>
    <div class="wrap"><div class="article-media ratio-219">${img({ id: a.img, alt: '', widths: [800, 1400, 2000], fb: a.fb, eager: true })}</div></div>
  </header>
  <div class="wrap wrap-narrow prose article-body">
    ${content}
    <p class="article-note">This article is general information, not legal or financial advice.</p>
  </div>
</article>
<section class="section section-ivory">
  <div class="wrap">
    <div class="sec-head"><div><h2>More insights</h2></div><a class="link-quiet" href="../insights.html">All insights</a></div>
    <div class="posts">${others.map((x) => `<a class="post" href="${x.slug}.html"><span class="post-media ratio-32">${img({ id: x.img, alt: '', widths: [480, 800], sizes: '(min-width: 900px) 33vw, 100vw', fb: x.fb })}</span><span class="post-topic">${x.topic}</span><span class="post-title">${esc(x.title)}</span><span class="post-date">${fmtDate(x.date)}</span></a>`).join('')}</div>
  </div>
</section>`;
    pages[file] = layout({ file, title: a.title, active: 'insights', ogImage: a.img, desc: a.excerpt, body,
      jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.excerpt, datePublished: a.date, image: imgUrl(a.img, 1200), author: { '@type': 'Organization', name: 'Pablo Homes' }, publisher: { '@type': 'Organization', name: 'Pablo Homes' } }] });
  });
})();

/* FAQ */
(function faq() {
  const groups = [...new Set(FAQS.map((f) => f.group))];
  const body = `
${pageHead({ title: 'Frequently asked questions', lead: 'Answers about buying, renting, land, inspections and buying from abroad.', crumbs: [['index.html', 'Home'], ['', 'FAQ']] })}
<section class="section section-tight">
  <div class="wrap faq-layout">
    <nav class="faq-nav" aria-label="FAQ topics"><ul>${groups.map((g) => `<li><a href="#${g.toLowerCase().replace(/[^a-z]+/g, '-')}">${g}</a></li>`).join('')}</ul></nav>
    <div class="faq-groups">
      ${groups.map((g) => `<section class="faq-group" id="${g.toLowerCase().replace(/[^a-z]+/g, '-')}"><h2>${g}</h2>
        ${FAQS.filter((f) => f.group === g).map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n        ')}
      </section>`).join('\n      ')}
      <div class="faq-more">
        <h2>Still have a question?</h2>
        <p>Ask us directly. We’re happy to help.</p>
        <div class="btn-row"><a class="btn btn-wa" href="${waLink('Hello Pablo Homes, I have a question.')}" target="_blank" rel="noopener" data-track="whatsapp_click">${ICON.wa}Chat on WhatsApp</a><a class="btn btn-outline" href="contact.html">Send a message</a></div>
      </div>
    </div>
  </div>
</section>`;
  pages['faq.html'] = layout({ file: 'faq.html', title: 'FAQ', desc: 'Frequently asked questions about buying, renting, land, inspections and buying property in Benin City from abroad.', body,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] });
})();

/* CONTACT */
(function contact() {
  const body = `
${pageHead({ title: 'Contact Pablo Homes', lead: 'Call, message us on WhatsApp, or send a message below.', crumbs: [['index.html', 'Home'], ['', 'Contact']] })}
<section class="section section-tight">
  <div class="wrap contact-layout">
    <div class="contact-info">
      <ul class="contact-list">
        <li><span class="ci-label">Phone</span><a class="ci-value" href="tel:${SITE.phoneTel}" data-track="call_click">${SITE.phoneDisplay}</a></li>
        <li><span class="ci-label">WhatsApp</span><a class="ci-value" href="${waLink('Hello Pablo Homes, I would like to make an enquiry.')}" target="_blank" rel="noopener" data-track="whatsapp_click">${SITE.phoneDisplay}</a></li>
        <li><span class="ci-label">Email</span><a class="ci-value break" href="mailto:${SITE.email}" data-track="email_click">${SITE.email}</a></li>
        <li><span class="ci-label">Location</span><span class="ci-value">Benin City, Edo State, Nigeria</span></li>
      </ul>
      <div class="btn-row">
        <a class="btn btn-solid" href="tel:${SITE.phoneTel}" data-track="call_click">${ICON.phone}Call now</a>
        <a class="btn btn-wa" href="${waLink('Hello Pablo Homes, I would like to make an enquiry.')}" target="_blank" rel="noopener" data-track="whatsapp_click">${ICON.wa}Chat on WhatsApp</a>
      </div>
      <div class="contact-media ratio-43">${img({ id: IMG.extWhite, alt: 'Modern white home with a pool', widths: [640, 1000], sizes: '(min-width: 900px) 40vw, 100vw', fb: 'exterior' })}</div>
    </div>
    <div class="contact-form panel">
      <h2>Send a message</h2>
      ${formShell({ type: 'contact', source: 'contact-page', submit: 'Send message', inner: `
        <div class="field"><label for="c-name">Full name</label><input id="c-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="c-phone">Phone</label><input id="c-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required pattern="[+0-9 ()-]{7,20}"></div>
        <div class="field"><label for="c-reason">Reason for enquiry</label><select id="c-reason" name="reason" required>
          <option value="">Choose one</option><option>Buying a property</option><option>Renting a property</option><option>Buying land</option><option>Shortlet booking</option><option>Investment enquiry</option><option>Listing my property</option><option>Something else</option>
        </select></div>
        <div class="field field-full"><label for="c-msg">Message</label><textarea id="c-msg" name="message" rows="5" required></textarea></div>
        <div class="hp" aria-hidden="true"><label>Company<input name="company" tabindex="-1" autocomplete="off"></label></div>` })}
    </div>
  </div>
</section>`;
  pages['contact.html'] = layout({ file: 'contact.html', title: 'Contact', active: 'contact', desc: `Contact Pablo Homes in Benin City. Call or WhatsApp ${SITE.phoneDisplay}, or email ${SITE.email}.`, body });
})();

/* BOOK INSPECTION */
(function book() {
  const body = `
${pageHead({ title: 'Book an inspection', lead: 'Choose a property and a preferred time. We’ll contact you to confirm.', crumbs: [['index.html', 'Home'], ['', 'Book an inspection']] })}
<section class="section section-tight">
  <div class="wrap book-layout">
    <div class="panel">${formShell({ type: 'inspection', source: 'inspection-page', submit: 'Send inspection request', note: INSPECTION_NOTE, inner: inspectionFields({ prefix: 'bi' }) })}</div>
    <aside class="book-aside">
      <div class="book-preview" data-book-preview hidden></div>
      <div class="book-media ratio-45">${img({ id: IMG.keysHouse, alt: 'House keys at a front door', widths: [480, 800], sizes: '(min-width: 900px) 30vw, 100vw', fb: 'interior' })}</div>
      <h2 class="h4">What happens next</h2>
      <ol class="next-steps">
        <li>We receive your request with the property reference.</li>
        <li>We call or message you to confirm a date, time and meeting point.</li>
        <li>You inspect in person, send a representative, or join by video.</li>
      </ol>
    </aside>
  </div>
</section>`;
  pages['book-inspection.html'] = layout({ file: 'book-inspection.html', title: 'Book a property inspection', pageClass: 'page-book', desc: 'Request a property inspection with Pablo Homes in Benin City. Choose a property, date and time, and we will confirm your appointment.', body });
})();

/* 404 */
pages['404.html'] = layout({ file: '404.html', title: 'Page not found', desc: 'The page you were looking for could not be found.', body: `
<section class="page-head page-404"><div class="wrap"><h1>This page isn’t here</h1><p class="lead">The link may be old, or the property may have been removed.</p><div class="btn-row"><a class="btn btn-solid" href="properties.html">View properties</a><a class="btn btn-outline" href="index.html">Go to the home page</a></div></div></section>` });

/* ---------------- write ---------------- */
function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}
for (const [rel, html] of Object.entries(pages)) write(rel, html);

// client-side search data: pre-rendered card HTML keeps server and client markup identical
const clientData = PROPERTIES.map((p) => ({
  id: p.id, slug: p.slug, title: p.title, category: p.category, purpose: p.purpose, status: p.status, area: p.area,
  price: p.price, priceUnit: p.priceUnit, bedrooms: p.bedrooms, bathrooms: p.bathrooms, dateAdded: p.dateAdded,
  label: `${p.title}, ${p.area}`, priceText: priceText(p), image: imgUrl(p.images[0], 600), fb: p.fb,
  html: card(p, '', { sizes: '(min-width: 1100px) 30vw, (min-width: 700px) 50vw, 100vw' }),
}));
write('assets/js/data.js', `/* Generated by build/build.js - do not edit by hand. Replace with an API call when the backend is ready. */\nwindow.PH_PROPERTIES=${JSON.stringify(clientData)};\nwindow.PH_CATEGORIES=${JSON.stringify(CATEGORIES.map((c) => ({ key: c.key, label: c.plural })))};\n`);

// sitemap + robots
const base = SITE.url ? SITE.url.replace(/\/$/, '') : 'https://www.example.com';
const urls = Object.keys(pages).filter((f) => f !== '404.html').map((f) => `  <url><loc>${base}/${f === 'index.html' ? '' : f}</loc></url>`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
write('assets/img/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#1F1E1B"/><text x="32" y="44" font-family="Georgia, serif" font-size="34" text-anchor="middle" fill="#C9A878">P</text></svg>`);

console.log(`Built ${Object.keys(pages).length} pages into ${OUT}${SITE.url ? '' : '  (SITE_URL not set: canonical tags omitted, sitemap uses example.com)'}`);
