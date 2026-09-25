// X: open Home on "Following", hide the "For you" tab, and mark the Explore page for CSS scoping.
(function () {
  if (!/(^|\.)x\.com$|twitter\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('foryou') !== -1; }
  var last = 0;
  function tabs() {
    var all = document.querySelectorAll('[role="tab"]');
    var forYou = null, following = null;
    all.forEach(function (t) {
      var txt = (t.textContent || '').trim().toLowerCase();
      if (txt === 'for you') forYou = t; else if (txt === 'following') following = t;
    });
    return { forYou: forYou, following: following };
  }
  function check() {
    document.documentElement.classList.toggle('feedoff-explore', /^\/explore/.test(location.pathname));
    if (!on() || !/^\/home\/?$/.test(location.pathname)) return;
    var t = tabs(); if (!t.forYou || !t.following) return;
    if (t.forYou.getAttribute('aria-selected') === 'true') {
      var now = Date.now(); if (now - last < 1500) return; last = now;
      try { t.following.click(); } catch (e) {}
    }
    t.forYou.style.setProperty('display', 'none', 'important');
  }
  setTimeout(check, 1200);
  FO && FO.onSweep(check);
  window.addEventListener('popstate', function () { setTimeout(check, 100); });
})();
