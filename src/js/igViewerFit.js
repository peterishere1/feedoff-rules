// Instagram: the full-screen viewer for a reel opened from a message sizes its box as 9:16 of the
// available height. Inside FeedOff the page is shorter than in Safari (our tab bar sits below it), so
// on wide phones that box comes out narrower than the screen while its contents are still laid out
// at full width: a dark strip on the right and the like/comment/share buttons cut off.
// Widen any such box to the full screen width.
(function () {
  if (!/instagram\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function fit() {
    var vw = innerWidth, vh = innerHeight;
    var vids = document.querySelectorAll('video');
    for (var i = 0; i < vids.length && i < 6; i++) {
      if (vids[i].getBoundingClientRect().height < vh * 0.5) continue;
      for (var n = vids[i].parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        if (n.getAttribute('data-feedoff-fit') === '1') continue;
        var r = n.getBoundingClientRect();
        // Tall, flush left, narrower than the screen, and holding content wider than itself.
        if (r.height < vh * 0.5 || r.left > 1 || r.width > vw - 8 || n.scrollWidth <= n.clientWidth + 8) continue;
        n.setAttribute('data-feedoff-fit', '1');
        n.style.setProperty('height', Math.round(r.height) + 'px', 'important');
        n.style.setProperty('aspect-ratio', 'auto', 'important');
        n.style.setProperty('width', '100vw', 'important');
        n.style.setProperty('min-width', '100vw', 'important');
        n.style.setProperty('max-width', 'none', 'important');
      }
    }
  }
  fit();
  setTimeout(fit, 800);
  FO && FO.onSweep(fit);
  window.addEventListener('resize', function () { setTimeout(fit, 100); });
})();
