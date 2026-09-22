// On a single reel/short page (/reel/ID or /shorts/ID), watch that one video only:
// block the vertical swipe that loads the next one.
(function () {
  const RX = /^\/(reel|shorts)\/[A-Za-z0-9_-]+/;
  function onSingle() { return RX.test(location.pathname); }
  function idOf(p) { const m = RX.exec(p); return m ? m[0] : null; }
  let startId = idOf(location.pathname);

  function block(e) {
    if (!onSingle()) return;
    // Let taps and horizontal drags through; stop vertical drags that page to the next video.
    if (e.type === 'touchmove' || e.type === 'wheel') {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }
  document.addEventListener('touchmove', block, { capture: true, passive: false });
  document.addEventListener('wheel', block, { capture: true, passive: false });

  // If the site still advances via pushState, step back to the video we opened.
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  function guard(url) {
    try {
      const p = new URL(url, location.href).pathname;
      const next = idOf(p);
      if (startId && next && next !== startId) return false;
      if (!startId) startId = next;
    } catch (_) {}
    return true;
  }
  history.pushState = function (s, t, url) { if (url && !guard(url)) return; return origPush(s, t, url); };
  history.replaceState = function (s, t, url) { if (url && !guard(url)) return; return origReplace(s, t, url); };
  window.addEventListener('popstate', () => { startId = idOf(location.pathname); });
})();
