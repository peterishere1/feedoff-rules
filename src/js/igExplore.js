// Instagram: Search lives on the Explore page (/explore/), and tapping the search box moves to
// /explore/search/. Mark the bare Explore page so the CSS can hide its grid and leave Search alone.
(function () {
  if (!/instagram\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function check() { document.documentElement.classList.toggle('feedoff-explore', /^\/explore\/?$/.test(location.pathname)); }
  check();
  setTimeout(check, 800);
  FO && FO.onSweep(check);
  window.addEventListener('popstate', function () { setTimeout(check, 50); });
})();
