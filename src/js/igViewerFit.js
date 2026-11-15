// Instagram: the full-screen viewer for a reel opened from a message sizes its box as 9:16 of the
// available height. Inside FeedOff the page is shorter than in Safari (our tab bar sits below it), so
// on wide phones that box comes out narrower than the screen while its contents are still laid out
// at full width: a dark strip on the right and the like/comment/share buttons cut off.
// Widen any such box to the full screen width. The width is forced from a stylesheet, because
// Instagram writes the box size as an inline style and rewrites it whenever it re-measures.
(function () {
  if (!/instagram\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  var STYLE_ID = '__feedoff_fit_style';
  function style() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = '[data-feedoff-fit="1"]{width:100vw !important;min-width:100vw !important;max-width:none !important;aspect-ratio:auto !important;}';
    (document.head || document.documentElement).appendChild(s);
  }
  function fit() {
    var vw = innerWidth, vh = innerHeight;
    // Start from the video, or from the still image shown while the video is loading.
    var vids = document.querySelectorAll('video, img, canvas');
    for (var i = 0, seen = 0; i < vids.length && seen < 6; i++) {
      if (vids[i].getBoundingClientRect().height < vh * 0.5) continue;
      seen++;
      for (var n = vids[i]; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        if (n.getAttribute('data-feedoff-fit') === '1') continue;
        var r = n.getBoundingClientRect();
        // Tall, flush left, and a little narrower than the screen (a 9:16 box of a short page).
        if (r.height < vh * 0.5 || r.left > 1 || r.width > vw - 8 || r.width < vw * 0.7) continue;
        style();
        // Keep the height it has now; only the width changes.
        if (n !== vids[i]) n.style.setProperty('height', Math.round(r.height) + 'px', 'important');
        n.setAttribute('data-feedoff-fit', '1');
      }
    }
  }
  fit();
  setTimeout(fit, 800);
  setInterval(fit, 150);
  FO && FO.onSweep(fit);
  window.addEventListener('resize', function () { setTimeout(fit, 100); });
})();
