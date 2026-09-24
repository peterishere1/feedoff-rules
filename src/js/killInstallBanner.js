// Remove "Open in app" / "Use the app" prompts on Instagram and YouTube mobile web.
(function () {
  const PHRASES = ['Open in app', 'Open app', 'Open App', 'Use the app', 'Use app', 'Open Instagram', 'Get the app', 'Get app', 'Use the LinkedIn app', 'Open TikTok', 'Get the full app experience'];
  // Whole overlays/dialogs: hide the element itself.
  const DIALOGS = [
    'ytm-mealbar-promo-renderer',
    'ytm-upsell-dialog-renderer',
    '.upsell-dialog',
    'ytm-app-upsell-renderer',
    'configured-xpromo-modal',
    'xpromo-nsfw-blocking-modal',
  ];
  // App-store / deep links: hide just the button wrapping them, never the bar they sit in.
  const LINKS = [
    'a[href^="intent://"]',
    'a[href*="apps.apple.com"]',
    'a[href*="itunes.apple.com"]',
    'a[href*="play.google.com/store"]',
    'a[href*="redirect_app_store_ios"]',
    'a[href^="instagram://"]',
    'a[href^="youtube://"]',
    'a[href^="vnd.youtube"]',
    'a[href*="applink.reddit.com"]',
    'a[href*="onelink.me"]',
    'a[href^="reddit://"]',
    'a[href^="twitter://"]',
    'a[href^="linkedin://"]',
    'a[href*="app.adjust.com"]',
  ];
  function hide(el) {
    if (!el || el.__foBanner) return;
    el.__foBanner = true;
    el.style.setProperty('display', 'none', 'important');
  }
  function buttonShell(el) {
    return el.closest('ytm-button-renderer, button, [role="button"]') || el;
  }
  // A sticky/fixed bar or dialog wrapping an app prompt is the thing to hide, not just its label.
  function bannerRoot(el) {
    let n = el;
    for (let i = 0; i < 6 && n && n !== document.body; i++) {
      const pos = getComputedStyle(n).position;
      if (pos === 'fixed' || pos === 'sticky') return n;
      if (n.getAttribute && (n.getAttribute('role') === 'dialog' || n.getAttribute('role') === 'alertdialog')) return n;
      n = n.parentElement;
    }
    return el;
  }
  function sweep() {
    for (const sel of DIALOGS) document.querySelectorAll(sel).forEach(hide);
    for (const sel of LINKS) document.querySelectorAll(sel).forEach((el) => hide(buttonShell(el)));
    document.querySelectorAll('button, a, div[role="button"]').forEach((el) => {
      if (el.__foChecked) return;
      const t = (el.textContent || '').trim();
      if (t.length > 40) return;
      el.__foChecked = true;
      if (PHRASES.some((p) => t === p)) hide(bannerRoot(buttonShell(el)));
    });
  }
  window.__feedoff && window.__feedoff.onSweep(sweep);
  sweep();
})();
