# Pablo Homes — Real Estate Website

Premium, mobile-first property website for **Pablo Homes, Benin City** — built to the Pablo Homes SRS.

- **Front end:** fast static pages generated from simple JSON data files (no framework, no heavy scripts)
- **Back end:** serverless API on Netlify Functions for inspection bookings, property-details requests and contact messages, with validation, spam protection and storage
- **Admin seed:** a protected `/admin/` page to view and export every enquiry (ready to grow into the full dashboard in SRS §19)

---

## 1. What's included

| Area | Where |
|---|---|
| Home (hero search, featured, browse by type, services, why us, recently added, investment, insights) | `/` |
| Properties with combined filters, sorting and shareable URLs | `/properties/?purpose=buy&type=duplex&beds=4…` |
| One page per property with SEO-friendly URL, gallery, details, amenities, payment plan, video, map, inspection form, WhatsApp/Call/Request Details, sharing, similar properties | `/properties/<title>-<area>-<ref>/` |
| Book an Inspection (auto-fills from `?property=PH-1001`) | `/book-inspection/` |
| About · Services · Investment · Insights (+ 6 articles) · FAQ · Contact · Privacy · 404 | |
| Enquiry API | `POST /api/enquiry` |
| Admin enquiries viewer + CSV export | `/admin/` → `GET /api/leads` |
| SEO: unique titles, meta descriptions, canonical URLs, Open Graph, JSON-LD (RealEstateAgent, RealEstateListing, Article, FAQPage, Breadcrumbs), `sitemap.xml`, `robots.txt` | generated on build |
| Floating WhatsApp button, sticky mobile Call/WhatsApp/Inspect bar, click-to-call | every page |
| Analytics events: page/property views, searches, WhatsApp clicks, call clicks, inspection requests, form submissions, shares | `window.dataLayer` + GA4 |
| Security headers (CSP, HSTS, frame protection), input validation, honeypot + timing spam traps, rate limiting | `netlify.toml`, `netlify/functions/` |

## 2. Project structure

```
src/data/site.json         Business details (phone, email, WhatsApp, domain, GA id, demo mode)
src/data/properties.json   Property listings  ← edit this to add/change listings
src/data/posts.json        Insights articles
src/data/faqs.json         FAQ questions & answers
src/assets/                CSS and JavaScript
src/static/                Files copied as-is (favicon, share image, real property photos)
scripts/build.mjs          Generates the whole site into /dist
netlify/functions/         Back-end API (enquiry.mjs, leads.mjs)
tests/                     API tests (npm test)
```

## 3. Run it on your computer

Needs Node.js 20+.

```bash
npm install
npm run dev        # builds and serves at http://localhost:8888
npm test           # runs the API tests
```

Locally, enquiries are saved in `.data/`. The admin page key is `local-admin-key`.

## 4. Publish (GitHub → Netlify)

