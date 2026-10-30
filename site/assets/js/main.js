/* PABLO HOMES — site behaviour (no dependencies) */
(function () {
  'use strict';
  var SITE = window.PH_SITE || {};
  var api = window.PabloAPI || { track: function () {}, submitEnquiry: function () { return Promise.resolve({ ok: true, delivered: false }); } };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var waURL = function (msg) { return 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(msg); };

  /* ---------- header ---------- */
  var header = $('[data-header]');
  if (header && header.classList.contains('over-hero')) {
    var onScroll = function () { header.classList.toggle('is-solid', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  var toggle = $('[data-nav-toggle]');
  var nav = $('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      header.classList.toggle('menu-open', open);
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { toggle.click(); toggle.focus(); }
    });
  }

  /* ---------- analytics: WhatsApp, call, email clicks ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-track]');
    if (t) api.track(t.getAttribute('data-track'), { property: t.getAttribute('data-property') || '', page: location.pathname });
  });

  /* ---------- dialogs ---------- */
  function openDialog(d) {
    if (!d) return;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    var f = d.querySelector('input:not([type=hidden]):not([tabindex="-1"]), select, textarea');
    if (f) setTimeout(function () { f.focus(); }, 30);
  }
  function closeDialog(d) { if (!d) return; if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); }
  $$('[data-open-dialog]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-open-dialog');
      api.track(id === 'dlg-inspect' ? 'inspection_open' : 'details_open', { page: location.pathname });
      openDialog(document.getElementById(id));
    });
  });
  $$('.dlg').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) closeDialog(d); });
    $$('[data-close-dialog]', d).forEach(function (b) { b.addEventListener('click', function () { closeDialog(d); }); });
  });

  /* ---------- forms ---------- */
  var today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  $$('[data-min-today]').forEach(function (i) { i.min = today.toISOString().slice(0, 10); });

  $$('[data-same-as-phone]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      var form = cb.form, wa = form.elements.whatsapp, ph = form.elements.phone;
      if (cb.checked) { wa.value = ph.value; wa.readOnly = true; } else { wa.readOnly = false; }
    });
  });

  var MESSAGES = {
    valueMissing: 'Please fill in this field.',
    typeMismatch: 'Please enter a valid email address.',
    patternMismatch: 'Please enter a valid phone number, for example 0807 687 3445.',
    rangeUnderflow: 'Please choose today or a later date.',
  };
  function fieldError(el) {
    var v = el.validity;
    if (v.valid) return '';
    if (v.valueMissing) return el.tagName === 'SELECT' ? 'Please choose an option.' : MESSAGES.valueMissing;
    if (v.typeMismatch) return MESSAGES.typeMismatch;
    if (v.patternMismatch) return MESSAGES.patternMismatch;
    if (v.rangeUnderflow) return MESSAGES.rangeUnderflow;
    return 'Please check this field.';
  }
  function showFieldError(el, msg) {
    var wrap = el.closest('.field'); if (!wrap) return;
    var m = wrap.querySelector('.field-msg');
    wrap.classList.toggle('invalid', !!msg);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) {
      if (!m) { m = document.createElement('p'); m.className = 'field-msg'; m.id = el.id + '-err'; wrap.appendChild(m); }
      m.textContent = msg; el.setAttribute('aria-describedby', m.id);
    } else if (m) { m.remove(); el.removeAttribute('aria-describedby'); }
  }

  var LABELS = { property: 'Property', name: 'Name', phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email', date: 'Preferred date', time: 'Preferred time', reason: 'Reason', wants: 'Requested', message: 'Message' };
  var TITLES = {
    inspection: { sent: 'Inspection request sent', todo: 'One more step: send your request' },
    details: { sent: 'Request sent', todo: 'One more step: send your request' },
    contact: { sent: 'Message sent', todo: 'One more step: send your message' },
  };
  var INTRO = { inspection: 'Hello Pablo Homes, I would like to book an inspection.', details: 'Hello Pablo Homes, please send me more details about this property.', contact: 'Hello Pablo Homes, I have an enquiry.' };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function prettyDate(iso) { try { return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return iso; } }

  $$('form[data-enquiry]').forEach(function (form) {
    var type = form.getAttribute('data-enquiry');
    var errBox = $('.form-error', form);
    $$('input, select, textarea', form).forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value) showFieldError(el, fieldError(el)); });
      el.addEventListener('input', function () { if (el.closest('.field.invalid')) showFieldError(el, fieldError(el)); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errBox.hidden = true;
      // honeypot: bots fill hidden fields; silently stop
      if (form.elements.company && form.elements.company.value) return;

      var first = null;
      $$('input, select, textarea', form).forEach(function (el) {
        if (el.type === 'hidden' || el.closest('.hp')) return;
        var msg = fieldError(el); showFieldError(el, msg);
        if (msg && !first) first = el;
      });
      if (first) { errBox.textContent = 'Please correct the highlighted fields.'; errBox.hidden = false; first.focus(); return; }

      var data = { type: type, source: form.getAttribute('data-source') };
      var fd = new FormData(form);
      fd.forEach(function (v, k) {
        if (k === 'company') return;
        v = String(v).trim().slice(0, 2000);
        if (k === 'wants') { (data.wants = data.wants || []).push(v); } else if (v) data[k] = v;
      });

      var btn = $('button[type=submit]', form);
      btn.disabled = true; var label = btn.textContent; btn.textContent = 'Sending…';

      api.submitEnquiry(Object.assign({}, data)).then(function (res) {
        var done = form.nextElementSibling;
        var lines = Object.keys(LABELS).filter(function (k) { return data[k] && (k !== 'whatsapp' || data.whatsapp !== data.phone); })
          .map(function (k) { var v = data[k]; if (k === 'date') v = prettyDate(v); if (Array.isArray(v)) v = v.join(', '); return [LABELS[k], v]; });
        var waText = INTRO[type] + '\n\n' + lines.map(function (l) { return l[0] + ': ' + l[1]; }).join('\n');
        var mailHref = 'mailto:' + SITE.email + '?subject=' + encodeURIComponent((type === 'inspection' ? 'Inspection request' : type === 'details' ? 'Property details request' : 'Website enquiry') + (data.property ? ' - ' + data.property : '')) + '&body=' + encodeURIComponent(waText);

        $('.form-done-h', done).textContent = TITLES[type][res.delivered ? 'sent' : 'todo'];
        var p = '';
        if (res.delivered) {
          p = type === 'inspection' ? 'Thank you. Your inspection is a request until Pablo Homes calls or messages you to confirm the date and time.' : 'Thank you. Pablo Homes will get back to you shortly.';
        } else {
          p = type === 'inspection'
            ? 'Tap the button below to send these details to Pablo Homes on WhatsApp. Your inspection is a request until Pablo Homes confirms the date and time.'
            : 'Tap the button below to send these details to Pablo Homes on WhatsApp, or send them by email.';
        }
        $('.form-done-p', done).innerHTML = esc(p) + '<dl class="form-summary">' + lines.map(function (l) { return '<div><dt>' + esc(l[0]) + '</dt><dd>' + esc(l[1]) + '</dd></div>'; }).join('') + '</dl>';
        var actions = $('.form-done-actions', done);
        actions.innerHTML = '';
        if (!res.delivered) {
          var wa = document.createElement('a');
          wa.className = 'btn btn-wa'; wa.target = '_blank'; wa.rel = 'noopener'; wa.href = waURL(waText);
          wa.textContent = 'Send on WhatsApp';
          wa.addEventListener('click', function () { api.track('whatsapp_click', { property: data.property || '', from: type + '_form' }); });
          var em = document.createElement('a');
          em.className = 'btn btn-outline'; em.href = mailHref; em.textContent = 'Send by email instead';
          actions.appendChild(wa); actions.appendChild(em);
        }
        var again = document.createElement('button');
        again.type = 'button'; again.className = 'link-quiet'; again.textContent = 'Edit details';
        again.addEventListener('click', function () { done.hidden = true; form.hidden = false; btn.disabled = false; btn.textContent = label; });
        actions.appendChild(again);

        form.hidden = true; done.hidden = false; done.focus();
      }).catch(function () {
        btn.disabled = false; btn.textContent = label;
        errBox.innerHTML = 'Your request could not be sent. Please try again, or message us on <a href="' + waURL(INTRO[type]) + '" target="_blank" rel="noopener">WhatsApp</a>.';
        errBox.hidden = false;
      });
    });
  });

  /* ---------- gallery lightbox ---------- */
  var lb = $('[data-lightbox]');
  if (lb && window.PH_GALLERY) {
    var G = window.PH_GALLERY, idx = 0, lastFocus = null;
    var lbImg = $('[data-lb-img]', lb), lbCap = $('[data-lb-cap]', lb);
    var show = function (i) {
      idx = (i + G.length) % G.length;
      lbImg.dataset.fbi = 0; lbImg.classList.remove('img-failed');
      lbImg.src = G[idx].src; lbImg.alt = G[idx].alt;
      lbCap.textContent = (idx + 1) + ' / ' + G.length;
    };
    var openLb = function (i) { lastFocus = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; $('[data-lb-close]', lb).focus(); };
    var closeLb = function () { lb.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
    $$('[data-gallery] .g-item').forEach(function (b) { b.addEventListener('click', function () { openLb(+b.dataset.index); }); });
    $('[data-lb-close]', lb).addEventListener('click', closeLb);
    $('[data-lb-prev]', lb).addEventListener('click', function () { show(idx - 1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-fig')) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'Tab') { // keep focus inside
        var f = $$('button', lb), firstB = f[0], lastB = f[f.length - 1];
        if (e.shiftKey && document.activeElement === firstB) { e.preventDefault(); lastB.focus(); }
        else if (!e.shiftKey && document.activeElement === lastB) { e.preventDefault(); firstB.focus(); }
      }
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
  }

  /* ---------- map: load on demand (keeps pages fast) ---------- */
  $$('[data-load-map]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('[data-map]');
      var f = document.createElement('iframe');
      f.src = box.getAttribute('data-src'); f.title = 'Map of the property area'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
      box.innerHTML = ''; box.appendChild(f);
    });
  });

  /* ---------- social sharing ---------- */
  var here = location.href.split('#')[0];
  $$('[data-share]').forEach(function (a) {
    var kind = a.getAttribute('data-share');
    if (kind === 'facebook') a.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(here);
    else if (kind === 'x') a.href = a.href + '&url=' + encodeURIComponent(here);
    else a.href = a.href + encodeURIComponent(here);
    a.addEventListener('click', function () { api.track('share_click', { network: kind, page: location.pathname }); });
  });
  $$('[data-copy-link]').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = function () { b.setAttribute('aria-label', 'Link copied'); b.title = 'Link copied'; b.style.borderColor = 'var(--ok)'; setTimeout(function () { b.setAttribute('aria-label', 'Copy link'); b.title = ''; b.style.borderColor = ''; }, 2000); };
      if (navigator.clipboard) navigator.clipboard.writeText(here).then(done, function () { prompt('Copy this link:', here); });
      else prompt('Copy this link:', here);
    });
  });
})();
