// X: when the home timeline opens on "For you", switch to "Following". X remembers the choice.
(function () {
  if (!/(^|\.)x\.com$|twitter\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('foryou') !== -1; }
  var last = 0;
  function check() {
    if (!on() || !/^\/home\/?$/.test(location.pathname)) return;
    var now = Date.now(); if (now - last < 800) return; last = now;
    var tabs = document.querySelector('[data-testid="primaryColumn"] [role="tablist"]') || document.querySelector('main [role="tablist"]');
    if (!tabs) return;
    var items = tabs.querySelectorAll('[role="tab"]');
    if (items.length < 2) return;
    var first = items[0], second = items[1];
    var firstSelected = first.getAttribute('aria-selected') === 'true';
    if (firstSelected) { try { second.click(); } catch (e) {} }
  }
  setTimeout(check, 1500);
  FO && FO.onSweep(check);
})();