1. Create a new GitHub repository and upload this folder (everything except `node_modules`, `dist`, `.data`).
2. In Netlify: **Add new project → Import from Git → choose the repo**. Netlify reads `netlify.toml` automatically (build `npm run build`, publish `dist`).
3. In **Project configuration → Environment variables**, add:

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_TOKEN` | Yes | Password for `/admin/` (12+ characters, keep it private) |
| `RESEND_API_KEY` | Recommended | Sends an email for every new enquiry ([resend.com](https://resend.com), free tier) |
| `NOTIFY_EMAIL` | With Resend | Where enquiry emails go, e.g. `websitedesignmasterclass@gmail.com` (comma-separate several) |
| `FROM_EMAIL` | Optional | Sender, e.g. `Pablo Homes <enquiries@yourdomain.com>` (needs a verified domain in Resend) |
| `NOTIFY_WEBHOOK_URL` | Optional | Also POST each enquiry to Zapier / Make / Google Sheets / Slack |

4. Update `siteUrl` in `src/data/site.json` to the live domain, then redeploy.

Every enquiry is always stored (Netlify Blobs) and visible at `/admin/`. Email/webhook notifications are extra. If storage and notifications both fail, the visitor is shown a one-tap WhatsApp fallback with their request pre-written — no lead is silently lost.

## 5. Adding or editing a property

Open `src/data/properties.json` and copy an existing entry:

```json
{
  "id": "PH-1013",                      // unique reference, shown to customers
  "title": "4-Bedroom Detached Duplex",
  "category": "duplex",                 // land | apartment | duplex | terrace | commercial | shortlet | offplan
  "purpose": "sale",                    // sale | rent | shortlet
  "status": "for-sale",                 // available | for-sale | for-rent | off-plan | sold | rented
  "location": { "area": "GRA", "city": "Benin City", "state": "Edo State" },
  "price": 150000000,
  "priceUnit": "",                      // "" for sale, "year" for rent, "night" for shortlets
  "pricePrefix": "",                    // e.g. "From" for off-plan
  "bedrooms": 4, "bathrooms": 5,        // use null for land
  "size": 300,                          // m², or null
  "landSize": "1 plot (approx. 100 × 100 ft)",
  "paymentPlan": "",
  "description": "Paragraph one.\n\nParagraph two.",
  "amenities": ["BQ", "Borehole"],
  "images": ["/images/properties/ph-1013/1.jpg", "/images/properties/ph-1013/2.jpg"],
  "video": "https://youtu.be/XXXXXXXXXXX",   // YouTube link or .mp4 path, or ""
  "featured": true,                     // show on the home page
  "investment": false,                  // show on the Investment page
  "dateAdded": "2026-11-01",
  "sample": false
}
```

The build checks the data and stops with a clear message if something required is missing (e.g. bedrooms on a house). Bedrooms/bathrooms are optional for land and commercial (FR-02).

**Adding real photos:** put them in `src/static/images/properties/<ref>/` (JPG or WebP, ~1600px wide, 3:2 ratio, under ~300 KB each) and list them in `images`. Genuine photos always take priority. While a listing has no real photos, it uses the stock photos named in `stockImages` (or its category's defaults), and the gallery is labelled "Sample stock photos — not this property". Stock photos must never be published as though they are the actual property (SRS §27) — remove `stockImages` and set `"sample": false` once real photos are in.

### Stock photography (SRS visual asset plan)

General sections (hero, services, property-type tiles, investment, About, Contact, inspection, insights covers and the CTA banner) use real architectural, interior and land photography from Unsplash — no sketches, illustrations or placeholders.

- `src/data/photos.json` is the **image source log**: every photo's Unsplash ID (`https://images.unsplash.com/photo-<id>`), alt text and licence (Unsplash License — free for commercial use, no attribution required), plus which photo is used in each section, category and insights topic.
- Optimised WebP files are in `src/static/images/photos/<key>-<640|1280|1920>.webp` and are served with `srcset`, so phones download the small size. Listing grids and galleries lazy-load.
- To swap a photo: add a new entry to `photos.json`, save `<key>-640.webp` and `<key>-1280.webp` (3:2, add `-1920` for heroes), then point a section/category at the new key. The build stops if a file is missing.
- No stock photo shows a recognisable person presented as staff or a client, and no third-party logos are prominent.

**New cities:** just use a different `city`/`state` in `location` — the location filter groups areas by city automatically.

## 6. Before going live — checklist

These come from SRS §38 and the content rules in the SRS:

- [ ] Replace the 12 **sample listings** with real properties, genuine photos and prices (remove their `stockImages`); then set `"demoMode": false` in `site.json` (removes the preview notice)
- [ ] Optionally replace general stock photos with Pablo Homes' own photography (office, team, Benin City) when available
- [ ] Confirm **08076873445** is the official WhatsApp number
- [ ] Set the live domain in `siteUrl`
- [ ] Add office address and opening hours to `site.json` (the Contact page shows them automatically); add a map once the address is confirmed
- [ ] Have Pablo Homes **approve the FAQ answers** and **payment-plan wording** (company policy must be confirmed — SRS §16)
- [ ] Approve the About page wording; add company story, mission and vision when supplied
- [ ] Replace the temporary **PABLO HOMES** wordmark when a logo is approved; adjust colours in `styles.css` `:root` if brand colours are chosen
- [ ] Complete the Privacy notice with company-specific details
- [ ] Add `gaMeasurementId` (GA4) in `site.json` for analytics
- [ ] Set `ADMIN_TOKEN` and email notifications in Netlify
- [ ] Submit `https://<domain>/sitemap.xml` to Google Search Console

## 7. Notes for the future admin dashboard (SRS §19, §40)

- Listings already live in one structured data file and are published as `/properties.json`, so a CMS (Decap, Sanity, Supabase…) can replace the JSON file without touching page templates.
- Enquiries are stored as structured records (type, name, contacts, property, preferred date/time, message, page source, timestamp, reference) — the `/admin/` page is the first screen of the future dashboard.
- No customer accounts or online payments, by design (SRS §20–21).
