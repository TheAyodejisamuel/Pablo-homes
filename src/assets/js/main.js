/* Pablo Homes — front-end behaviour (no dependencies). */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var body = document.body;
  var WA = body.getAttribute('data-wa');

  /* ---------------- Analytics (SRS §36) ----------------
     Every event goes to window.dataLayer (works with Google Tag Manager)
     and to GA4 if a measurement ID is configured in src/data/site.json. */
  window.dataLayer = window.dataLayer || [];
  var gaId = document.documentElement.getAttribute('data-ga');
  if (gaId) {
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId);
  }
  function track(event, params) {
    params = params || {};
    var prop = $('[data-property-id]');
    if (prop && !params.property_id) params.property_id = prop.getAttribute('data-property-id');
    params.page_path = location.pathname;
    window.dataLayer.push(Object.assign({ event: event }, params));
    if (window.gtag && gaId) window.gtag('event', event, params);
  }
  window.pabloTrack = track;
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (el) track(el.getAttribute('data-track'), { link_url: el.getAttribute('href') || '' });
  });
  var propEl = $('[data-property-id]');
  if (propEl) track('property_view', { property_id: propEl.getAttribute('data-property-id'), property_title: propEl.getAttribute('data-property-title') });

  /* ---------------- Header + navigation ---------------- */
  var header = $('[data-header]');
  var toggle = $('[data-nav-toggle]');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  function setNav(open) {
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
    header.classList.toggle('nav-open', open);
    body.classList.toggle('no-scroll', open);
  }
  if (toggle) {
    toggle.addEventListener('click', function () { setNav(toggle.getAttribute('aria-expanded') !== 'true'); });
    $$('#primary-nav a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setNav(false); toggle.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 960) setNav(false); });
  }

  /* ---------------- Helpers ---------------- */
  var params = new URLSearchParams(location.search);
  var todayISO = (function () { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); })();
  $$('[data-min-today]').forEach(function (i) { i.min = todayISO; });
  $$('input[name="started_at"]').forEach(function (i) { i.value = String(Date.now()); });
  function waUrl(text) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text); }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------------- Hero search: keep URLs clean ---------------- */
  $$('[data-search-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = new URLSearchParams();
      new FormData(form).forEach(function (v, k) { if (v) q.set(k, v); });
      track('property_search', Object.fromEntries(q));
      location.href = form.getAttribute('action') + (q.toString() ? '?' + q.toString() : '');
    });
  });

  /* ---------------- Properties: combined filters + sorting + shareable URL (FR-03) ---------------- */
  var filters = $('[data-filters]');
  if (filters) {
    var grid = $('[data-results]');
    var cards = $$('[data-card]', grid);
    var countEl = $('[data-results-count]');
    var emptyEl = $('[data-empty]');
    var sortEl = $('[data-sort]');
    var more = $('[data-filters-more]');
    var moreBtn = $('[data-filters-toggle]');
    var moreCount = $('[data-filter-count]');
    var ADV = ['baths', 'status', 'listed', 'q'];
    var KEYS = ['purpose', 'location', 'type', 'min', 'max', 'beds', 'baths', 'status', 'listed', 'q'];

    // populate controls from URL
    KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v == null) return;
      var radios = $$('input[type=radio][name="' + k + '"]', filters);
      if (radios.length) radios.forEach(function (r) { r.checked = r.value === v; });
      else { var el = filters.elements[k]; if (el) el.value = v; }
    });
    if (params.get('sort')) sortEl.value = params.get('sort');

    function values() {
      var o = {};
      KEYS.forEach(function (k) {
        var radios = $$('input[type=radio][name="' + k + '"]', filters);
        if (radios.length) { var c = radios.filter(function (r) { return r.checked; })[0]; o[k] = c ? c.value : ''; }
        else o[k] = (filters.elements[k] && filters.elements[k].value || '').trim();
      });
      o.sort = sortEl.value;
      return o;
    }

    function apply(fromUser) {
      var f = values();
      var min = +f.min || 0, max = +f.max || Infinity, beds = +f.beds || 0, baths = +f.baths || 0;
      var since = f.listed ? Date.now() - +f.listed * 864e5 : 0;
      var q = f.q.toLowerCase();
      var shown = 0;
      cards.forEach(function (c) {
        var d = c.dataset;
        var price = d.price === '' ? null : +d.price;
        var ok = (!f.purpose || d.purpose === f.purpose) &&
          (!f.location || d.location === f.location) &&
          (!f.type || d.type === f.type) &&
          (!f.status || d.status === f.status) &&
          (price == null ? !(f.min || f.max) : price >= min && price <= max) &&
          (!beds || (+d.beds || 0) >= beds) &&
          (!baths || (+d.baths || 0) >= baths) &&
          (!since || new Date(d.date + 'T12:00:00').getTime() >= since) &&
          (!q || (d.title + ' ' + d.id + ' ' + d.location + ' ' + d.type + ' ' + c.textContent).toLowerCase().indexOf(q) > -1);
        c.hidden = !ok;
        if (ok) shown++;
      });
      // sort: closed listings (sold/rented) always after open ones
      var closed = function (c) { return c.dataset.status === 'sold' || c.dataset.status === 'rented' ? 1 : 0; };
      cards.slice().sort(function (a, b) {
        var cd = closed(a) - closed(b);
        if (cd) return cd;
        if (f.sort === 'price-asc') return (+a.dataset.price || 0) - (+b.dataset.price || 0);
        if (f.sort === 'price-desc') return (+b.dataset.price || 0) - (+a.dataset.price || 0);
        return b.dataset.date.localeCompare(a.dataset.date);
      }).forEach(function (c) { grid.appendChild(c); });

      countEl.textContent = shown + (shown === 1 ? ' property' : ' properties');
      emptyEl.hidden = shown > 0;
      grid.hidden = shown === 0;

      var adv = ADV.filter(function (k) { return f[k]; }).length;
      moreCount.hidden = !adv;
      moreCount.textContent = adv;

      var url = new URLSearchParams();
      KEYS.forEach(function (k) { if (f[k]) url.set(k, f[k]); });
      if (f.sort && f.sort !== 'newest') url.set('sort', f.sort);
      history.replaceState(null, '', location.pathname + (url.toString() ? '?' + url.toString() : ''));
      if (fromUser) { clearTimeout(apply.t); apply.t = setTimeout(function () { track('property_search', Object.assign({ results: shown }, f)); }, 800); }
    }

    filters.addEventListener('change', function () { apply(true); });
    filters.addEventListener('input', function (e) { if (e.target.name === 'q') apply(true); });
    filters.addEventListener('submit', function (e) { e.preventDefault(); apply(true); });
    sortEl.addEventListener('change', function () { apply(true); });
    moreBtn.addEventListener('click', function () {
      var open = more.classList.toggle('is-open');
      moreBtn.setAttribute('aria-expanded', String(open));
    });
    if (ADV.some(function (k) { return params.get(k); })) { more.classList.add('is-open'); moreBtn.setAttribute('aria-expanded', 'true'); }
    $$('[data-clear-filters]').forEach(function (b) {
      b.addEventListener('click', function () {
        filters.reset();
        $$('input[type=radio][name="purpose"]', filters).forEach(function (r) { r.checked = r.value === ''; });
        sortEl.value = 'newest';
        apply(true);
      });
    });
    var shareSearch = $('[data-share-search]');
    if (shareSearch) shareSearch.addEventListener('click', function () { share(document.title, location.href, shareSearch); });
    apply(false);
  }

  /* ---------------- Share / copy ---------------- */
  function copy(text, btn) {
    var done = function () { if (!btn) return; var t = btn.innerHTML; btn.textContent = 'Link copied'; setTimeout(function () { btn.innerHTML = t; }, 1800); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this link:', text); });
    else window.prompt('Copy this link:', text);
  }
  function share(title, url, btn) {
    track('share', { method: navigator.share ? 'native' : 'copy' });
    if (navigator.share) navigator.share({ title: title, url: url }).catch(function () {});
    else copy(url, btn);
  }
  $$('[data-share]').forEach(function (b) { b.addEventListener('click', function () { share(b.getAttribute('data-share-title') || document.title, location.href.split('#')[0], b); }); });
  $$('[data-copy-link]').forEach(function (b) { b.addEventListener('click', function () { copy(location.href.split('#')[0], b); track('copy_link'); }); });

  /* ---------------- Gallery ---------------- */
  var gal = $('[data-gallery]');
  if (gal) {
    var slides = $$('[data-slide]', gal);
    var thumbs = $$('[data-thumb]', gal);
    var idxEl = $('[data-gallery-index]', gal);
    var cur = 0;
    var go = function (i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === cur); s.hidden = n !== cur; });
      thumbs.forEach(function (t, n) { t.setAttribute('aria-selected', String(n === cur)); });
      idxEl.textContent = cur + 1;
    };
    $('[data-gallery-prev]', gal).addEventListener('click', function () { go(cur - 1); });
    $('[data-gallery-next]', gal).addEventListener('click', function () { go(cur + 1); });
    thumbs.forEach(function (t) { t.addEventListener('click', function () { go(+t.getAttribute('data-thumb')); }); });
    gal.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') go(cur - 1); if (e.key === 'ArrowRight') go(cur + 1); });
    var x0 = null;
    var main = $('.gallery-main', gal);
    main.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    main.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  /* ---------------- Dialog ---------------- */
  $$('[data-open-dialog]').forEach(function (b) {
    b.addEventListener('click', function () {
      var d = document.getElementById(b.getAttribute('data-open-dialog'));
      if (!d) return;
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
      track('details_request_open');
      var first = $('input:not([type=hidden]):not([tabindex="-1"])', d);
      if (first) first.focus();
    });
  });
  $$('dialog').forEach(function (d) {
    $$('[data-close-dialog]', d).forEach(function (b) { b.addEventListener('click', function () { d.close ? d.close() : d.removeAttribute('open'); }); });
    d.addEventListener('click', function (e) { if (e.target === d && d.close) d.close(); });
  });

  /* "Book an Inspection" anchors focus the form */
  $$('a[href="#inspection"]').forEach(function (a) {
    a.addEventListener('click', function () { setTimeout(function () { var f = $('#inspection input[name="name"]'); if (f) f.focus({ preventScroll: true }); }, 450); });
  });

  /* Book-inspection page: auto-fill property from ?property=PH-1234 */
  var propParam = params.get('property');
  if (propParam) $$('[data-property-select]').forEach(function (s) { if ($('option[value="' + CSS.escape(propParam) + '"]', s)) s.value = propParam; });

  /* ---------------- Forms (inspection, details, contact) ---------------- */
  var LABELS = { inspection: 'inspection request', details: 'details request', contact: 'message' };
  var phoneRe = /^\+?[0-9][0-9\s()-]{6,19}$/;
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setError(input, msg) {
    var wrap = input.closest('.field');
    var err = wrap && $('.field-error', wrap);
    if (wrap) wrap.classList.toggle('has-error', !!msg);
    if (err) err.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) input.setAttribute('aria-describedby', err.id);
  }
  function fieldMessage(i) {
    var v = i.value.trim();
    if (i.required && !v) return 'This field is required.';
    if (v && i.type === 'email' && !emailRe.test(v)) return 'Please enter a valid email address.';
    if (v && i.type === 'tel' && !phoneRe.test(v)) return 'Please enter a valid phone number.';
    if (v && i.type === 'date' && v < todayISO) return 'Please choose today or a future date.';
    return '';
  }
  function fields(form) { return $$('input, select, textarea', form).filter(function (i) { return i.type !== 'hidden' && !i.closest('.hp'); }); }
  function validate(form) {
    var first = null;
    fields(form).forEach(function (i) {
      var msg = fieldMessage(i);
      setError(i, msg);
      if (msg && !first) first = i;
    });
    if (first) first.focus();
    return !first;
  }
  function summary(data) {
    var lines = ['Hello Pablo Homes, I tried to send a ' + (LABELS[data.type] || 'message') + ' on your website:'];
    if (data.propertyTitle) lines.push('Property: ' + data.propertyTitle + (data.propertyId ? ' (Ref: ' + data.propertyId + ')' : ''));
    if (data.date) lines.push('Preferred date: ' + data.date + (data.time ? ', ' + data.time : ''));
    if (data.reason) lines.push('Reason: ' + data.reason);
    if (data.name) lines.push('Name: ' + data.name);
    if (data.message) lines.push(data.message);
    return lines.join('\n');
  }

  $$('form[data-form]').forEach(function (form) {
    fields(form).forEach(function (i) {
      // re-check a field once the visitor fixes it (never moves focus)
      var recheck = function () { if (i.closest('.field.has-error')) setError(i, fieldMessage(i)); };
      i.addEventListener('blur', recheck);
      i.addEventListener('change', recheck);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = $('.form-status', form);
      status.className = 'form-status';
      status.textContent = '';
      if (!validate(form)) return;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
      var sel = form.elements.propertyId;
      if (sel && sel.tagName === 'SELECT' && sel.value) data.propertyTitle = sel.options[sel.selectedIndex].text.replace(/^[A-Z]+-\d+ — /, '');
      else if (propEl && data.propertyId) data.propertyTitle = propEl.getAttribute('data-property-title');
      data.source = location.pathname;
      var btn = $('button[type=submit]', form);
      var btnText = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Sending…';

      fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || 'Request failed'); return j; }); })
        .then(function (j) {
          track(data.type === 'inspection' ? 'inspection_request' : data.type === 'details' ? 'details_request' : 'contact_submit', { property_id: data.propertyId || '' });
          var isInspection = data.type === 'inspection';
          form.innerHTML = '<div class="form-success" tabindex="-1">' +
            '<h3>' + (isInspection ? 'Inspection request received' : data.type === 'details' ? 'Request received' : 'Message sent') + '</h3>' +
            '<p>' + (isInspection
              ? 'Thank you, ' + escapeHtml(data.name.split(' ')[0]) + '. This is a <strong>request</strong> — Pablo Homes will contact you to confirm the date and time before your appointment is booked.'
              : 'Thank you, ' + escapeHtml(data.name.split(' ')[0]) + '. Pablo Homes will get back to you as soon as possible.') + '</p>' +
            (j.ref ? '<p class="fineprint">Your reference: <strong>' + escapeHtml(j.ref) + '</strong></p>' : '') +
            '<div class="form-fallback"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" data-track="whatsapp_click" href="' + waUrl(summary(data) + (j.ref ? '\nReference: ' + j.ref : '')) + '">Follow up on WhatsApp</a></div></div>';
          $('.form-success', form).focus();
        })
        .catch(function () {
          btn.disabled = false;
          btn.innerHTML = btnText;
          status.className = 'form-status is-error';
          status.innerHTML = 'Sorry — we couldn’t send that just now. Please try again, or send it straight to Pablo Homes on WhatsApp:' +
            '<div class="form-fallback"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" data-track="whatsapp_click" href="' + waUrl(summary(data)) + '">Send on WhatsApp</a>' +
            '<a class="btn btn-outline btn-sm" href="tel:' + body.getAttribute('data-phone') + '" data-track="call_click">Call instead</a></div>';
          track('form_error', { form: data.type });
        });
    });
  });

  /* ---------------- Insights topic chips ---------------- */
  var chips = $('[data-chips]');
  if (chips) {
    chips.addEventListener('click', function (e) {
      var c = e.target.closest('[data-chip]');
      if (!c) return;
      var cat = c.getAttribute('data-chip');
      $$('[data-chip]', chips).forEach(function (x) { var on = x === c; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
      $$('[data-posts] [data-cat]').forEach(function (p) { p.hidden = !!cat && p.getAttribute('data-cat') !== cat; });
    });
  }

  /* ---------------- Admin: view enquiries ---------------- */
  var adminForm = $('[data-admin-login]');
  if (adminForm) {
    var tokenEl = $('#admin-token');
    var typeEl = $('[data-admin-type]');
    var table = $('[data-admin-table]');
    var stat = $('[data-admin-status]');
    var csvBtn = $('[data-admin-csv]');
    var rows = [];
    try { tokenEl.value = sessionStorage.getItem('ph-admin') || ''; } catch (e) {}
    adminForm.addEventListener('submit', function (e) {
      e.preventDefault();
      try { sessionStorage.setItem('ph-admin', tokenEl.value); } catch (err) {}
      stat.textContent = 'Loading…';
      fetch('/api/leads' + (typeEl.value ? '?type=' + encodeURIComponent(typeEl.value) : ''), { headers: { Authorization: 'Bearer ' + tokenEl.value } })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Error ' + r.status); return j; }); })
        .then(function (j) {
          rows = j.items || [];
          stat.textContent = rows.length + ' record' + (rows.length === 1 ? '' : 's');
          $('tbody', table).innerHTML = rows.map(function (r) {
            return '<tr><td>' + escapeHtml(new Date(r.receivedAt).toLocaleString('en-GB')) + '</td><td>' + escapeHtml(r.type) + '</td><td>' + escapeHtml(r.name) + '</td><td>' +
              escapeHtml([r.phone, r.whatsapp && 'WA: ' + r.whatsapp, r.email].filter(Boolean).join('\n')) + '</td><td>' + escapeHtml(r.propertyId ? r.propertyId + ' — ' + (r.propertyTitle || '') : '') +
              '</td><td>' + escapeHtml([r.date, r.time].filter(Boolean).join(' ')) + '</td><td>' + escapeHtml([r.reason, r.message].filter(Boolean).join(': ')) + '</td><td>' + escapeHtml(r.source) + '</td></tr>';
          }).join('');
          table.hidden = false;
          csvBtn.disabled = !rows.length;
        })
        .catch(function (err) { stat.textContent = err.message; table.hidden = true; });
    });
    csvBtn.addEventListener('click', function () {
      var cols = ['receivedAt', 'ref', 'type', 'name', 'phone', 'whatsapp', 'email', 'propertyId', 'propertyTitle', 'date', 'time', 'reason', 'message', 'source'];
      var csv = [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return '"' + String(r[c] == null ? '' : r[c]).replace(/"/g, '""') + '"'; }).join(','); })).join('\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'pablo-homes-enquiries.csv';
      a.click();
    });
  }

  /* ---------------- Subtle reveal on scroll ---------------- */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var targets = $$('.section-head, .card, .type-tile, .service-card, .principles li, .post-card, .split-media, .service-row, .process li, .audience li');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) {
        var el = en.target;
        el.classList.add('is-visible');
        io.unobserve(el);
        setTimeout(function () { el.classList.remove('reveal', 'is-visible'); }, 900); // hand transforms back to hover styles
      } });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (t) {
      if (t.getBoundingClientRect().top < window.innerHeight) return; // already in view: no animation
      t.classList.add('reveal');
      io.observe(t);
    });
  }
})();
