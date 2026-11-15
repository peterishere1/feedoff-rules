// Instagram: a reel opened from a message plays in the full-screen viewer, which is a vertical list
// of reels you can keep swiping through. With "Hide Reels" on, pin that list to the reel that was
// opened: no scrolling to the next one, whatever address the viewer uses.
(function () {
  if (!/instagram\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('reels') !== -1; }
  var locked = null, anchor = 0;

  // The viewer is the nearest scrollable ancestor of a video that holds several screens of video.
  function findViewer() {
    var vids = document.querySelectorAll('video');
    if (vids.length < 2) return null;
    for (var i = 0; i < vids.length && i < 4; i++) {
      for (var n = vids[i].parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        if (n.clientHeight < innerHeight * 0.6 || n.scrollHeight < n.clientHeight * 1.8) continue;
        var oy = getComputedStyle(n).overflowY;
        if (oy === 'auto' || oy === 'scroll' || n === locked) return n;
      }
    }
    return null;
  }
  function hold() { if (locked && Math.abs(locked.scrollTop - anchor) > 1) locked.scrollTop = anchor; }
  function unlock() {
    if (!locked) return;
    locked.removeEventListener('scroll', hold, true);
    locked.style.removeProperty('overflow-y');
    locked.style.removeProperty('overscroll-behavior');
    locked.removeAttribute('data-feedoff-reel-lock');
    locked = null;
  }
  function apply() {
    if (locked && !locked.isConnected) locked = null;
    if (!on()) { unlock(); return; }
    var v = findViewer();
    if (!v) { unlock(); return; }
    if (v !== locked) {
      unlock();
      locked = v;
      // Stay on the reel that is on screen now (the one that was opened).
      var step = v.clientHeight || 1;
      anchor = Math.round(v.scrollTop / step) * step;
      v.setAttribute('data-feedoff-reel-lock', '1');
      v.addEventListener('scroll', hold, true);
    }
    if (locked.style.getPropertyValue('overflow-y') !== 'hidden') {
      locked.style.setProperty('overflow-y', 'hidden', 'important');
      locked.style.setProperty('overscroll-behavior', 'none', 'important');
    }
    hold();
  }
  // Belt and braces: swallow vertical drags on the pinned list itself. Sheets that open over it
  // (comments, share) scroll in their own containers and are left alone.
  function block(e) {
    if (!locked || !locked.contains(e.target)) return;
    for (var n = e.target; n && n !== locked; n = n.parentElement) {
      if (n.scrollHeight > n.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return;
    }
    if (e.cancelable) e.preventDefault();
    e.stopImmediatePropagation();
  }
  document.addEventListener('touchmove', block, { capture: true, passive: false });
  document.addEventListener('wheel', block, { capture: true, passive: false });
  apply();
  setTimeout(apply, 800);
  FO && FO.onSweep(apply);
  window.addEventListener('popstate', function () { setTimeout(apply, 50); });
})();
