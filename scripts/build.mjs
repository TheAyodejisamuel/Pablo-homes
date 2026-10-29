// Pablo Homes static site generator.
// Reads /src/data/*.json and writes a complete, SEO-friendly site to /dist.
// Run: npm run build
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES, PURPOSES, STATUSES, esc, priceLabel, propertyUrl, locationLabel, dateFmt, md, waLink,
  propertyWaText, isClosed, slugify, naira,
} from './lib/util.mjs';
import {
  icon, propertyCard, inspectionForm, contactForm, detailsForm, statusBadge, facts, priceOptions,
  locationOptions, typeOptions, bedOptions, waButton, callButton,
} from './lib/components.mjs';
import { layout } from './lib/layout.mjs';
import { propertyArtSet, sectionArt, heroArt } from './lib/art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const read = (f) => JSON.parse(fs.readFileSync(path.join(SRC, 'data', f), 'utf8'));

const site = read('site.json');
const posts = read('posts.json').sort((a, b) => b.date.localeCompare(a.date));
const faqs = read('faqs.json');
const ORIGIN = site.siteUrl.replace(/\/$/, '');

// ---------- validation of listing data (FR-02: conditional fields) ----------
const rawProps = read('properties.json');
const ids = new Set();
for (const p of rawProps) {
  const where = `Property ${p.id || '(no id)'}`;
  if (!p.id || ids.has(p.id)) throw new Error(`${where}: missing or duplicate id`);
  ids.add(p.id);
  if (!CATEGORIES[p.category]) throw new Error(`${where}: unknown category "${p.category}"`);
  if (!PURPOSES[p.purpose]) throw new Error(`${where}: unknown purpose "${p.purpose}"`);
  if (!STATUSES[p.status]) throw new Error(`${where}: unknown status "${p.status}"`);
  if (!p.title || !p.location?.area || !p.location?.city) throw new Error(`${where}: title and location are required`);
  if (p.category !== 'land' && p.category !== 'commercial' && p.bedrooms == null) throw new Error(`${where}: bedrooms required for ${p.category}`);
}

// ---------- prepare output ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const copyDir = (from, to) => fs.existsSync(from) && fs.cpSync(from, to, { recursive: true });
copyDir(path.join(SRC, 'static'), DIST);
copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));

const version = crypto
  .createHash('md5')
  .update(fs.readFileSync(path.join(SRC, 'assets/css/styles.css')))
  .update(fs.readFileSync(path.join(SRC, 'assets/js/main.js')))
  .digest('hex')
  .slice(0, 8);

const write = (urlPath, html) => {
  const file = urlPath.endsWith('/') ? path.join(DIST, urlPath, 'index.html') : path.join(DIST, urlPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
};
const sitemap = [];
const page = (p) => {
  write(p.path, layout(site, { version, ...p }));
  if (!p.noindex && p.path.endsWith('/')) sitemap.push({ loc: p.path, lastmod: p.lastmod });
};

// Generated illustrations
const artDir = path.join(DIST, 'images/art');
fs.mkdirSync(artDir, { recursive: true });
fs.writeFileSync(path.join(DIST, 'images/hero.svg'), heroArt());
for (const n of ['about', 'sales', 'rentals', 'land', 'investment', 'abroad', 'contact']) fs.writeFileSync(path.join(artDir, `section-${n}.svg`), sectionArt(n));

const properties = rawProps
  .map((p) => {
    const url = propertyUrl(p);
    let imageList;
    if (p.images?.length) {
      imageList = p.images.map((src, i) => ({ src, alt: `${p.title}, ${p.location.area} — photo ${i + 1}`, real: true }));
    } else {
      imageList = propertyArtSet(p).map((svg, i) => {
        const name = `${p.id.toLowerCase()}-${i + 1}.svg`;
        fs.writeFileSync(path.join(artDir, name), svg);
        return { src: `/images/art/${name}`, alt: `Illustration of ${p.title} (${i + 1}) — real photos to follow`, real: false };
      });
    }
    return { ...p, url, imageList };
  })
  .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));

const openListings = properties.filter((p) => !isClosed(p));
const byId = Object.fromEntries(properties.map((p) => [p.id, p]));

// ---------- shared fragments ----------
const sectionHead = (eyebrow, title, intro = '', action = '') => `
<div class="section-head">
  <div>
    ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
    <h2 class="section-title">${title}</h2>
    ${intro ? `<p class="section-intro">${intro}</p>` : ''}
  </div>
  ${action}
</div>`;

const pageHero = ({ eyebrow, title, lead, image, imageAlt = '' }) => `
<section class="page-hero${image ? ' page-hero--image' : ''}">
  ${image ? `<img class="page-hero-bg" src="${image}" alt="${esc(imageAlt)}" width="1200" height="800">` : ''}
  <div class="container page-hero-inner">
    ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
    <h1>${title}</h1>
    ${lead ? `<p class="lead">${lead}</p>` : ''}
  </div>
</section>`;

const grid = (list, cls = '') => `<div class="card-grid ${cls}">${list.map((p) => propertyCard(p)).join('')}</div>`;

const ctaBand = (title = 'Seen something you like?', text = 'Book an inspection or chat with Pablo Homes on WhatsApp — we will get back to you quickly.') => `
<section class="cta-band">
  <div class="container cta-band-inner">
    <div><h2>${title}</h2><p>${text}</p></div>
    <div class="cta-band-actions">
      <a class="btn btn-light" href="/book-inspection/">${icon('calendar')}<span>Book an Inspection</span></a>
      ${waButton(site, 'Hello Pablo Homes, I would like to talk to an agent about a property.', 'Talk to an Agent', 'btn btn-ghost-light')}
    </div>
  </div>
</section>`;

const demoNotice = site.demoMode
  ? `<div class="demo-notice" role="note"><div class="container">${icon('eye')}<span><strong>Preview site:</strong> listings shown are samples with illustrations. Real properties, photos and prices will replace them before launch.</span></div></div>`
  : '';

