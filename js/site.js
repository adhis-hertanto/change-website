/* Change website: shared behaviour (nav menu, contact drawer, page transition, reveals). */
(function () {
  'use strict';
  var root = document.documentElement;
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Nav menu ---------- */
  var menu = $('.pg-nav__menu'), panel = $('#pg-nav-panel');
  function setMenu(open) {
    if (!menu || !panel) return;
    menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
  }
  if (menu && panel) {
    menu.addEventListener('click', function () { setMenu(menu.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (!panel.contains(e.target) && !menu.contains(e.target)) setMenu(false);
    });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  /* ---------- Contact drawer ---------- */
  var drawer = $('.dr'), lastFocus = null;
  function focusables() {
    return $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', drawer)
      .filter(function (el) { return el.offsetParent !== null; });
  }
  function openDrawer(from) {
    if (!drawer) return;
    lastFocus = from || document.activeElement;
    setMenu(false);
    root.classList.add('is-contact-open');
    var close = $('.dr__close', drawer);
    window.setTimeout(function () { (close || drawer).focus(); }, 60);
  }
  function closeDrawer() {
    if (!drawer || !root.classList.contains('is-contact-open')) return;
    root.classList.remove('is-contact-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-contact-open]');
    if (o) { e.preventDefault(); openDrawer(o); return; }
    if (e.target.closest('[data-contact-close]')) { e.preventDefault(); closeDrawer(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (root.classList.contains('is-contact-open')) { closeDrawer(); return; }
      if (panel && !panel.hidden) { setMenu(false); menu.focus(); }
    }
    if (e.key === 'Tab' && root.classList.contains('is-contact-open')) {
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!drawer.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });
  if (location.hash === '#contact') openDrawer();

  /* ---------- Contact form ----------
     There is no form backend yet. Valid submissions open the visitor's mail app
     with the message filled in. Swap sendForm() for a real endpoint when one exists. */
  var form = $('[data-contact-form]');
  var CONTACT_EMAIL = 'makethings@change.sg';
  function fieldError(field, msg) {
    var wrap = field.closest('.ct-field'); if (!wrap) return;
    var old = $('.ct-err', wrap); if (old) old.remove();
    wrap.classList.toggle('is-invalid', !!msg);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (!msg) { field.removeAttribute('aria-describedby'); return; }
    var p = document.createElement('p');
    p.className = 'ct-err'; p.id = field.id + '-err';
    p.innerHTML = '<svg class="chg-icon" aria-hidden="true"><use href="#i-alert"></use></svg>';
    p.appendChild(document.createTextNode(msg));
    wrap.appendChild(p);
    field.setAttribute('aria-describedby', p.id);
  }
  function check(field) {
    var label = (field.labels && field.labels[0] ? field.labels[0].textContent : 'This field').replace('*', '').trim();
    var msg = '';
    if (field.validity.valueMissing) msg = label + ' is required.';
    else if (field.validity.typeMismatch) msg = 'Enter a valid email address.';
    fieldError(field, msg);
    return !msg;
  }
  function sendForm(data) {
    var body = [
      'Name: ' + data.first_name + ' ' + data.last_name,
      'Email: ' + data.email,
      'Location: ' + data.location,
      '', data.message
    ].join('\n');
    location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(data.subject) + '&body=' + encodeURIComponent(body);
  }
  if (form) {
    var fields = $$('input,select,textarea', form);
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { if (f.closest('.ct-field').classList.contains('is-invalid')) check(f); });
      f.addEventListener('change', function () { if (f.closest('.ct-field').classList.contains('is-invalid')) check(f); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = fields.filter(function (f) { return !check(f); });
      if (bad.length) { bad[0].focus(); return; }
      var data = {}; fields.forEach(function (f) { data[f.name] = f.value; });
      sendForm(data);
    });
  }

  /* ---------- Section statement reveal ---------- */
  var reveal = $$('.pg-wwd__statement,.pg-cls__line,.pg-exl__lead,.pg-contact__title,.pg-ins__stmt');
  if (!rm && 'IntersectionObserver' in window && reveal.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveal.forEach(function (el) { el.setAttribute('data-reveal', ''); io.observe(el); });
  }

  /* ---------- Page transition (curtain wipes up) ---------- */
  function arrive() {
    if (!root.classList.contains('is-arriving')) return;
    try { sessionStorage.removeItem('chg-curtain'); } catch (e) {}
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      root.classList.add('is-arrived'); root.classList.remove('is-arriving');
      window.setTimeout(function () { root.classList.remove('is-arrived'); }, 1100);
    }); });
  }
  arrive();
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { root.classList.remove('is-leaving', 'is-arriving', 'is-arrived'); }
  });
  if (!rm) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|https?:)/i.test(href)) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; /* same page: let the anchor scroll */
      e.preventDefault();
      try { sessionStorage.setItem('chg-curtain', '1'); } catch (err) {}
      root.classList.add('is-leaving');
      window.setTimeout(function () { location.href = a.href; }, 1000);
    });
  }
})();
