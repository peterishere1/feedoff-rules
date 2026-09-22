// YouTube: pause when a video ends and keep the Autoplay toggle off.
(function () {
  if (!/youtube\.com$/.test(location.hostname)) return;
  function killAutonav() {
    document.querySelectorAll('.ytm-autonav-toggle-button-container[aria-pressed="true"], button[aria-label*="Autoplay is on"]').forEach((b) => {
      try { b.click(); } catch (_) {}
    });
  }
  function hook(video) {
    if (video.__foHooked) return;
    video.__foHooked = true;
    video.addEventListener('ended', () => {
      try { video.pause(); } catch (_) {}
      killAutonav();
    });
  }
  function sweep() {
    document.querySelectorAll('video').forEach(hook);
    killAutonav();
  }
  window.__feedoff && window.__feedoff.onSweep(sweep);
  sweep();
})();