const orgLd = {
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  '@id': `${ORIGIN}/#organization`,
  name: site.name,
  url: ORIGIN + '/',
  telephone: site.phoneIntl,
  email: site.email,
  image: `${ORIGIN}/images/og-default.jpg`,
  areaServed: { '@type': 'City', name: site.city },
  address: { '@type': 'PostalAddress', addressLocality: site.city, addressRegion: site.state, addressCountry: site.countryCode, ...(site.address ? { streetAddress: site.address } : {}) },
};
const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + p })),
});
const breadcrumbs = (items) => `<nav class="breadcrumbs container" aria-label="Breadcrumb"><ol>${items
  .map(([name, p], i) => (i === items.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${p}">${esc(name)}</a></li>`))
  .join('')}</ol></nav>`;

const searchFields = (prefix) => `
  <fieldset class="seg" aria-label="Buy or rent">
    <legend class="sr-only">Buy or rent</legend>
    <label><input type="radio" name="purpose" value="" checked><span>All</span></label>
    <label><input type="radio" name="purpose" value="buy"><span>Buy</span></label>
    <label><input type="radio" name="purpose" value="rent"><span>Rent</span></label>
  </fieldset>
  <div class="search-fields">
    <div class="sf"><label for="${prefix}-loc">Location</label><select id="${prefix}-loc" name="location"><option value="">All of ${esc(site.city)}</option>${locationOptions(properties)}</select></div>
    <div class="sf"><label for="${prefix}-type">Property type</label><select id="${prefix}-type" name="type"><option value="">All types</option>${typeOptions()}</select></div>
    <div class="sf"><label for="${prefix}-min">Min price</label><select id="${prefix}-min" name="min">${priceOptions('min', 'No min')}</select></div>
    <div class="sf"><label for="${prefix}-max">Max price</label><select id="${prefix}-max" name="max">${priceOptions('max', 'No max')}</select></div>
    <div class="sf"><label for="${prefix}-beds">Bedrooms</label><select id="${prefix}-beds" name="beds">${bedOptions('Any')}</select></div>`;

// =====================================================================
// HOME
// =====================================================================
const featured = openListings.filter((p) => p.featured).slice(0, 6);
const recent = openListings.slice(0, 3);
const typeCounts = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, openListings.filter((p) => p.category === k).length]));
const TYPE_BLURB = {
  land: 'Plots for homes and development',
  apartment: 'Flats and serviced apartments',
  duplex: 'Detached and semi-detached homes',
  terrace: 'Terrace homes in secure developments',
  commercial: 'Offices, shops and commercial land',
  shortlet: 'Furnished short stays',
  offplan: 'Homes before completion',
};

page({
  path: '/',
  title: `${site.name} — Find Your Place in ${site.city}`,
  description: site.description,
  overlayHeader: true,
  bodyClass: 'page-home',
  jsonLd: [orgLd, { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: ORIGIN + '/', potentialAction: { '@type': 'SearchAction', target: `${ORIGIN}/properties/?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }],
  body: `
<section class="hero">
  <img class="hero-bg" src="/images/hero.svg" alt="" width="1600" height="1000" fetchpriority="high">
  <div class="hero-shade"></div>
  <div class="container hero-inner">
    <p class="eyebrow eyebrow--light">${esc(site.city)} · ${esc(site.state)}</p>
    <h1 class="hero-title">Find Your Place<br>in ${esc(site.city)}.</h1>
    <p class="hero-lead">Browse homes for sale and rent, land and shortlets across ${esc(site.city)} — then book an inspection or chat with Pablo Homes directly.</p>
    <div class="hero-actions">
      <a class="btn btn-light" href="/properties/">View Properties ${icon('arrow')}</a>
      <a class="btn btn-ghost-light" href="/book-inspection/">${icon('calendar')}<span>Book an Inspection</span></a>
    </div>
  </div>
  <div class="container hero-search-wrap">
    <form class="hero-search" action="/properties/" method="get" role="search" aria-label="Search properties" data-search-form>
      ${searchFields('hs')}
        <div class="sf sf-submit"><button class="btn btn-primary btn-block" type="submit">${icon('search')}<span>Search</span></button></div>
      </div>
    </form>
  </div>
</section>
${demoNotice}

<section class="section">
  <div class="container">
    ${sectionHead('Featured', 'Selected properties', 'A considered selection of homes, land and opportunities currently available through Pablo Homes.', `<a class="link-arrow" href="/properties/">View All Properties ${icon('arrow')}</a>`)}
    ${grid(featured)}
  </div>
</section>

<section class="section section--tint">
  <div class="container">
    ${sectionHead('Browse', 'Browse by property type')}
    <ul class="type-grid">
      ${Object.entries(CATEGORIES).map(([k, v]) => `<li><a class="type-tile" href="/properties/?type=${k}">${icon(k)}<span class="type-name">${v.plural}</span><span class="type-blurb">${TYPE_BLURB[k]}</span><span class="type-count">${typeCounts[k]} ${typeCounts[k] === 1 ? 'listing' : 'listings'}</span></a></li>`).join('')}
    </ul>
  </div>
</section>

<section class="section">
  <div class="container">
    ${sectionHead('Services', 'How Pablo Homes can help', '', `<a class="link-arrow" href="/services/">All services ${icon('arrow')}</a>`)}
    <div class="service-grid">
      ${[
        ['sales', 'Property Sales', 'Homes, terraces and commercial buildings for sale in Benin City, with clear information on every listing.', '/properties/?purpose=buy', 'Browse properties for sale'],
        ['rentals', 'Property Rentals', 'Apartments, homes, commercial spaces and shortlets for rent — compare options and book an inspection.', '/properties/?purpose=rent', 'Browse properties for rent'],
        ['land', 'Land Sales', 'Residential and commercial plots, with documentation details shared on enquiry.', '/properties/?type=land', 'View available land'],
      ].map(([art, t, d, href, cta]) => `<article class="service-card"><a href="${href}" class="service-media" tabindex="-1" aria-hidden="true"><img src="/images/art/section-${art}.svg" alt="" width="1200" height="800" loading="lazy"></a><h3>${t}</h3><p>${d}</p><a class="link-arrow" href="${href}">${cta} ${icon('arrow')}</a></article>`).join('')}
    </div>
  </div>
</section>

<section class="section section--dark">
  <div class="container">
    ${sectionHead('Why Pablo Homes', 'A simpler way to find property in Benin City', 'Our approach is built on a few straightforward principles.')}
    <ul class="principles">
      ${[
        ['doc', 'Clear property information', 'Price, location, size, status and features stated plainly on every listing.'],
        ['search', 'Easy property discovery', 'Search and filter by location, type, price and bedrooms on any device.'],
        ['chat', 'Direct enquiry', 'Reach Pablo Homes by WhatsApp, phone or email from any property page.'],
        ['calendar', 'Inspection booking', 'Request an inspection online, then receive confirmation from our team.'],
        ['pin', 'Local market focus', `Concentrated on ${esc(site.city)}, ${esc(site.state)} — the market we know.`],
      ].map(([ic, t, d]) => `<li>${icon(ic)}<h3>${t}</h3><p>${d}</p></li>`).join('')}
    </ul>
  </div>
</section>

<section class="section">
  <div class="container">
    ${sectionHead('Just listed', 'Recently added', '', `<a class="link-arrow" href="/properties/?sort=newest">See newest ${icon('arrow')}</a>`)}
    ${grid(recent)}
  </div>
</section>

<section class="section section--tint">
  <div class="container split">
    <div class="split-media"><img src="/images/art/section-investment.svg" alt="Architectural line drawing of a planned development" width="1200" height="800" loading="lazy"></div>
    <div class="split-body">
      <p class="eyebrow">Investment</p>
      <h2 class="section-title">Property opportunities in ${esc(site.city)}</h2>
      <p>For investors and Nigerians abroad, Pablo Homes lists land, off-plan developments and income-generating property in ${esc(site.city)}. Every opportunity comes with the information you need to carry out your own due diligence.</p>
      <ul class="checks">
        <li>${icon('check')}Land and off-plan opportunities</li>
        <li>${icon('check')}Photos, video and documentation on request</li>
        <li>${icon('check')}Remote enquiries welcome via WhatsApp and email</li>
      </ul>
      <div class="btn-row"><a class="btn btn-primary" href="/investment/">Explore Investment ${icon('arrow')}</a></div>
      <p class="fineprint">Property values can go down as well as up. Pablo Homes does not promise or guarantee returns.</p>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    ${sectionHead('Insights', 'Guides for buyers, renters and investors', '', `<a class="link-arrow" href="/insights/">All insights ${icon('arrow')}</a>`)}
    <div class="post-grid">${posts.slice(0, 3).map(postCard).join('')}</div>
  </div>
</section>
${ctaBand()}`,
});

