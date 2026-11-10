// Instagram (desktop): Search lives on the Explore page, so that page has to stay. Mark it so the
// CSS can hide the grid of suggested posts under the search box.
(function () {
  if (!/instagram\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function check() { document.documentElement.classList.toggle('feedoff-explore', /^\/explore\/?$/.test(location.pathname)); }
  check();
  setTimeout(check, 800);
  FO && FO.onSweep(check);
  window.addEventListener('popstate', function () { setTimeout(check, 50); });
})();
