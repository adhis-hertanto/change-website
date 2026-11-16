/* Change website: Clients page. Floating filter bar with Sector and Country panels.
   Tiles are matched on their data-sector / data-country attributes (slug values, same as the
   checkbox values). Those attributes are still empty because the sector and country for each
   client have not been supplied; a tile with no value is never hidden. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var bar = $('.pg-filter'); if (!bar) return;
  var btns = $$('.pg-filter__btn', bar);
  var all = btns[0], clear = btns[btns.length - 1];
  var toggles = btns.filter(function (b) { return b.hasAttribute('aria-controls'); });
  var panels = toggles.map(function (b) { return document.getElementById(b.getAttribute('aria-controls')); });
  var tiles = $$('.pg-cl__grid > li');
  var boxes = $$('.pg-filter__panel input[type="checkbox"]');

  function openPanel(i) {
    toggles.forEach(function (b, j) {
      var on = j === i && panels[j].hidden;
      if (j !== i) { panels[j].hidden = true; b.setAttribute('aria-expanded', 'false'); }
      else { panels[j].hidden = !on; b.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) { var c = $('.pg-filter__close', panels[j]); if (c) c.focus(); } }
    });
  }
  function closePanels(focusBack) {
    toggles.forEach(function (b, j) {
      if (!panels[j].hidden && focusBack) b.focus();
      panels[j].hidden = true; b.setAttribute('aria-expanded', 'false');
    });
  }
  function selected(name) { return boxes.filter(function (b) { return b.name === name && b.checked; }).map(function (b) { return b.value; }); }
  function apply() {
    var sec = selected('sector'), cty = selected('country');
    var none = !sec.length && !cty.length;
    all.classList.toggle('is-active', none); all.setAttribute('aria-pressed', none ? 'true' : 'false');
    tiles.forEach(function (li) {
      var a = li.querySelector('.pg-cl__tile'); if (!a) return;
      var s = a.getAttribute('data-sector'), c = a.getAttribute('data-country');
      var okS = !sec.length || !s || sec.indexOf(s) > -1;
      var okC = !cty.length || !c || cty.indexOf(c) > -1;
      li.hidden = !(okS && okC);
    });
  }
  function reset() { boxes.forEach(function (b) { b.checked = false; }); apply(); }

  toggles.forEach(function (b, i) { b.addEventListener('click', function () { openPanel(i); }); });
  panels.forEach(function (p) {
    $('.pg-filter__close', p).addEventListener('click', function () { closePanels(true); });
    var c = $('.pg-filter__text', p);
    if (c) c.addEventListener('click', function () { $$('input[type="checkbox"]', p).forEach(function (b) { b.checked = false; }); apply(); });
  });
  boxes.forEach(function (b) { b.addEventListener('change', apply); });
  all.addEventListener('click', function () { reset(); closePanels(false); });
  clear.addEventListener('click', function () { reset(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanels(true); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.pg-filter-dock')) closePanels(false); });

  /* arriving from a Home sector link: clients.html?sector=aviation */
  var q = new URLSearchParams(location.search).get('sector');
  if (q) boxes.forEach(function (b) { if (b.name === 'sector' && b.value === q) b.checked = true; });
  apply();

  /* touch: first tap reveals sector and country, second tap follows the link */
  var armed = null;
  $$('.pg-cl__tile').forEach(function (t) {
    t.addEventListener('touchend', function (e) {
      if (armed === t) return;
      e.preventDefault(); if (armed) armed.classList.remove('is-hover');
      armed = t; t.classList.add('is-hover');
    });
  });
})();
