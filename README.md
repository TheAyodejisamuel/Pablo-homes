# Pablo Homes website (front end)

A static, responsive, multi-page real estate website built to the Pablo Homes SRS. It has no backend yet: forms validate in the browser and hand each enquiry to WhatsApp (with an email fallback), so enquiries still reach Pablo Homes today.

## Viewing it

Open `site/index.html` in any browser. You need an internet connection because the photos load from Unsplash's CDN.

To host it, upload the contents of `site/` to any static host (Netlify, Vercel, cPanel, GitHub Pages). No server code is needed.

## Folder structure

```
build/
  data.js     All content: listings, insights, FAQ, contact details, image IDs
  build.js    Generates every page into site/ (no dependencies, Node 16+)
site/         The finished website, ready to upload
  index.html, about.html, properties.html, services.html, investment.html,
  insights.html, faq.html, contact.html, book-inspection.html, 404.html
  properties/<seo-friendly-slug>.html   one page per listing
  insights/<slug>.html                  one page per article
  assets/css/style.css
  assets/js/api.js        form submission and analytics (the only file the backend dev must touch)
  assets/js/main.js       menu, dialogs, forms, gallery, map, sharing
  assets/js/listings.js   search, filters, sorting and shareable URLs
  assets/js/data.js       generated listing data for the search page
  sitemap.xml, robots.txt
```

## Editing content

Edit `build/data.js`, then run:

```
node build/build.js
SITE_URL=https://www.your-domain.com node build/build.js   # once the domain is known
```

Setting `SITE_URL` adds canonical tags and Open Graph URLs, and writes real URLs into the sitemap. Without it, the sitemap uses `example.com` as a placeholder.

## What's included (SRS cross-reference)

| SRS item | Where |
|---|---|
| §8 Home: hero, search (Buy/Rent, location, type, min/max price, bedrooms), featured, browse by type, services, why us, investment preview | `index.html` |
| §9 Properties: combined filters, status filter, sorting, shareable filtered URLs (FR-03) | `properties.html` |
| §10 Property details: ref, status, type, price, payment plan, location, map, rooms, sizes, description, gallery, video, amenities, all four CTAs | `properties/*.html` |
| §11 WhatsApp message prefilled with property name and reference | every property page |
| §12 Inspection booking: all fields, property auto-filled, "request until confirmed" wording | property page dialog and `book-inspection.html?property=PH-1001` |
| §13–17 Services, Investment, Insights, FAQ, Contact | their pages |
| FR-02 conditional fields (no bedrooms on land, etc.) | `build/data.js` and templates |
| FR-04 statuses: Available, For Sale, For Rent, Off-plan, Sold, Rented | listings and filters |
| FR-05 enquiry capture: name, contacts, property, source, message, date/time | `assets/js/api.js` payload |
| §22 floating WhatsApp, click-to-call, sticky mobile bar, map, video support, social sharing, similar and recently added properties, SEO URLs, honeypot spam protection, analytics events | throughout |
| §32 SEO: unique titles, meta descriptions, semantic HTML, JSON-LD (RealEstateListing, RealEstateAgent, FAQPage, Article, Breadcrumbs), alt text, sitemap, robots, Open Graph | throughout |
| §35 Accessibility: labels, focus states, keyboard support, skip link, reduced motion, contrast | throughout |

## Connecting the backend later

1. Build an endpoint that accepts the JSON described at the top of `site/assets/js/api.js`.
2. Set `enquiryEndpoint` in `build/data.js` and rebuild. Forms will then POST there and show "Request sent" instead of the WhatsApp step.
3. For the admin dashboard, the arrays in `build/data.js` map directly to `properties`, `articles` and `faqs` tables. Replace `assets/js/data.js` with an API call, and render property pages server-side or rebuild on publish.
4. Server-side: validate and sanitise all input, add rate limiting or a CAPTCHA, and serve over HTTPS.

## Analytics

`api.js` pushes events to `window.dataLayer`, which Google Tag Manager or GA4 can pick up as soon as their tag is added: `whatsapp_click`, `call_click`, `email_click`, `property_search`, `inspection_open`, `details_open`, `enquiry_submit`, `share_click`. Property page views come from the standard page-view tag.

## Before launch: content Pablo Homes must supply or confirm

- **All 12 listings are SAMPLE content** with stock photos and are labelled "Sample listing". Replace them with real listings and genuine photos and videos before launch (SRS §27).
- Confirm that 0807 687 3445 is the official WhatsApp number.
- Company description, story, mission and vision (the About page uses careful general copy for now)
- Office address and opening hours (then add a map to the Contact page)
- Domain name (set `SITE_URL`), social media links, approved logo (a temporary "PABLO HOMES" wordmark is used), final brand colours
- Privacy policy and legal disclaimers
- **FAQ answers that describe company policy** (marked `confirm: true` in `build/data.js`): documents before payment, negotiation, rental costs, shortlet minimum stay, land instalments, inspection fees, buying from abroad, representatives at inspections
- Sample payment plans on PH-1004 and PH-1006
- The six Insights articles are general guidance. Have them reviewed before publishing.

## Images

See `IMAGE-SOURCES.md` for the photo log.
