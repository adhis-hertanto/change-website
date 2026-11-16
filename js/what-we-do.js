/* Change website: What We Do page. Insights category chips filter the list in place. */
(function () {
  'use strict';
  var chips = Array.prototype.slice.call(document.querySelectorAll('.pg-ins__chips .pg-chip'));
  var rows = Array.prototype.slice.call(document.querySelectorAll('.pg-ins__list > li'));
  if (!chips.length) return;
  var TYPE = { Articles: 'Article', Publications: 'Publication', Events: 'Event' };
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var want = TYPE[chip.textContent.trim()] || null;
      chips.forEach(function (c) { var on = c === chip; c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      rows.forEach(function (li) {
        var t = li.querySelector('.pg-ins__type');
        li.hidden = !!want && (!t || t.textContent.trim() !== want);
      });
    });
  });
})();