function postArt(post) {
  const map = { Land: 'land', Renting: 'rentals', Inspections: 'about', 'Nigerians Abroad': 'abroad', Investment: 'investment', Documentation: 'sales' };
  return `/images/art/section-${map[post.category] || 'sales'}.svg`;
}
function postCard(post) {
  return `<article class="post-card"><a class="post-media" href="/insights/${post.slug}/" tabindex="-1" aria-hidden="true"><img src="${postArt(post)}" alt="" width="1200" height="800" loading="lazy"></a><div class="post-body"><p class="post-meta"><span>${esc(post.category)}</span> · <time datetime="${post.date}">${dateFmt(post.date)}</time></p><h3><a href="/insights/${post.slug}/">${esc(post.title)}</a></h3><p>${esc(post.excerpt)}</p></div></article>`;
}

// =====================================================================
// PROPERTIES (listing + filters)
// =====================================================================
page({
  path: '/properties/',
  title: `Properties for Sale & Rent in ${site.city}`,
  description: `Search property in ${site.city}: houses and apartments for sale and rent, land, shortlets, commercial and off-plan listings. Filter by location, type, price and bedrooms.`,
  jsonLd: [breadcrumbLd([['Home', '/'], ['Properties', '/properties/']]), {
    '@context': 'https://schema.org', '@type': 'ItemList', name: `Properties in ${site.city}`,
    itemListElement: properties.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: ORIGIN + p.url, name: p.title })),
  }],
  body: `
${pageHero({ eyebrow: 'Properties', title: `Property in ${esc(site.city)}`, lead: 'Search homes for sale and rent, land, shortlets, commercial and off-plan listings. Combine filters, then share the link to your results.' })}
${demoNotice}
<section class="section section--flush">
  <div class="container">
    <form class="filters" id="filters" action="/properties/" method="get" role="search" aria-label="Filter properties" data-filters>
      <div class="filters-top">
        ${searchFields('pf')}
        </div>
        <button class="btn btn-outline filters-toggle" type="button" aria-expanded="false" aria-controls="filters-more" data-filters-toggle>${icon('sliders')}<span>More filters</span><span class="filter-count" data-filter-count hidden></span></button>
      </div>
      <div class="filters-more" id="filters-more" data-filters-more>
        <div class="sf"><label for="pf-baths">Bathrooms</label><select id="pf-baths" name="baths">${bedOptions('Any')}</select></div>
        <div class="sf"><label for="pf-status">Status</label><select id="pf-status" name="status"><option value="">Any status</option>${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div>
        <div class="sf"><label for="pf-listed">Listed</label><select id="pf-listed" name="listed"><option value="">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>
        <div class="sf"><label for="pf-q">Keyword</label><input id="pf-q" name="q" type="search" placeholder="e.g. BQ, gated, PH-1001"></div>
      </div>
      <noscript><p class="fineprint">Filtering needs JavaScript. All listings are shown below.</p></noscript>
    </form>
    <div class="results-bar">
      <p class="results-count" aria-live="polite" data-results-count>${properties.length} properties</p>
      <div class="results-tools">
        <button class="btn-text" type="button" data-clear-filters>Clear filters</button>
        <button class="btn-text" type="button" data-share-search>${icon('share')}<span>Share search</span></button>
        <label class="sort"><span>Sort</span><select name="sort" form="filters" data-sort><option value="newest">Newest</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option></select></label>
      </div>
    </div>
    <div class="card-grid" data-results>${properties.map((p, i) => propertyCard(p, { eager: i < 3 })).join('')}</div>
    <div class="empty-state" data-empty hidden>
      ${icon('search')}
      <h2>No properties match those filters</h2>
      <p>Try widening your price range or location — or tell us what you are looking for and Pablo Homes will help.</p>
      <div class="btn-row center"><button class="btn btn-outline" type="button" data-clear-filters>Clear filters</button>${waButton(site, 'Hello Pablo Homes, I could not find what I need on your website. I am looking for: ')}</div>
    </div>
  </div>
</section>
${ctaBand('Can’t find the right property?', 'Tell Pablo Homes what you need — new listings are added regularly.')}`,
});

