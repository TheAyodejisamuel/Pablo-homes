/* PABLO HOMES — property search, filters (shareable URLs) and booking preview */
(function () {
  'use strict';
  var DATA = window.PH_PROPERTIES || [];
  var api = window.PabloAPI || { track: function () {} };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var KEYS = ['purpose', 'location', 'type', 'min', 'max', 'beds', 'baths', 'status', 'sort'];
  var CATS = {}; (window.PH_CATEGORIES || []).forEach(function (c) { CATS[c.key] = c.label; });

  /* ---------- home hero search: track ---------- */
  var heroSearch = $('[data-search]');
  if (heroSearch) heroSearch.addEventListener('submit', function () {
    var fd = new FormData(heroSearch), q = {};
    fd.forEach(function (v, k) { if (v) q[k] = v; });
    api.track('property_search', Object.assign({ from: 'home' }, q));
    // drop empty params so the shared URL stays clean
    $$('select', heroSearch).forEach(function (s) { if (!s.value) s.disabled = true; });
    setTimeout(function () { $$('select', heroSearch).forEach(function (s) { s.disabled = false; }); }, 0);
  });

  /* ---------- properties page ---------- */
  var form = $('[data-filters]');
  var results = $('[data-results]');
  if (form && results) {
    var sortSel = $('[data-sort]');
    var countEl = $('[data-count]');
    var emptyEl = $('[data-empty]');
    var activeEl = $('[data-active]');
    var panel = $('#filters');
    var openBtn = $('[data-open-filters]');

    var readURL = function () {
      var p = new URLSearchParams(location.search), s = {};
      KEYS.forEach(function (k) { if (p.get(k)) s[k] = p.get(k); });
      return s;
    };
    var writeForm = function (s) {
      KEYS.forEach(function (k) {
        if (k === 'sort') { sortSel.value = s.sort || 'newest'; return; }
        if (k === 'purpose') { var r = form.querySelector('input[name=purpose][value="' + (s.purpose || '') + '"]'); if (r) r.checked = true; return; }
        var el = form.elements[k]; if (el) el.value = s[k] || '';
        if (el && s[k] && el.value !== s[k]) { // value from URL not in the list (e.g. a new area) – add it
          var o = document.createElement('option'); o.value = o.textContent = s[k]; el.appendChild(o); el.value = s[k];
        }
      });
    };
    var readForm = function () {
      var s = {};
      var pr = form.querySelector('input[name=purpose]:checked'); if (pr && pr.value) s.purpose = pr.value;
      ['location', 'type', 'min', 'max', 'beds', 'baths', 'status'].forEach(function (k) { var v = form.elements[k].value; if (v) s[k] = v; });
      if (sortSel.value && sortSel.value !== 'newest') s.sort = sortSel.value;
      return s;
    };
    var match = function (p, s) {
      if (s.purpose && p.purpose !== s.purpose) return false;
      if (s.location && p.area !== s.location) return false;
      if (s.type && p.category !== s.type) return false;
      if (s.min && p.price < +s.min) return false;
      if (s.max && p.price > +s.max) return false;
      if (s.beds && !(p.bedrooms >= +s.beds)) return false;
      if (s.baths && !(p.bathrooms >= +s.baths)) return false;
      if (s.status === 'open' && (p.status === 'Sold' || p.status === 'Rented')) return false;
      if (s.status && s.status !== 'open' && p.status !== s.status) return false;
      return true;
    };
    var naira = function (n) { return '₦' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
    var describe = function (s) {
      var bits = [];
      if (s.purpose) bits.push({ sale: 'For sale', rent: 'For rent', shortlet: 'Shortlets' }[s.purpose]);
      if (s.type) bits.push(CATS[s.type] || s.type);
      if (s.location) bits.push('in ' + s.location);
      if (s.min && s.max) bits.push(naira(s.min) + ' to ' + naira(s.max));
      else if (s.min) bits.push('from ' + naira(s.min));
      else if (s.max) bits.push('up to ' + naira(s.max));
      if (s.beds) bits.push(s.beds + '+ bedrooms');
      if (s.baths) bits.push(s.baths + '+ bathrooms');
      if (s.status) bits.push(s.status === 'open' ? 'available now' : s.status);
      return bits.length ? 'Showing: ' + bits.join(', ') : '';
    };
    var render = function (s, push) {
      var list = DATA.filter(function (p) { return match(p, s); });
      var sort = s.sort || 'newest';
      list.sort(function (a, b) {
        if (sort === 'price-asc') return a.price - b.price;
        if (sort === 'price-desc') return b.price - a.price;
        return b.dateAdded.localeCompare(a.dateAdded);
      });
      results.innerHTML = list.map(function (p) { return p.html; }).join('');
      countEl.textContent = list.length + (list.length === 1 ? ' property' : ' properties');
      emptyEl.hidden = list.length > 0;
      results.hidden = list.length === 0;
      var d = describe(s); activeEl.textContent = d; activeEl.hidden = !d;
      var qs = new URLSearchParams(s).toString();
      if (push) history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
      openBtn.innerHTML = openBtn.innerHTML.replace(/Filters.*$/, 'Filters' + (Object.keys(s).filter(function (k) { return k !== 'sort'; }).length ? ' (' + Object.keys(s).filter(function (k) { return k !== 'sort'; }).length + ')' : ''));
    };

    var state = readURL();
    writeForm(state);
    render(state, false);
    if (Object.keys(state).length) api.track('property_search', Object.assign({ from: 'url' }, state));

    var searchTimer;
    var update = function () {
      var s = readForm(); render(s, true);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { api.track('property_search', Object.assign({ from: 'filters' }, s)); }, 800);
    };
    form.addEventListener('change', update);
    sortSel.addEventListener('change', update);
    var reset = function (e) { if (e) e.preventDefault(); form.reset(); form.querySelector('input[name=purpose][value=""]').checked = true; sortSel.value = 'newest'; update(); };
    $('[data-reset]').addEventListener('click', reset);
    $('[data-reset-btn]').addEventListener('click', reset);

    // mobile filter sheet
    var openPanel = function () { panel.classList.add('open'); openBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; var f = panel.querySelector('select, input'); if (f) f.focus(); };
    var closePanel = function () { panel.classList.remove('open'); openBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; openBtn.focus(); };
    openBtn.addEventListener('click', openPanel);
    $('[data-close-filters]').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) closePanel(); });
  }

  /* ---------- book inspection page: pre-select property from ?property=PH-1001 ---------- */
  var sel = $('[data-property-select]');
  var preview = $('[data-book-preview]');
  if (sel && preview) {
    var want = new URLSearchParams(location.search).get('property');
    if (want) { var opt = sel.querySelector('option[data-id="' + want + '"]'); if (opt) opt.selected = true; }
    var showPreview = function () {
      var o = sel.options[sel.selectedIndex];
      var p = o && DATA.filter(function (x) { return x.id === o.getAttribute('data-id'); })[0];
      if (!p) { preview.hidden = true; return; }
      preview.innerHTML = '<img src="' + p.image + '" alt="" data-fb="' + p.fb + '"><div><strong>' + p.label + '</strong><span>' + p.priceText + ' (' + p.id + ')</span></div>';
      preview.hidden = false;
    };
    sel.addEventListener('change', showPreview);
    showPreview();
  }
})();
