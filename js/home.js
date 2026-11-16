/* Change website: Home page behaviour.
   1. Hero fades on scroll, Who We Are scroll sequence (3D logo dissolves in; the gradient background is in js/site.js)
   2. What We Do stacked cards (tint of the cards behind)
   3. Clients sector drum
   4. Experiences logo card (follows the cursor, slider-mask logo change, auto cycle)
   5. Insights carousel
   6. Scroll theme switch (sections invert between light and dark) */
(function () {
  'use strict';
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* =====================================================================
     1. Hero + Who We Are
     ===================================================================== */
  (function heroSequence() {
    var hero = $('.pg-hs'), wa = $('.pg-wa2');
    if (!hero || !wa) return;
    var heroSt = $('.pg-hs__stage', hero), st = $('.pg-wa2__stage', wa);
    var glass = $('.pg-wa2__glass', st), cv = $('.pg-wa2__gl', glass), img = $('.pg-wa2__img', glass);

    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var sm = function (a, b, p) { return ease(clamp((p - a) / (b - a), 0, 1)); };

    var FS_HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
    var NOISE = 'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n' +
      'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}\n' +
      'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}\n';
    var VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
    /* 3D logo: cursor dissolve / distort, plus the distort fade-in (rv 0 to 1) */
    var FS_GLASS = FS_HEAD + 'varying vec2 uv;uniform sampler2D t;uniform vec2 m;uniform float amt,time,asp,rv;\n' + NOISE +
      'void main(){\n' +
      ' vec2 q=vec2(uv.x*asp,uv.y);vec2 mm=vec2(m.x*asp,m.y);\n' +
      ' float d=distance(q,mm);float infl=smoothstep(.36,0.,d)*amt;\n' +
      ' float nz=fbm(q*5.+vec2(time*.15,-time*.1));\n' +
      ' vec2 dir=normalize(q-mm+vec2(1e-4));\n' +
      ' vec2 off=(dir*(nz-.5)*.14+vec2(nz-.5,fbm(q*5.+7.)-.5)*.09)*infl;\n' +
      ' float inv=1.-rv;\n' +
      ' off+=vec2(fbm(q*3.+vec2(11.,time*.2))-.5,fbm(q*3.+vec2(23.,-time*.2))-.5)*.45*inv*inv;\n' +
      ' vec4 c=texture2D(t,uv-vec2(off.x/asp,off.y));\n' +
      ' vec3 col=1.-c.rgb;col=(col-.5)*1.1+.5;col*=1.05;col=clamp(col,0.,1.);\n' +
      ' float cut=infl*1.3-nz*.5;\n' +
      ' float a=1.-smoothstep(.08,.4,cut);\n' +
      ' float edge=smoothstep(.06,.22,cut)*(1.-smoothstep(.22,.42,cut));\n' +
      ' float L=dot(col,vec3(.333));\n' +
      ' col=col*a+vec3(min(1.,L*3.2))*edge*.95;\n' +
      ' float rn=fbm(q*2.6+vec2(3.1,time*.06));\n' +
      ' float ra=smoothstep(rn-.22,rn+.22,rv*1.5-.25);\n' +
      ' gl_FragColor=vec4(col,max(a,edge*min(1.,L*6.)))*ra;\n}';
    function prog(gl, fs) {
      var mk = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      var pr = gl.createProgram();
      gl.attachShader(pr, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
      gl.useProgram(pr);
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      return pr;
    }

    var mVal = 0, mTarget = 0, mLast = 0, REVEAL = 1.8, inView = false, hover = false, amt = 0, mx = .5, my = .5, tx = .5, ty = .5, raf = 0;
    var G = null;


    function sizeGlass() {
      if (!G) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = Math.round(cv.offsetWidth * dpr), h = Math.round(cv.offsetHeight * dpr);
      if (!w || !h || (cv.width === w && cv.height === h)) return;
      cv.width = w; cv.height = h;
      G.gl.viewport(0, 0, w, h);
      G.gl.uniform1f(G.as, w / h);
    }
    function initGlass() {
      if (G || !img.naturalWidth) return;
      try {
        var gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
        var pr = gl && prog(gl, FS_GLASS);
        if (!pr) return;
        var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        G = { gl: gl, m: gl.getUniformLocation(pr, 'm'), a: gl.getUniformLocation(pr, 'amt'), rv: gl.getUniformLocation(pr, 'rv'), t: gl.getUniformLocation(pr, 'time'), as: gl.getUniformLocation(pr, 'asp') };
        glass.classList.add('is-gl');
        sizeGlass();
        drawGlass(0);
      } catch (e) { G = null; glass.classList.remove('is-gl'); }
    }
    function drawGlass(t) {
      if (!G) return; var gl = G.gl;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(G.m, mx, my); gl.uniform1f(G.a, rm ? 0 : amt); gl.uniform1f(G.rv, mVal); gl.uniform1f(G.t, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (img.complete) initGlass(); else img.addEventListener('load', initGlass);

    function frame(now) {
      raf = 0;
      var t = now / 1000;
      /* distort fade-in: the reveal runs on a clock (REVEAL seconds) once the section is in view,
         so it plays in full however fast the page is scrolled */
      var dt = mLast ? Math.min(.1, t - mLast) : 0; mLast = t;
      if (mVal !== mTarget) {
        mVal = mTarget > mVal ? Math.min(mTarget, mVal + dt / REVEAL) : Math.max(mTarget, mVal - dt / (REVEAL * .5));
        st.style.setProperty('--m', mVal.toFixed(4));
        if (mVal > 0) initGlass();
      }
      mx += (tx - mx) * .2; my += (ty - my) * .2;
      amt += ((hover ? 1 : 0) - amt) * (hover ? .08 : .03);
      if (mVal > 0) drawGlass(t);
      if (inView && !rm) raf = requestAnimationFrame(frame);
      else if (mVal > 0 && (hover || amt > .004)) raf = requestAnimationFrame(frame);
      else mLast = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    function update() {
      var y = window.scrollY || window.pageYOffset, vh = window.innerHeight;
      var hh = hero.offsetHeight;
      /* hero: copy, CTAs, ticker and nav fade over the first 70% of a viewport of scroll */
      var o = rm ? (y > hh * .3 ? 1 : 0) : sm(0, .7, y / hh);
      heroSt.style.setProperty('--o', o.toFixed(4));
      /* Who We Are: progress through the sticky section */
      var R = Math.max(1, wa.offsetHeight - vh);
      var p = clamp(-wa.getBoundingClientRect().top / R, 0, 1);
      var s = function (a, b) { return rm ? (p > a ? 1 : 0) : sm(a, b, p); };
      /* the 3D logo starts to dissolve in once the stage fills most of the viewport, and resets
         when the section has been scrolled back out of view */
      var e = clamp(1 - wa.getBoundingClientRect().top / vh, 0, 1);
      var v = { t1: s(.04, .16), t2: s(.5, .68) };
      for (var k in v) st.style.setProperty('--' + k, v[k].toFixed(4));
      if (e > .7) mTarget = 1; else if (e < .15) mTarget = 0;
      if (rm && mVal !== mTarget) { mVal = mTarget; st.style.setProperty('--m', mVal); if (mVal > 0) { initGlass(); if (G) drawGlass(0); } }
      kick();
    }
    var sraf = 0;
    window.addEventListener('scroll', function () { if (!sraf) sraf = requestAnimationFrame(function () { sraf = 0; update(); }); }, { passive: true });
    window.addEventListener('resize', function () { sizeGlass(); update(); });
    st.addEventListener('pointermove', function (e) {
      if (mVal < .6) { hover = false; return; }
      var r = cv.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width, ny = 1 - (e.clientY - r.top) / r.height;
      hover = nx > -.05 && nx < 1.05 && ny > -.05 && ny < 1.05;
      if (hover) { tx = nx; ty = ny; }
      kick();
    });
    st.addEventListener('pointerleave', function () { hover = false; kick(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (inView) kick(); }).observe(st);
    } else { inView = true; }
    update();
  })();

  /* =====================================================================
     2. What We Do: tint the cards that sit behind the active one
     ===================================================================== */
  (function pillarStack() {
    var cards = $$('.pg-wwd__card');
    if (cards.length < 2) return;
    function update() {
      var sticky = getComputedStyle(cards[0]).position === 'sticky';
      /* the cards pin 88 design px apart; that step scales with the viewport, so read it back */
      var stepPx = sticky ? (parseFloat(getComputedStyle(cards[1]).top) - parseFloat(getComputedStyle(cards[0]).top)) || 88 : 88;
      cards.forEach(function (c, i) {
        var behind = 0;
        if (sticky) {
          var r = c.getBoundingClientRect();
          for (var j = i + 1; j < cards.length; j++) {
            /* a later card covers this one once it has slid up over most of its body */
            if (cards[j].getBoundingClientRect().top < r.top + stepPx * 128 / 88) behind++;
          }
        }
        if (behind) c.setAttribute('data-behind', Math.min(2, behind)); else c.removeAttribute('data-behind');
      });
    }
    /* cards of different heights would leave the stack at different moments, the last one sliding
       over the headings above it. Pad each card's bottom margin by its height difference from the
       last card so they all let go together (see the margins in css/site.css). */
    function fit() {
      var last = cards[cards.length - 1].offsetHeight;
      cards.forEach(function (c, i) {
        /* may be negative for a taller card, but never below the margin it is added to */
        var step = (parseFloat(getComputedStyle(cards[1]).top) - parseFloat(getComputedStyle(cards[0]).top)) || 0;
        var fix = i < cards.length - 1 ? Math.max(-(cards.length - 1 - i) * step, last - c.offsetHeight) : 0;
        c.style.setProperty('--stack-fix', fix + 'px');
        if (cards[i + 1]) cards[i + 1].style.setProperty('--stack-fix-prev', fix + 'px');
      });
    }
    var t = 0;
    window.addEventListener('scroll', function () { if (!t) t = requestAnimationFrame(function () { t = 0; update(); }); }, { passive: true });
    window.addEventListener('resize', function () { fit(); update(); });
    window.addEventListener('load', fit);
    fit(); update();
  })();

  /* =====================================================================
     3. Clients: sector drum. Scrolling moves the active sector to the centre.
     ===================================================================== */
  (function drum() {
    var run = $('.pg-drum-run'), stage = $('.pg-drum');
    if (!run || !stage || rm) return;
    var items = $$('.pg-drum__item', stage);
    var ticksL = $$('.pg-drum__ticks--l i', stage), ticksR = $$('.pg-drum__ticks--r i', stage);
    var n = items.length, cur = -1;
    run.style.setProperty('--drum-steps', n);
    function set(idx) {
      if (idx === cur) return; cur = idx;
      items.forEach(function (li, i) {
        var d = i - idx;
        li.style.setProperty('--d', d); li.style.setProperty('--ad', Math.abs(d));
        li.classList.toggle('is-active', d === 0);
        var a = li.firstElementChild;
        if (a) { if (d === 0) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }
      });
      [ticksL, ticksR].forEach(function (ts) {
        ts.forEach(function (tk, i) { tk.style.setProperty('--ad', Math.abs(i - idx)); tk.classList.toggle('is-on', i === idx); });
      });
    }
    function update() {
      var r = run.getBoundingClientRect();
      var travel = Math.max(1, run.offsetHeight - stage.offsetHeight);
      var top = parseFloat(getComputedStyle(stage).top) || 0;
      var p = clamp((top - r.top) / travel, 0, 1);
      set(Math.round(p * (n - 1)));
    }
    var t = 0;
    window.addEventListener('scroll', function () { if (!t) t = requestAnimationFrame(function () { t = 0; update(); }); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* =====================================================================
     4. Experiences: the logo card shows the hovered / focused client
     ===================================================================== */
  (function experienceCard() {
    var list = $('.pg-exl__list'), card = $('.pg-exl__card');
    if (!list || !card) return;
    var names = $$('.pg-exl__name', list);
    function label(el) { return (el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue : el.textContent).trim(); }
    var shown = $('.pg-exl__name.is-active', list), WIPE = 650, EASE = 'cubic-bezier(.65,0,.35,1)';
    function slide(el) {
      var logo = el.getAttribute('data-logo'), name = label(el), s = document.createElement('div'), c;
      s.className = 'pg-exl__slide';
      if (logo) { c = document.createElement('img'); c.className = 'pg-exl__logo'; c.src = logo; c.alt = name; }
      else { c = document.createElement('span'); c.className = 'pg-exl__mark'; c.textContent = name; }
      s.appendChild(c);
      return s;
    }
    /* slider mask: the new logo's slide wipes in over the old one, from the right when moving
       forward through the list and from the left when moving back, while both logos travel */
    function show(el) {
      if (el === shown) return;
      var dir = names.indexOf(el) >= names.indexOf(shown) ? 1 : -1; shown = el;
      names.forEach(function (n) { n.classList.toggle('is-active', n === el); });
      var old = card.lastElementChild, next = slide(el);
      card.appendChild(next);
      function tidy() { while (card.firstElementChild && card.firstElementChild !== next) card.removeChild(card.firstElementChild); }
      if (rm || !next.animate || !old) { tidy(); return; }
      var from = dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
      var o = { duration: WIPE, easing: EASE, fill: 'both' };
      next.animate([{ clipPath: from }, { clipPath: 'inset(0 0 0 0)' }], o).onfinish = function () { if (card.lastElementChild === next) tidy(); };
      next.firstChild.animate([{ transform: 'translateX(' + (dir * 35) + '%)' }, { transform: 'none' }], o);
      if (old.firstChild) old.firstChild.animate([{ transform: 'none' }, { transform: 'translateX(' + (-dir * 35) + '%)' }], o);
    }

    /* with a mouse, the card follows the cursor while it is over the client list */
    var sec = card.parentNode;
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      card.classList.add('is-follow');
      var px = 0, py = 0, cx = 0, cy = 0, on = false, fr = 0, placed = false;
      var last = 0;
      var place = function (now) {
        fr = 0;
        /* ease towards the cursor by elapsed time, so the follow feels the same at any frame rate */
        var k = rm || !last ? (rm ? 1 : .16) : 1 - Math.exp(-(now - last) / 90); last = now;
        cx += (px - cx) * k; cy += (py - cy) * k;
        card.style.setProperty('--cx', cx.toFixed(1) + 'px'); card.style.setProperty('--cy', cy.toFixed(1) + 'px');
        if (on && (Math.abs(px - cx) > .3 || Math.abs(py - cy) > .3)) fr = requestAnimationFrame(place); else last = 0;
      };
      var aim = function (e) {
        var r = sec.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight, gap = w * .08;
        /* sit below and to the right of the cursor, flipping to the left near the right edge, and stay inside the section */
        var x = e.clientX - r.left + gap, y = e.clientY - r.top + gap;
        if (x + w > r.width - gap) x = e.clientX - r.left - gap - w;
        px = clamp(x, gap, Math.max(gap, r.width - w - gap)); py = clamp(y, gap, Math.max(gap, r.height - h - gap));
        if (!placed) { placed = true; cx = px; cy = py; }
        if (!fr) fr = requestAnimationFrame(place);
      };
      list.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse') return; on = true; placed = false; aim(e); card.classList.add('is-on'); });
      list.addEventListener('pointermove', function (e) { if (on) aim(e); });
      list.addEventListener('pointerleave', function () { on = false; card.classList.remove('is-on'); });
    }
    /* the highlight steps through the clients one after the other; hovering or focusing a name
       takes over, and the sequence carries on from that name afterwards */
    var cur = Math.max(0, names.indexOf($('.pg-exl__name.is-active', list))), held = false, seen = false, timer = 0;
    var STEP = 2200;
    function pick(n) { cur = names.indexOf(n); show(n); }
    function tick() { if (held || !seen || document.hidden) return; cur = (cur + 1) % names.length; show(names[cur]); }
    function hold(on) {
      held = on;
      /* restart the clock on release so the next step is a full beat after the last hover */
      if (!on && timer) { clearInterval(timer); timer = setInterval(tick, STEP); }
    }
    names.forEach(function (n) {
      n.addEventListener('pointerenter', function (e) { pick(n); if (e.pointerType === 'mouse') hold(true); });
      n.addEventListener('focus', function () { pick(n); hold(true); });
      n.addEventListener('blur', function () { hold(false); });
    });
    list.addEventListener('pointerleave', function () { hold(false); });
    if (!rm && names.length > 1) {
      timer = setInterval(tick, STEP);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { seen = es[0].isIntersecting; }, { threshold: .25 }).observe(list);
      } else { seen = true; }
    }
  })();

  /* =====================================================================
     5. Insights carousel: Previous / Next, drag or swipe, arrow keys
     ===================================================================== */
  (function insights() {
    var sec = $('.pg-insh'); if (!sec) return;
    var vp = $('.pg-insh__viewport', sec), track = $('.pg-insh__track', sec);
    var btns = $$('.pg-insh__btn', sec), prev = btns[0], next = btns[1];
    var cards = $$('.pg-insh__card', track), idx = 0;
    function step() { return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : (cards[0] ? cards[0].offsetWidth : 0); }
    function maxIdx() {
      var over = track.scrollWidth - vp.clientWidth + parseFloat(getComputedStyle(vp).paddingRight || 0);
      return Math.max(0, Math.ceil(over / Math.max(1, step()) - .05));
    }
    function go(i) {
      idx = clamp(i, 0, maxIdx());
      track.style.transform = 'translateX(' + (-idx * step()) + 'px)';
      if (prev) prev.disabled = idx === 0;
      if (next) next.disabled = idx >= maxIdx();
    }
    if (prev) prev.addEventListener('click', function () { go(idx - 1); });
    if (next) next.addEventListener('click', function () { go(idx + 1); });
    sec.setAttribute('tabindex', '0');
    sec.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(idx + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(idx - 1); e.preventDefault(); }
    });
    /* drag / swipe */
    var sx = 0, sy = 0, dx = 0, down = false, moved = false;
    vp.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; down = true; moved = false; sx = e.clientX; sy = e.clientY; dx = 0; });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - sy)) { moved = true; track.classList.add('is-dragging'); }
      if (moved) track.style.transform = 'translateX(' + (-idx * step() + dx) + 'px)';
    });
    function up() {
      if (!down) return; down = false;
      track.classList.remove('is-dragging');
      if (moved) go(idx + (dx < -40 ? 1 : dx > 40 ? -1 : 0));
    }
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    vp.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    vp.addEventListener('dragstart', function (e) { e.preventDefault(); });
    /* trackpad swipe */
    var wl = 0;
    vp.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 20) return;
      e.preventDefault();
      var now = Date.now(); if (now - wl < 500) return; wl = now;
      go(idx + (e.deltaX > 0 ? 1 : -1));
    }, { passive: false });
    /* the whole card is clickable */
    cards.forEach(function (c) {
      var a = $('.pg-insh__more', c); if (!a) return;
      c.addEventListener('click', function (e) { if (!moved && !e.target.closest('a')) a.click(); });
    });
    window.addEventListener('resize', function () { go(idx); });
    go(0);
  })();

  /* =====================================================================
     6. Scroll theme switch. Each [data-theme-stop] section names its own theme. The section under
        the reading line (60% down the viewport) decides the theme, and every [data-flip] section
        takes it, so the page inverts between light and dark as one surface. CSS does the transition.
     ===================================================================== */
  (function themeSwitch() {
    var stops = $$('[data-theme-stop]'), flips = $$('[data-flip]');
    if (!stops.length || !flips.length) return;
    var cur = '';
    function update() {
      var line = window.innerHeight * .6, th = stops[0].getAttribute('data-theme-stop');
      for (var i = 0; i < stops.length; i++) {
        if (stops[i].getBoundingClientRect().top <= line) th = stops[i].getAttribute('data-theme-stop');
      }
      if (th === cur) return; cur = th;
      flips.forEach(function (f) { f.setAttribute('data-theme', th); });
    }
    var t = 0;
    window.addEventListener('scroll', function () { if (!t) t = requestAnimationFrame(function () { t = 0; update(); }); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();
})();