// =====================================================================
// PROPERTY DETAIL PAGES
// =====================================================================
for (const p of properties) {
  const cat = CATEGORIES[p.category];
  const similar = openListings
    .filter((o) => o.id !== p.id)
    .map((o) => ({ o, score: (o.category === p.category ? 3 : 0) + (o.purpose === p.purpose ? 2 : 0) + (o.location.area === p.location.area ? 1 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.o);
  const waText = propertyWaText(p);
  const mapQ = encodeURIComponent(`${p.location.area}, ${p.location.city}, ${p.location.state}, Nigeria`);
  const closed = isClosed(p);
  const factRows = [
    ['Reference', p.id],
    ['Status', STATUSES[p.status].label],
    ['Property type', cat.label],
    ['Listing purpose', PURPOSES[p.purpose].label],
    ['Price', priceLabel(p)],
    ['Location', `${p.location.area}, ${p.location.city}, ${p.location.state}`],
    p.bedrooms != null && ['Bedrooms', p.bedrooms],
    p.bathrooms != null && ['Bathrooms', p.bathrooms],
    p.size && ['Property size', `${p.size.toLocaleString('en-NG')} m²`],
    p.landSize && ['Land size', p.landSize],
    ['Date listed', dateFmt(p.dateAdded)],
  ].filter(Boolean);
  const ytId = (p.video || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];
  const videoBlock = ytId
    ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${ytId}" title="Video tour of ${esc(p.title)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
    : p.video && /\.(mp4|webm)$/i.test(p.video)
      ? `<div class="video"><video controls preload="none" playsinline src="${esc(p.video)}"></video></div>`
      : `<div class="video-request">${icon('play')}<div><p><strong>Video walkthrough</strong></p><p>Ask for a video of this property — useful if you are abroad or cannot visit yet.</p></div>${waButton(site, `Hello Pablo Homes, please send me a video of ${p.title} (Ref: ${p.id}).`, 'Request video', 'btn btn-outline btn-sm', 'video_request')}</div>`;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    url: ORIGIN + p.url,
    description: p.description.split('\n')[0],
    datePosted: p.dateAdded,
    image: p.imageList.filter((i) => i.real).map((i) => ORIGIN + i.src),
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: site.currency,
      availability: closed ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      businessFunction: p.purpose === 'sale' ? 'http://purl.org/goodrelations/v1#Sell' : 'http://purl.org/goodrelations/v1#LeaseOut',
      seller: { '@id': `${ORIGIN}/#organization` },
    },
    about: {
      '@type': cat.schema,
      name: p.title,
      address: { '@type': 'PostalAddress', addressLocality: p.location.city, addressRegion: p.location.state, addressCountry: site.countryCode, streetAddress: p.location.area },
      ...(p.bedrooms != null ? { numberOfBedrooms: p.bedrooms } : {}),
      ...(p.bathrooms != null ? { numberOfBathroomsTotal: p.bathrooms } : {}),
      ...(p.size ? { floorSize: { '@type': 'QuantitativeValue', value: p.size, unitCode: 'MTK' } } : {}),
    },
  };
  if (!ld.image.length) delete ld.image;

  page({
    path: p.url,
    title: `${p.title} — ${p.location.area}, ${p.location.city}`,
    description: `${STATUSES[p.status].label}: ${p.title} in ${p.location.area}, ${p.location.city}. ${priceLabel(p)}. ${p.description.split('\n')[0].slice(0, 110)}…`,
    ogType: 'article',
    ogImage: p.imageList[0].real ? p.imageList[0].src : undefined,
    waText,
    inspectHref: '#inspection',
    bodyClass: 'page-property',
    lastmod: p.dateAdded,
    jsonLd: [ld, breadcrumbLd([['Home', '/'], ['Properties', '/properties/'], [p.title, p.url]])],
    body: `
${breadcrumbs([['Home', '/'], ['Properties', '/properties/'], [p.title, p.url]])}
<article class="property" data-property-id="${esc(p.id)}" data-property-title="${esc(p.title)}">
  <div class="container">
    <section class="gallery" aria-label="Image gallery" data-gallery>
      <div class="gallery-main">
        ${p.imageList.map((img, i) => `<figure class="gallery-slide${i === 0 ? ' is-active' : ''}" data-slide${i ? ' hidden' : ''}><img src="${img.src}" alt="${esc(img.alt)}" width="1200" height="800" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></figure>`).join('')}
        <button class="gallery-nav gallery-prev" type="button" aria-label="Previous image" data-gallery-prev>${icon('left')}</button>
        <button class="gallery-nav gallery-next" type="button" aria-label="Next image" data-gallery-next>${icon('arrow')}</button>
        <p class="gallery-count"><span data-gallery-index>1</span> / ${p.imageList.length}</p>
        ${p.imageList[0].real ? '' : '<p class="gallery-note">Illustration — real photos to be added</p>'}
      </div>
      <div class="gallery-thumbs" role="tablist" aria-label="Choose image">
        ${p.imageList.map((img, i) => `<button type="button" role="tab" aria-selected="${i === 0}" aria-label="Image ${i + 1}" data-thumb="${i}"><img src="${img.src}" alt="" width="1200" height="800" loading="lazy"></button>`).join('')}
      </div>
    </section>

    ${closed ? `<div class="closed-banner">${icon('key')}<p>This property has been <strong>${STATUSES[p.status].label.toLowerCase()}</strong>. See similar properties below, or ask Pablo Homes about comparable listings.</p></div>` : ''}
    ${p.sample ? `<div class="sample-banner" role="note">${icon('eye')}<p>This is a <strong>sample listing</strong> created to demonstrate the website. Details and images are illustrative.</p></div>` : ''}

    <div class="property-layout">
      <div class="property-main">
        <header class="property-header">
          <div class="property-tags">${statusBadge(p)}<span class="badge badge--outline">${esc(cat.label)}</span><span class="ref">Ref: ${esc(p.id)}</span></div>
          <h1 class="property-title">${esc(p.title)}</h1>
          <p class="property-loc">${icon('pin')}${esc(p.location.area)}, ${esc(p.location.city)}, ${esc(p.location.state)}</p>
          <p class="property-price">${esc(priceLabel(p))}</p>
          <ul class="property-facts">${facts(p, { withLabels: true })}</ul>
          <div class="property-quick">
            ${closed ? '' : `<a class="btn btn-primary" href="#inspection" data-track="inspection_cta">${icon('calendar')}<span>Book Inspection</span></a>`}
            ${waButton(site, waText, 'WhatsApp', 'btn btn-wa')}
            <button class="btn btn-outline" type="button" data-open-dialog="details-dialog">${icon('doc')}<span>Request Details</span></button>
            ${callButton(site, 'Call', 'btn btn-outline')}
          </div>
        </header>

        <section class="prop-section">
          <h2>Description</h2>
          <div class="prose">${md(p.description)}</div>
        </section>

        <section class="prop-section">
          <h2>Property details</h2>
          <dl class="details-table">${factRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        </section>

        ${p.amenities?.length ? `<section class="prop-section"><h2>Amenities & features</h2><ul class="amenities">${p.amenities.map((a) => `<li>${icon('check')}${esc(a)}</li>`).join('')}</ul></section>` : ''}

        ${p.paymentPlan ? `<section class="prop-section"><h2>Payment plan</h2><div class="payment-plan">${icon('calendar')}<p>${esc(p.paymentPlan)}</p></div><p class="fineprint">Payment plans are subject to confirmation and a written agreement. Online payments are not taken on this website.</p></section>` : ''}

        <section class="prop-section">
          <h2>Video</h2>
          ${videoBlock}
        </section>

        <section class="prop-section">
          <h2>Location</h2>
          <div class="map"><iframe title="Map showing ${esc(p.location.area)}, ${esc(p.location.city)}" src="https://maps.google.com/maps?q=${mapQ}&z=14&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
          <p class="fineprint">Map shows the general area. The exact address is shared when you arrange an inspection.</p>
        </section>

        ${closed ? '' : `<section class="prop-section inspection-section" id="inspection" tabindex="-1">
          <h2>Book an inspection</h2>
          <p>Choose a preferred date and time to view this property. Pablo Homes will contact you to confirm.</p>
          ${inspectionForm(properties, p, { idPrefix: 'ins', site })}
        </section>`}

        <section class="prop-section share">
          <h2 class="share-title">Share this property</h2>
          <div class="share-row">
            <button class="btn btn-outline btn-sm" type="button" data-share data-share-title="${esc(p.title)}">${icon('share')}<span>Share</span></button>
            <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`${p.title} — ${ORIGIN}${p.url}`)}" data-track="share_whatsapp">WhatsApp</a>
            <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ORIGIN + p.url)}" data-track="share_facebook">Facebook</a>
            <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(ORIGIN + p.url)}&text=${encodeURIComponent(p.title)}" data-track="share_x">X</a>
            <button class="btn btn-outline btn-sm" type="button" data-copy-link>Copy link</button>
          </div>
        </section>
      </div>

      <aside class="property-aside" aria-label="Enquire about this property">
        <div class="enquiry-card">
          <p class="enquiry-label">${esc(PURPOSES[p.purpose].label)}</p>
          <p class="enquiry-price">${esc(priceLabel(p))}</p>
          <p class="enquiry-ref">Ref: ${esc(p.id)} · ${esc(p.location.area)}</p>
          <div class="enquiry-actions">
            ${closed ? '' : `<a class="btn btn-primary btn-block" href="#inspection" data-track="inspection_cta">${icon('calendar')}<span>Book an Inspection</span></a>`}
            ${waButton(site, waText, 'Chat on WhatsApp', 'btn btn-wa btn-block')}
            ${callButton(site, 'Call Pablo Homes', 'btn btn-outline btn-block')}
            <button class="btn btn-outline btn-block" type="button" data-open-dialog="details-dialog">${icon('doc')}<span>Request Property Details</span></button>
          </div>
          <p class="enquiry-note">No payment is taken on this website. Always verify documents before paying.</p>
        </div>
      </aside>
    </div>
  </div>

  ${similar.length ? `<section class="section section--tint"><div class="container">${sectionHead('Similar properties', 'You may also like', '', `<a class="link-arrow" href="/properties/?type=${p.category}">More ${esc(cat.plural.toLowerCase())} ${icon('arrow')}</a>`)}${grid(similar)}</div></section>` : ''}
</article>

<dialog class="dialog" id="details-dialog" aria-labelledby="details-title">
  <div class="dialog-head"><h2 id="details-title">Request property details</h2><button class="dialog-close" type="button" data-close-dialog aria-label="Close">${icon('close')}</button></div>
  <p class="dialog-sub">${esc(p.title)} · Ref ${esc(p.id)}</p>
  ${detailsForm(p)}
</dialog>`,
  });
}

// =====================================================================
// BOOK INSPECTION (general entry point; auto-fills from ?property=ID)
// =====================================================================
page({
  path: '/book-inspection/',
  title: 'Book a Property Inspection',
  description: `Request an inspection of any Pablo Homes property in ${site.city}. Choose a preferred date and time and we will confirm your appointment.`,
  body: `
${pageHero({ eyebrow: 'Inspections', title: 'Book an inspection', lead: 'Choose a property and a preferred date and time. Your booking is a request until Pablo Homes confirms the appointment with you.' })}
<section class="section section--flush">
  <div class="container narrow-grid">
    <div class="panel">${inspectionForm(properties, null, { idPrefix: 'bk', site })}</div>
    <aside class="side-notes">
      <h2>How it works</h2>
      <ol class="steps">
        <li><strong>Send your request.</strong> Pick a property, date and time.</li>
        <li><strong>We confirm.</strong> Pablo Homes calls or messages you to confirm availability.</li>
        <li><strong>Inspect.</strong> View the property in person — or by video if you are abroad.</li>
      </ol>
      <p>Prefer to talk first?</p>
      <div class="btn-col">${waButton(site, 'Hello Pablo Homes, I would like to book a property inspection.')}${callButton(site)}</div>
    </aside>
  </div>
</section>`,
});

// =====================================================================
// ABOUT
// =====================================================================
page({
  path: '/about/',
  title: 'About Pablo Homes',
  description: `Pablo Homes is a real estate business in ${site.city}, ${site.state}, offering property sales, rentals and land sales.`,
  jsonLd: [orgLd],
  body: `
${pageHero({ eyebrow: 'About us', title: `Real estate in ${esc(site.city)}, made clearer`, lead: `Pablo Homes helps people buy, rent and invest in property across ${esc(site.city)}, ${esc(site.state)}.`, image: '/images/art/section-about.svg' })}
<section class="section">
  <div class="container split split--text">
    <div>
      <p class="eyebrow">Who we are</p>
      <h2 class="section-title">A ${esc(site.city)} real estate business</h2>
    </div>
    <div class="prose">
      <p>Pablo Homes is a real estate business focused on ${esc(site.city)}, ${esc(site.state)}. We connect buyers, renters and investors with homes, land and commercial property — and we make it easy to ask questions, see properties and take the next step.</p>
      <p>Our core services are <a href="/services/">property sales, property rentals and land sales</a>. Every listing on this website shows the essential information up front, and every property page lets you book an inspection, request details, call or chat with us on WhatsApp.</p>
    </div>
  </div>
</section>
<section class="section section--tint">
  <div class="container">
    ${sectionHead('How we work', 'Our principles')}
    <ul class="principles principles--light">
      ${[
        ['doc', 'Clear information', 'We state price, size, location and status plainly, and update listings when they change.'],
        ['chat', 'Easy to reach', 'Phone, WhatsApp, email and online forms — whichever suits you.'],
        ['calendar', 'Inspection first', 'We encourage every buyer and renter to see a property before committing.'],
        ['shield', 'Due diligence', 'We encourage clients to verify documents with their own lawyer before paying.'],
        ['pin', 'Local focus', `We concentrate on ${esc(site.city)}, so we can know the market well.`],
      ].map(([ic, t, d]) => `<li>${icon(ic)}<h3>${t}</h3><p>${d}</p></li>`).join('')}
    </ul>
  </div>
</section>
<section class="section">
  <div class="container">
    ${sectionHead('Who we serve', 'Built for every kind of property search')}
    <ul class="audience">
      ${[
        ['First-time buyers', 'Clear listings and guidance to help you buy with confidence.', '/insights/understanding-property-documents-in-nigeria/'],
        ['Nigerians abroad', 'Photos, video and remote enquiries for buyers outside Nigeria.', '/insights/buying-property-in-nigeria-from-abroad/'],
        ['Property investors', 'Land, off-plan and income-producing property.', '/investment/'],
        ['Renters', 'Apartments and homes across the city.', '/properties/?purpose=rent'],
        ['Businesses', 'Offices, shops and commercial land.', '/properties/?type=commercial'],
        ['Luxury buyers', 'Premium homes in sought-after areas.', '/properties/?purpose=buy&min=100000000'],
        ['Land buyers', 'Residential and commercial plots.', '/properties/?type=land'],
        ['Off-plan buyers', 'Homes before completion, with staged payments where available.', '/properties/?type=offplan'],
        ['Shortlet guests', 'Furnished apartments for short stays.', '/properties/?type=shortlet'],
      ].map(([t, d, h]) => `<li><a href="${h}"><h3>${t}</h3><p>${d}</p><span class="link-arrow">Explore ${icon('arrow')}</span></a></li>`).join('')}
    </ul>
  </div>
</section>
${ctaBand('Let’s find your place', 'Browse our properties or speak to Pablo Homes today.')}`,
});

// =====================================================================
// SERVICES
// =====================================================================
const services = [
  { id: 'sales', art: 'sales', title: 'Property Sales', text: `Homes, terrace developments and commercial buildings for sale in ${site.city}. Each listing sets out the price, size, features and status, with photos and video available on request.`, points: ['Detached, semi-detached and terrace homes', 'Commercial buildings', 'Off-plan homes where available', 'Inspections arranged at your convenience'], cta: 'Browse Properties for Sale', href: '/properties/?purpose=buy' },
  { id: 'rentals', art: 'rentals', title: 'Property Rentals', text: 'Apartments, family homes, commercial spaces and shortlets for rent. Compare options, ask about the full cost of moving in, and book an inspection online.', points: ['Apartments and serviced apartments', 'Family homes', 'Shops and office space', 'Furnished shortlets'], cta: 'Browse Properties for Rent', href: '/properties/?purpose=rent' },
  { id: 'land', art: 'land', title: 'Land Sales', text: `Residential and commercial plots in and around ${site.city}. Ask for the title documents and survey plan for any plot, and inspect before you buy.`, points: ['Plots in gated estates', 'Residential half and full plots', 'Commercial and mixed-use land', 'Documentation shared on enquiry'], cta: 'View Available Land', href: '/properties/?type=land' },
];
page({
  path: '/services/',
  title: 'Our Services — Property Sales, Rentals & Land Sales',
  description: `Pablo Homes services in ${site.city}: property sales, property rentals and land sales.`,
  jsonLd: [{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: services.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Service', name: s.title, provider: { '@id': `${ORIGIN}/#organization` }, areaServed: site.city, description: s.text } })) }],
  body: `
${pageHero({ eyebrow: 'Services', title: 'Sales, rentals and land', lead: `Three core services, one simple process — focused on ${esc(site.city)}.` })}
<section class="section section--flush">
  <div class="container services-list">
    ${services.map((s, i) => `<article class="service-row${i % 2 ? ' service-row--flip' : ''}" id="${s.id}">
      <div class="service-row-media"><img src="/images/art/section-${s.art}.svg" alt="" width="1200" height="800" loading="lazy"></div>
      <div class="service-row-body">
        <p class="eyebrow">0${i + 1}</p>
        <h2 class="section-title">${s.title}</h2>
        <p>${s.text}</p>
        <ul class="checks">${s.points.map((x) => `<li>${icon('check')}${x}</li>`).join('')}</ul>
        <a class="btn btn-primary" href="${s.href}">${s.cta} ${icon('arrow')}</a>
      </div>
    </article>`).join('')}
  </div>
</section>
<section class="section section--tint">
  <div class="container">
    ${sectionHead('Process', 'How it works')}
    <ol class="process">
      ${[['search', 'Browse', 'Search and filter listings online.'], ['chat', 'Enquire', 'Request details, call or chat on WhatsApp.'], ['calendar', 'Inspect', 'Book an inspection — we confirm the appointment.'], ['shield', 'Verify & proceed', 'Review documents with your lawyer, then agree terms.']].map(([ic, t, d], i) => `<li><span class="process-num">${i + 1}</span>${icon(ic)}<h3>${t}</h3><p>${d}</p></li>`).join('')}
    </ol>
  </div>
</section>
${ctaBand()}`,
});

// =====================================================================
// INVESTMENT
// =====================================================================
const invest = openListings.filter((p) => p.investment && p.category !== 'land' && p.category !== 'offplan');
const offplan = openListings.filter((p) => p.category === 'offplan');
const land = openListings.filter((p) => p.category === 'land');
const investorWa = 'Hello Pablo Homes, I am interested in property investment opportunities in Benin City. Please share what is available.';
page({
  path: '/investment/',
  title: `Property Investment in ${site.city}`,
  description: `Land, off-plan and income-generating property opportunities in ${site.city} for investors and Nigerians abroad. Enquire with Pablo Homes.`,
  waText: investorWa,
  body: `
${pageHero({ eyebrow: 'Investment', title: `Property opportunities in ${esc(site.city)}`, lead: 'For investors at home and Nigerians abroad — land, off-plan developments and income-generating property, with the information you need to decide.', image: '/images/art/section-investment.svg' })}
<section class="section">
  <div class="container split split--text">
    <div><p class="eyebrow">Overview</p><h2 class="section-title">Invest with clear information</h2></div>
    <div class="prose">
      <p>${esc(site.city)} is the capital of ${esc(site.state)}, and its property market includes established neighbourhoods, growing districts and new developments. Pablo Homes lists opportunities across the city and shares full details, photos, video and documentation on request.</p>
      <div class="callout">${icon('shield')}<p><strong>Please note:</strong> Pablo Homes does not promise or guarantee investment returns. Property values and rental income can go down as well as up. Carry out your own due diligence and take independent legal and financial advice before investing.</p></div>
    </div>
  </div>
</section>
${invest.length ? `<section class="section section--flush"><div class="container">${sectionHead('Income & commercial', 'Investment-oriented listings')}${grid(invest)}</div></section>` : ''}
<section class="section">
  <div class="container">
    ${sectionHead('Off-plan', 'Off-plan opportunities', 'Buy before completion, often with staged payments. Understand the risks first — read our <a href="/insights/off-plan-property-understanding-the-trade-offs/">guide to off-plan property</a>.')}
    ${offplan.length ? grid(offplan) : '<p class="muted">No off-plan opportunities are listed right now. Contact us to hear about upcoming developments.</p>'}
  </div>
</section>
<section class="section section--tint">
  <div class="container">
    ${sectionHead('Land', 'Land opportunities', '', `<a class="link-arrow" href="/properties/?type=land">All land ${icon('arrow')}</a>`)}
    ${grid(land.slice(0, 3))}
  </div>
</section>
<section class="section">
  <div class="container split">
    <div class="split-media"><img src="/images/art/section-abroad.svg" alt="" width="1200" height="800" loading="lazy"></div>
    <div class="split-body">
      <p class="eyebrow">How to enquire</p>
      <h2 class="section-title">From anywhere in the world</h2>
      <ol class="steps">
        <li><strong>Shortlist.</strong> Browse listings and note the reference numbers.</li>
        <li><strong>Request details.</strong> Ask for documents, photos and a video walkthrough.</li>
        <li><strong>Inspect.</strong> In person, by a trusted representative, or by live video.</li>
        <li><strong>Verify.</strong> Have your own lawyer review documents before any payment.</li>
      </ol>
      <div class="btn-row">${waButton(site, investorWa, 'Talk to Pablo Homes', 'btn btn-primary')}<a class="btn btn-outline" href="mailto:${esc(site.email)}?subject=${encodeURIComponent('Investment enquiry')}" data-track="email_click">${icon('mail')}<span>Email us</span></a></div>
    </div>
  </div>
</section>
${ctaBand('Talk to Pablo Homes', 'Tell us your budget and goals, and we will share suitable opportunities.')}`,
});

// =====================================================================
// INSIGHTS
// =====================================================================
const cats = [...new Set(posts.map((p) => p.category))];
page({
  path: '/insights/',
  title: 'Insights — Buying, Renting, Land & Investment Guides',
  description: `Practical guides to buying, renting, land, inspections, documentation and property investment in ${site.city} and Nigeria.`,
  body: `
${pageHero({ eyebrow: 'Insights', title: 'Guides & insights', lead: `Practical, plain-English guides for buyers, renters, land buyers and investors in ${esc(site.city)}.` })}
<section class="section section--flush">
  <div class="container">
    <div class="chips" role="group" aria-label="Filter by topic" data-chips>
      <button type="button" class="chip is-active" data-chip="" aria-pressed="true">All</button>
      ${cats.map((c) => `<button type="button" class="chip" data-chip="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}
    </div>
    <div class="post-grid" data-posts>${posts.map((p) => postCard(p).replace('<article class="post-card"', `<article class="post-card" data-cat="${esc(p.category)}"`)).join('')}</div>
  </div>
</section>`,
});
for (const post of posts) {
  const more = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  page({
    path: `/insights/${post.slug}/`,
    title: post.title,
    description: post.excerpt,
    ogType: 'article',
    lastmod: post.date,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.excerpt, datePublished: post.date, author: { '@type': 'Organization', name: site.name }, publisher: { '@id': `${ORIGIN}/#organization` }, mainEntityOfPage: `${ORIGIN}/insights/${post.slug}/` },
      breadcrumbLd([['Home', '/'], ['Insights', '/insights/'], [post.title, `/insights/${post.slug}/`]]),
    ],
    body: `
${breadcrumbs([['Home', '/'], ['Insights', '/insights/'], [post.title, `/insights/${post.slug}/`]])}
<article class="article">
  <header class="container article-head">
    <p class="post-meta"><span>${esc(post.category)}</span> · <time datetime="${post.date}">${dateFmt(post.date)}</time></p>
    <h1>${esc(post.title)}</h1>
    <p class="lead">${esc(post.excerpt)}</p>
  </header>
  <div class="container"><div class="article-media"><img src="${postArt(post)}" alt="" width="1200" height="800"></div></div>
  <div class="container article-body prose">${md(post.body)}</div>
  <div class="container article-cta">
    <div class="panel panel--dark">
      <h2>Looking for property in ${esc(site.city)}?</h2>
      <p>Browse current listings or ask Pablo Homes a question.</p>
      <div class="btn-row"><a class="btn btn-light" href="/properties/">View Properties ${icon('arrow')}</a>${waButton(site, `Hello Pablo Homes, I just read "${post.title}" and have a question.`, 'Chat on WhatsApp', 'btn btn-ghost-light')}</div>
    </div>
  </div>
</article>
<section class="section section--tint"><div class="container">${sectionHead('Keep reading', 'More insights')}<div class="post-grid">${more.map(postCard).join('')}</div></div></section>`,
  });
}

// =====================================================================
// FAQ
// =====================================================================
page({
  path: '/faq/',
  title: 'Frequently Asked Questions',
  description: `Answers to common questions about buying, renting, land, inspections and buying from abroad with Pablo Homes in ${site.city}.`,
  jsonLd: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.flatMap((g) => g.items.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } }))) }],
  body: `
${pageHero({ eyebrow: 'FAQ', title: 'Frequently asked questions', lead: 'Quick answers about buying, renting, land and inspections. Can’t find what you need? Ask us directly.' })}
<section class="section section--flush">
  <div class="container faq-layout">
    <nav class="faq-nav" aria-label="FAQ topics"><ul>${faqs.map((g) => `<li><a href="#${slugify(g.group)}">${esc(g.group)}</a></li>`).join('')}</ul></nav>
    <div>
      ${faqs.map((g) => `<section class="faq-group" id="${slugify(g.group)}"><h2>${esc(g.group)}</h2>${g.items.map((it) => `<details class="faq"><summary>${esc(it.q)}</summary><div class="faq-a"><p>${esc(it.a)}</p></div></details>`).join('')}</section>`).join('')}
      <div class="panel"><h2>Still have a question?</h2><p>Pablo Homes is happy to help.</p><div class="btn-row">${waButton(site, 'Hello Pablo Homes, I have a question: ')}<a class="btn btn-outline" href="/contact/">Contact us</a></div></div>
    </div>
  </div>
</section>`,
});

