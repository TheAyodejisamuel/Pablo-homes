/* =====================================================================
   PABLO HOMES — API & ANALYTICS LAYER
   ---------------------------------------------------------------------
   The ONLY file the backend developer needs to touch to connect forms.
   Set `enquiryEndpoint` in build/data.js (SITE.enquiryEndpoint) and rebuild,
   or set window.PH_SITE.enquiryEndpoint before this script runs.

   Every enquiry is POSTed as JSON (SRS FR-05):
   {
     type: "inspection" | "details" | "contact",
     source: "property-page" | "inspection-page" | "contact-page",
     property: "PH-1001 – 5-Bedroom Detached Duplex, GRA" | null,
     name, phone, whatsapp, email, date, time, reason, wants[], message,
     page: "<url>", submittedAt: "<ISO date-time>"
   }
   The endpoint should return 2xx on success. Validate and sanitise
   everything server-side, and add rate-limiting / CAPTCHA there.
   ===================================================================== */
(function () {
  var cfg = window.PH_SITE || {};

  function track(event, data) {
    var payload = Object.assign({ event: event }, data || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);              // Google Tag Manager / GA4 ready
    if (typeof window.gtag === 'function') window.gtag('event', event, data || {});
  }

  function submitEnquiry(payload) {
    payload.page = location.href;
    payload.submittedAt = new Date().toISOString();
    track('enquiry_submit', { enquiry_type: payload.type, source: payload.source, property: payload.property || '' });

    if (!cfg.enquiryEndpoint) {
      // No backend yet: hand the enquiry to WhatsApp so it still reaches Pablo Homes.
      return Promise.resolve({ ok: true, delivered: false });
    }
    return fetch(cfg.enquiryEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (r) {
      if (!r.ok) throw new Error('Server responded ' + r.status);
      return { ok: true, delivered: true };
    });
  }

  window.PabloAPI = { track: track, submitEnquiry: submitEnquiry };
})();
