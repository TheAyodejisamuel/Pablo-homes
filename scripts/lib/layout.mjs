import { esc, waLink, CATEGORIES } from './util.mjs';
import { icon } from './components.mjs';

const NAV = [
  ['/', 'Home'],
  ['/properties/', 'Properties'],
  ['/services/', 'Services'],
  ['/investment/', 'Investment'],
  ['/about/', 'About'],
  ['/insights/', 'Insights'],
  ['/contact/', 'Contact'],
];

export function layout(site, page) {
  const {
    title, description, path, body, jsonLd = [], ogImage = '/images/og-default.jpg',
    noindex = false, overlayHeader = false, waText, inspectHref = '/book-inspection/', bodyClass = '', version,
  } = page;
  const url = site.siteUrl.replace(/\/$/, '') + path;
  const fullTitle = path === '/' ? `${site.name} | Property for Sale, Rent & Land in Benin City` : `${title} | ${site.name}`;
  const ogAbs = ogImage.startsWith('http') ? ogImage : site.siteUrl.replace(/\/$/, '') + ogImage;
  const wa = waLink(site.whatsapp, waText || 'Hello Pablo Homes, I found you on your website and would like some information about your properties.');
  const isActive = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  const ld = jsonLd.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');

  return `<!doctype html>
<html lang="en-NG"${site.gaMeasurementId ? ` data-ga="${esc(site.gaMeasurementId)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${esc(url)}">`}
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title || fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(ogAbs)}">
<meta property="og:locale" content="${site.locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#151413">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/css/styles.css?v=${version}">
<script src="/assets/js/main.js?v=${version}" defer></script>
${site.gaMeasurementId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(site.gaMeasurementId)}"></script>` : ''}
${ld}
</head>
<body class="${bodyClass}" data-wa="${esc(site.whatsapp)}" data-phone="${esc(site.phoneIntl)}">
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header${overlayHeader ? ' site-header--overlay' : ''}" data-header>
  <div class="container header-inner">
    <a class="wordmark" href="/" aria-label="${esc(site.name)} — home">PABLO<span>HOMES</span></a>
    <nav class="primary-nav" id="primary-nav" aria-label="Main">
      <ul>${NAV.map(([href, label]) => `<li><a href="${href}"${isActive(href) ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul>
      <div class="nav-mobile-extra">
        <a class="btn btn-primary btn-block" href="/properties/">View Properties</a>
        <a class="nav-contact" href="tel:${site.phoneIntl}" data-track="call_click">${icon('phone')} ${esc(site.phoneDisplay)}</a>
      </div>
    </nav>
    <a class="btn btn-primary header-cta" href="/properties/">View Properties</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" data-nav-toggle>
      <span class="sr-only">Open menu</span><span class="bars" aria-hidden="true"></span>
    </button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a class="wordmark wordmark--light" href="/">PABLO<span>HOMES</span></a>
      <p>${esc(site.tagline)}. Browse homes for sale and rent, land, shortlets, commercial and off-plan opportunities.</p>
      <div class="footer-actions">
        <a class="btn btn-wa btn-sm" href="${wa}" target="_blank" rel="noopener" data-track="whatsapp_click">${icon('chat')}<span>WhatsApp</span></a>
        <a class="btn btn-ghost-light btn-sm" href="tel:${site.phoneIntl}" data-track="call_click">${icon('phone')}<span>Call</span></a>
      </div>
    </div>
    <nav aria-label="Explore">
      <h2 class="footer-title">Explore</h2>
      <ul>${NAV.slice(1).map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}<li><a href="/faq/">FAQ</a></li><li><a href="/book-inspection/">Book an Inspection</a></li></ul>
    </nav>
    <nav aria-label="Property types">
      <h2 class="footer-title">Property types</h2>
      <ul>${Object.entries(CATEGORIES).map(([k, v]) => `<li><a href="/properties/?type=${k}">${v.plural}</a></li>`).join('')}</ul>
    </nav>
    <div>
      <h2 class="footer-title">Contact</h2>
      <ul class="footer-contact">
        <li><a href="tel:${site.phoneIntl}" data-track="call_click">${icon('phone')} ${esc(site.phoneDisplay)}</a></li>
        <li><a href="mailto:${esc(site.email)}" data-track="email_click">${icon('mail')} <span class="break">${esc(site.email)}</span></a></li>
        <li>${icon('pin')} ${esc(site.address || `${site.city}, ${site.state}, ${site.country}`)}</li>
      </ul>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>© ${new Date().getFullYear()} ${esc(site.name)}. All rights reserved.</p>
    <p><a href="/privacy/">Privacy</a> · <a href="/faq/">FAQ</a> · <a href="/sitemap.xml">Sitemap</a></p>
  </div>
</footer>
<a class="wa-float" href="${wa}" target="_blank" rel="noopener" data-track="whatsapp_click" aria-label="Chat with Pablo Homes on WhatsApp">${icon('chat')}</a>
<nav class="mobile-cta" aria-label="Quick contact">
  <a href="tel:${site.phoneIntl}" data-track="call_click">${icon('phone')}<span>Call</span></a>
  <a href="${wa}" target="_blank" rel="noopener" data-track="whatsapp_click" class="mobile-cta-wa">${icon('chat')}<span>WhatsApp</span></a>
  <a href="${inspectHref}" data-track="inspection_cta">${icon('calendar')}<span>Inspect</span></a>
</nav>
</body>
</html>`;
}