// =====================================================================
// CONTACT
// =====================================================================
page({
  path: '/contact/',
  title: 'Contact Pablo Homes',
  description: `Contact Pablo Homes in ${site.city}: call ${site.phoneDisplay}, chat on WhatsApp, email or send a message.`,
  jsonLd: [orgLd],
  body: `
${pageHero({ eyebrow: 'Contact', title: 'Talk to Pablo Homes', lead: 'Call, chat on WhatsApp, email or send a message — we will get back to you as soon as possible.' })}
<section class="section section--flush">
  <div class="container">
    <ul class="contact-cards">
      <li><a href="tel:${site.phoneIntl}" data-track="call_click">${icon('phone')}<span class="cc-label">Call Now</span><span class="cc-value">${esc(site.phoneDisplay)}</span></a></li>
      <li><a href="${waLink(site.whatsapp, 'Hello Pablo Homes, I would like some information.')}" target="_blank" rel="noopener" data-track="whatsapp_click">${icon('chat')}<span class="cc-label">Chat on WhatsApp</span><span class="cc-value">${esc(site.phoneDisplay)}</span></a></li>
      <li><a href="mailto:${esc(site.email)}" data-track="email_click">${icon('mail')}<span class="cc-label">Email</span><span class="cc-value break">${esc(site.email)}</span></a></li>
    </ul>
    <div class="narrow-grid">
      <div class="panel">
        <h2 class="panel-title">Send a message</h2>
        ${contactForm()}
      </div>
      <aside class="side-notes">
        <h2>Where we work</h2>
        <p>${icon('pin')} ${esc(site.address || `${site.city}, ${site.state}, ${site.country}`)}</p>
        ${site.hours ? `<h2>Opening hours</h2><p>${esc(site.hours)}</p>` : ''}
        <h2>Looking at a specific property?</h2>
        <p>Use the WhatsApp or inspection buttons on the property page — your message will include the property reference automatically.</p>
        <a class="link-arrow" href="/properties/">Browse properties ${icon('arrow')}</a>
      </aside>
    </div>
  </div>
</section>`,
});

