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
    /* the footer leaves room for the button above its card. If the footer is taller than the
       viewport and scrolls, the card can still reach the button, which then steps aside. */
    var card = $('.pg-contact__card'), t = 0;
    function away() {
      t = 0;
      if (!card) return;
      var open = menu.getAttribute('aria-expanded') === 'true';
      dock.classList.toggle('is-away', !open && card.getBoundingClientRect().top < dock.offsetTop + menu.offsetHeight - 1); /* offsets ignore the step-aside shift */
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

  /* ---------- Shader gradient backgrounds ----------
     <canvas data-shader-bg data-colors="#a,#b,#c" data-shade="0-1"> draws a slow, flowing three-colour
     gradient with film grain (the look of a noise-displaced sphere seen from very close). data-shade
     darkens it for sections with light text on top. It renders at reduced resolution, at 30 fps, and
     only while its section is on screen; with reduced motion it draws a single still frame. The CSS
     background underneath stays as the fallback when WebGL is unavailable. */
  (function shaderBackgrounds() {
    var VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
    var FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
      'varying vec2 uv;uniform float time,asp,shade,seed;uniform vec3 c1,c2,c3;\n' +
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n' +
      'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}\n' +
      'float fbm(vec2 p){return n(p)*.62+n(p*2.03+7.1)*.27+n(p*4.01+3.3)*.11;}\n' +
      /* height field: big slow swells folded by a domain warp, like the displaced surface */
      'float field(vec2 p,float t){\n' +
      ' vec2 w=vec2(fbm(p*.55+vec2(t*.21,-t*.13)+seed),fbm(p*.55+vec2(-t*.17,t*.19)+seed+5.2));\n' +
      ' return fbm(p*.8+(w-.5)*2.4+vec2(t*.07,t*.05));}\n' +
      'void main(){\n' +
      ' vec2 p=vec2(uv.x*asp,uv.y)*1.15;float t=time*.3;\n' +
      ' float f=field(p,t);float g=field(p*.9+vec2(4.7,1.3),t*.85+11.);\n' +
      ' vec3 col=mix(c1,c2,smoothstep(.34,.66,f));\n' +
      ' col=mix(col,c3,smoothstep(.38,.72,g));\n' +
      /* soft light from the slope of the field: a broad sheen and gentle shadowing, as on a glossy surface */
      ' float e=.012;vec2 gr=vec2(field(p+vec2(e,0.),t)-f,field(p+vec2(0.,e),t)-f)/e;\n' +
      ' vec3 nn=normalize(vec3(-gr*.55,1.));float lit=dot(nn,normalize(vec3(-.45,.6,.75)));\n' +
      ' col*=.86+.3*lit;col+=vec3(1.)*pow(clamp(lit,0.,1.),14.)*.16;\n' +
      ' col*=.8+.25*shade;\n' +
      /* shade: pull towards a deep version of the colour so light text and the glass logo read on top */
      ' col=mix(col,col*col*.55+vec3(.008,.014,.03),shade);col*=1.-.55*shade;\n' +
      ' col+=(h(gl_FragCoord.xy+fract(time)*61.)-.5)*mix(.085,.05,shade);\n' +
      ' gl_FragColor=vec4(clamp(col,0.,1.),1.);\n}';
    function rgb(hex) {
      var m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim()); if (!m) return [0.5, 0.5, 0.5];
      var v = parseInt(m[1], 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
    }
    $$('canvas[data-shader-bg]').forEach(function (cv, idx) {
      var gl, U = {};
      try {
        gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
        if (!gl) return;
        var mk = function (type, src) { var sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
        var pr = gl.createProgram();
        gl.attachShader(pr, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
        if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
        gl.useProgram(pr);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        ['time', 'asp', 'shade', 'seed', 'c1', 'c2', 'c3'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
      } catch (e) { return; }
      var cols = (cv.getAttribute('data-colors') || '#73bfc4,#ff810a,#8da0ce').split(',').map(rgb);
      gl.uniform3fv(U.c1, cols[0]); gl.uniform3fv(U.c2, cols[1] || cols[0]); gl.uniform3fv(U.c3, cols[2] || cols[0]);
      gl.uniform1f(U.shade, Math.min(1, Math.max(0, parseFloat(cv.getAttribute('data-shade')) || 0)));
      gl.uniform1f(U.seed, idx * 3.7);
      var seen = false, raf = 0, last = 0;
      function draw(now) {
        var w = Math.max(2, Math.round(cv.clientWidth / 2)), hgt = Math.max(2, Math.round(cv.clientHeight / 2));
        if (cv.width !== w || cv.height !== hgt) { cv.width = w; cv.height = hgt; gl.viewport(0, 0, w, hgt); }
        gl.uniform1f(U.asp, w / hgt);
        gl.uniform1f(U.time, rm ? 12 : now / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        cv.classList.add('is-on');
      }
      function loop(now) {
        raf = 0;
        if (!seen || document.hidden) return;
        if (now - last > 32) { last = now; draw(now); }
        if (!rm) raf = requestAnimationFrame(loop);
      }
      function kick() { if (!raf) raf = requestAnimationFrame(loop); }
      var host = cv.closest('section') || cv;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { seen = es[0].isIntersecting; if (seen) kick(); }, { rootMargin: '200px 0px' }).observe(host);
      } else { seen = true; kick(); }
      window.addEventListener('resize', function () { if (seen) { last = 0; kick(); } });
      document.addEventListener('visibilitychange', function () { if (!document.hidden && seen) kick(); });
    });
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
