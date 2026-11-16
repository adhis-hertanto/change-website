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

  /* ---------- Sticky menu button ----------
     The button and its panel move into a fixed dock so they stay at the top of the viewport; a slot
     stays in the nav to hold the space, and the dock is lined up with it. */
  (function stickyMenu() {
    var nav = $('.pg-nav'), host = $('.chg-root');
    if (!menu || !panel || !nav || !host) return;
    var slot = document.createElement('span'); slot.className = 'pg-nav__slot'; slot.setAttribute('aria-hidden', 'true');
    var dock = document.createElement('nav'); dock.className = 'pg-menu-dock';
    dock.setAttribute('aria-label', 'Menu'); dock.setAttribute('data-theme', 'dark');
    nav.insertBefore(slot, menu);
    dock.appendChild(menu); dock.appendChild(panel);
    host.insertBefore(dock, host.firstChild);
    function line() {
      var r = slot.getBoundingClientRect(), h = host.getBoundingClientRect();
      dock.style.setProperty('--dock-left', (r.left - h.left) + 'px');
      dock.style.setProperty('--dock-width', r.width + 'px');
      /* where the slot sits at the top of the page, whatever the current scroll position */
      dock.style.setProperty('--dock-top', Math.max(0, r.top + (window.scrollY || window.pageYOffset)) + 'px');
    }
    /* on the mobile layout the button would sit on top of the footer heading, so it steps aside
       once the footer reaches it (css/site.css only acts on .is-away below 768) */
    var foot = $('.pg-contact'), t = 0;
    function away() {
      t = 0;
      if (!foot) return;
      var open = menu.getAttribute('aria-expanded') === 'true';
      dock.classList.toggle('is-away', !open && foot.getBoundingClientRect().top < dock.getBoundingClientRect().bottom);
    }
    window.addEventListener('scroll', function () { if (!t) t = requestAnimationFrame(away); }, { passive: true });
    window.addEventListener('resize', function () { line(); away(); });
    window.addEventListener('load', function () { line(); away(); });
    line(); away();
  })();

  /* ---------- Footer reveal ----------
     Pin the footer under the page only while its content fits in one viewport. */
  (function footerReveal() {
    var foot = $('.pg-contact'), pin = foot && $('.pg-contact__pin', foot);
    if (!pin) return;
    function fit() {
      /* measure in normal flow: there the footer is at least one viewport tall, and taller only if its content needs it */
      foot.classList.remove('is-reveal');
      if (pin.offsetHeight <= window.innerHeight + 1) foot.classList.add('is-reveal');
    }
    window.addEventListener('resize', fit);
    window.addEventListener('load', fit);
    fit();
  })();

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