// =====================================================================
// PRIVACY, 404, ADMIN
// =====================================================================
page({
  path: '/privacy/',
  title: 'Privacy Notice',
  description: `How ${site.name} uses the information you send through this website.`,
  body: `
${pageHero({ eyebrow: 'Legal', title: 'Privacy notice' })}
<section class="section section--flush"><div class="container article-body prose">
  <p>This notice explains how ${esc(site.name)} uses information you send through this website.</p>
  <h2>What we collect</h2>
  <p>When you submit an inspection request, a property details request or the contact form, we receive the details you enter — such as your name, phone and WhatsApp number, email address, the property concerned, your preferred inspection date and time, and your message — together with the date and time of submission and the page you sent it from.</p>
  <h2>How we use it</h2>
  <p>We use this information only to respond to your enquiry, arrange inspections and follow up about the properties you asked about. We do not sell your information.</p>
  <h2>Analytics</h2>
  <p>We may use privacy-respecting analytics to understand how the website is used, such as which pages are viewed and which buttons are clicked. This helps us improve the site.</p>
  <h2>Your choices</h2>
  <p>To ask what information we hold about you, or to have it corrected or deleted, contact us at <a href="mailto:${esc(site.email)}">${esc(site.email)}</a> or call ${esc(site.phoneDisplay)}.</p>
  <p class="fineprint">This notice will be updated with company-specific details before launch.</p>
</div></section>`,
});

