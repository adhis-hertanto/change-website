/* Change website: Experience article. Anchor list highlights the section in view; share buttons. */
(function () {
  'use strict';
  var links = Array.prototype.slice.call(document.querySelectorAll('.ex-toc__link'));
  var secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  function setCurrent(i) {
    links.forEach(function (a, j) {
      a.classList.toggle('is-current', i === j);
      if (i === j) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  function update() {
    var i = 0;
    secs.forEach(function (s, j) { if (s && s.getBoundingClientRect().top <= 140) i = j; });
    setCurrent(i);
  }
  if (links.length) {
    var t = 0;
    window.addEventListener('scroll', function () { if (!t) t = requestAnimationFrame(function () { t = 0; update(); }); }, { passive: true });
    update();
  }
  var li = document.querySelector('[data-share="linkedin"]');
  if (li) li.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(location.href);
  var cp = document.querySelector('[data-share="copy"]');
  if (cp) cp.addEventListener('click', function () {
    var done = function () { cp.setAttribute('aria-label', 'Link copied'); setTimeout(function () { cp.setAttribute('aria-label', 'Copy link'); }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done); else done();
  });
})();
