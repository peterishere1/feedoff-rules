// YouTube: if an ad still plays, mute it and jump to its end; click Skip/close when offered.
(function () {
  if (!/youtube\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('ads') !== -1; }
  var wasMuted = null;
  function tick() {
    if (!on()) return;
    var ad = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay, ytm-player-ad-overlay, .ytp-ad-preview-container');
    var v = document.querySelector('video');
    if (ad && v) {
      if (wasMuted === null) wasMuted = v.muted;
      v.muted = true;
      if (isFinite(v.duration) && v.duration > 0) { try { v.currentTime = v.duration; } catch (e) {} }
      try { v.playbackRate = 16; } catch (e) {}
    } else if (v && wasMuted !== null) {
      v.muted = wasMuted; wasMuted = null;
      try { if (v.playbackRate === 16) v.playbackRate = 1; } catch (e) {}
    }
    var skip = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytm-skip-ad-button, [class*="skip-button"], [id*="skip-button"]');
    if (skip) { try { skip.click(); } catch (e) {} }
    var close = document.querySelector('.ytp-ad-overlay-close-button, .ytm-ad-overlay-close');
    if (close) { try { close.click(); } catch (e) {} }
  }
  setInterval(tick, 400);
  FO && FO.onSweep(tick);
})();