write('/404.html', layout(site, {
  version, path: '/404.html', title: 'Page not found', description: 'The page you are looking for could not be found.', noindex: true,
  body: `<section class="section notfound"><div class="container"><p class="eyebrow">404</p><h1>We couldn’t find that page</h1><p class="lead">The listing may have been removed, or the link may be wrong.</p><div class="btn-row center"><a class="btn btn-primary" href="/properties/">View Properties</a><a class="btn btn-outline" href="/">Go home</a></div></div></section>`,
}));

write('/admin/index.html', layout(site, {
  version, path: '/admin/', title: 'Enquiries', description: 'Pablo Homes enquiries', noindex: true, bodyClass: 'page-admin',
  body: `
<section class="section"><div class="container">
  <p class="eyebrow">Admin</p><h1>Enquiries & inspection requests</h1>
  <p class="muted">Enter the admin key set in your hosting environment (ADMIN_TOKEN). The key is kept only in this browser tab.</p>
  <form class="admin-login" data-admin-login>
    <label for="admin-token" class="sr-only">Admin key</label>
    <input id="admin-token" type="password" autocomplete="current-password" placeholder="Admin key" required>
    <select data-admin-type aria-label="Type"><option value="">All types</option><option value="inspection">Inspection requests</option><option value="details">Details requests</option><option value="contact">Contact messages</option></select>
    <button class="btn btn-primary" type="submit">Load</button>
    <button class="btn btn-outline" type="button" data-admin-csv disabled>Download CSV</button>
  </form>
  <p class="form-status" role="status" data-admin-status></p>
  <div class="admin-table-wrap"><table class="admin-table" data-admin-table hidden><thead><tr><th>Received</th><th>Type</th><th>Name</th><th>Contact</th><th>Property</th><th>Preferred</th><th>Message</th><th>Source</th></tr></thead><tbody></tbody></table></div>
</div></section>`,
}));

// =====================================================================
// SEO files + client data
// =====================================================================
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
    .map((u) => `  <url><loc>${ORIGIN}${u.loc}</loc><lastmod>${u.lastmod || today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
// Public listing index (also what a future admin/CMS or mobile app could consume).
fs.writeFileSync(
  path.join(DIST, 'properties.json'),
  JSON.stringify(properties.map(({ imageList, ...p }) => ({ ...p, image: imageList[0].src })), null, 2),
);

console.log(`Built ${sitemap.length} pages + ${properties.length} listings → dist/ (assets v${version})`);
