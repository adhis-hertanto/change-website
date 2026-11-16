/* Change website: Home page behaviour.
   1. Hero fades on scroll, Who We Are scroll sequence (outline draw, 3D logo, shader background)
   2. What We Do stacked cards (tint of the cards behind)
   3. Clients sector drum
   4. Experiences logo card
   5. Insights carousel */
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
    var bgc = $('.pg-wa2__bg', st);

    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var sm = function (a, b, p) { return ease(clamp((p - a) / (b - a), 0, 1)); };

    var FS_HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
    var NOISE = 'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n' +
      'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}\n' +
      'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}\n';
    var VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
    /* 3D logo: cursor dissolve / distort */
    var FS_GLASS = FS_HEAD + 'varying vec2 uv;uniform sampler2D t;uniform vec2 m;uniform float amt,time,asp;\n' + NOISE +
      'void main(){\n' +
      ' vec2 q=vec2(uv.x*asp,uv.y);vec2 mm=vec2(m.x*asp,m.y);\n' +
      ' float d=distance(q,mm);float infl=smoothstep(.36,0.,d)*amt;\n' +
      ' float nz=fbm(q*5.+vec2(time*.15,-time*.1));\n' +
      ' vec2 dir=normalize(q-mm+vec2(1e-4));\n' +
      ' vec2 off=(dir*(nz-.5)*.14+vec2(nz-.5,fbm(q*5.+7.)-.5)*.09)*infl;\n' +
      ' vec4 c=texture2D(t,uv-vec2(off.x/asp,off.y));\n' +
      ' vec3 col=1.-c.rgb;col=(col-.5)*1.1+.5;col*=1.05;col=clamp(col,0.,1.);\n' +
      ' float cut=infl*1.3-nz*.5;\n' +
      ' float a=1.-smoothstep(.08,.4,cut);\n' +
      ' float edge=smoothstep(.06,.22,cut)*(1.-smoothstep(.22,.42,cut));\n' +
      ' float L=dot(col,vec3(.333));\n' +
      ' col=col*a+vec3(min(1.,L*3.2))*edge*.95;\n' +
      ' gl_FragColor=vec4(col,max(a,edge*min(1.,L*6.)));\n}';
    /* dark shader background */
    var FS_BG = FS_HEAD + 'varying vec2 uv;uniform float time,asp;\n' + NOISE +
      'void main(){\n' +
      ' vec2 p=vec2(uv.x*asp,uv.y)*1.4;float t=time*.035;\n' +
      ' float f=fbm(p+vec2(t,-t*.6)+1.2*fbm(p*1.2+vec2(-t,t*.8)));\n' +
      ' float g=smoothstep(.3,.9,f);float v=pow(clamp(1.-uv.y*1.15,0.,1.),1.6);\n' +
      ' vec3 col=vec3(.012,.027,.07)+vec3(.2,.22,.26)*(.35+.65*g)*v;\n' +
      ' col+=(h(gl_FragCoord.xy+time)-.5)*.02;\n' +
      ' gl_FragColor=vec4(col,1.);\n}';
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

    var mVal = 0, inView = false, hover = false, amt = 0, mx = .5, my = .5, tx = .5, ty = .5, raf = 0, lastBg = 0;
    var G = null, B = null;

    /* shader background (falls back to the CSS gradients if WebGL is unavailable) */
    try {
      var bgl = bgc.getContext('webgl', { antialias: false });
      var bpr = bgl && prog(bgl, FS_BG);
      if (bpr) B = { gl: bgl, tm: bgl.getUniformLocation(bpr, 'time'), as: bgl.getUniformLocation(bpr, 'asp') };
    } catch (e) { B = null; }
    function drawBg(t) {
      if (!B) return;
      var w = Math.max(2, Math.round(st.clientWidth / 2)), h = Math.max(2, Math.round(st.clientHeight / 2));
      if (bgc.width !== w || bgc.height !== h) { bgc.width = w; bgc.height = h; B.gl.viewport(0, 0, w, h); }
      B.gl.uniform1f(B.as, w / h);
      B.gl.uniform1f(B.tm, rm ? 3 : t);
      B.gl.drawArrays(B.gl.TRIANGLE_STRIP, 0, 4);
      bgc.classList.add('is-on');
    }

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
        G = { gl: gl, m: gl.getUniformLocation(pr, 'm'), a: gl.getUniformLocation(pr, 'amt'), t: gl.getUniformLocation(pr, 'time'), as: gl.getUniformLocation(pr, 'asp') };
        glass.classList.add('is-gl');
        sizeGlass();
        drawGlass(0);
      } catch (e) { G = null; glass.classList.remove('is-gl'); }
    }
    function drawGlass(t) {
      if (!G) return; var gl = G.gl;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(G.m, mx, my); gl.uniform1f(G.a, rm ? 0 : amt); gl.uniform1f(G.t, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (img.complete) initGlass(); else img.addEventListener('load', initGlass);

    function frame(now) {
      raf = 0;
      var t = now / 1000;
      mx += (tx - mx) * .2; my += (ty - my) * .2;
      amt += ((hover ? 1 : 0) - amt) * (hover ? .08 : .03);
      if (inView && !rm && now - lastBg > 33) { lastBg = now; drawBg(t); }
      if (mVal > .3) drawGlass(t);
      if (inView && !rm) raf = requestAnimationFrame(frame);
      else if (mVal > .3 && (hover || amt > .004)) raf = requestAnimationFrame(frame);
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
      var v = { t1: s(0, .1), d: s(.04, .52), dw: s(.10, .56), t2: s(.58, .72), m: s(.62, .88) };
      for (var k in v) st.style.setProperty('--' + k, v[k].toFixed(4));
      mVal = v.m;
      if (mVal > .05) { initGlass(); if (G) drawGlass(0); }
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
      cards.forEach(function (c, i) {
        var behind = 0;
        if (sticky) {
          var r = c.getBoundingClientRect();
          for (var j = i + 1; j < cards.length; j++) {
            /* a later card covers this one once it has slid up over most of its body */
            if (cards[j].getBoundingClientRect().top < r.top + 88 + 40) behind++;
          }
        }
        if (behind) c.setAttribute('data-behind', Math.min(2, behind)); else c.removeAttribute('data-behind');
      });
    }
    var t = 0;
    window.addEventListener('scroll', function () { if (!t) t = requestAnimationFrame(function () { t = 0; update(); }); }, { passive: true });
    window.addEventListener('resize', update);
    update();
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
    function show(el) {
      names.forEach(function (n) { n.classList.toggle('is-active', n === el); });
      var logo = el.getAttribute('data-logo'), name = label(el);
      card.innerHTML = '';
      if (logo) {
        var im = document.createElement('img');
        im.className = 'pg-exl__logo'; im.src = logo; im.alt = name;
        card.appendChild(im);
      } else {
        var sp = document.createElement('span');
        sp.className = 'pg-exl__mark'; sp.textContent = name;
        card.appendChild(sp);
      }
    }
    names.forEach(function (n) {
      n.addEventListener('pointerenter', function () { show(n); });
      n.addEventListener('focus', function () { show(n); });
    });
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
})();
