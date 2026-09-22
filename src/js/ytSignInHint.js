// YouTube: the Subscriptions page is empty when signed out. Show a hint instead of a blank screen.
(function () {
  if (!/youtube\.com$/.test(location.hostname)) return;
  var ID = '__feedoff_yt_hint';
  function hasContent() {
    return !!document.querySelector('ytm-section-list-renderer, ytm-item-section-renderer, ytm-rich-grid-renderer, ytm-watch, ytm-search');
  }
  function signedIn() {
    return !!document.querySelector('ytm-profile-icon img, img.avatar, [aria-label*="Account"] img');
  }
  function show() {
    if (document.getElementById(ID)) return;
    var box = document.createElement('div');
    box.id = ID;
    box.style.cssText = 'position:fixed;left:16px;right:16px;top:45%;transform:translateY(-50%);padding:22px 18px;border-radius:16px;background:rgba(127,127,127,.12);text-align:center;font:15px/1.45 -apple-system,system-ui,sans-serif;color:inherit;z-index:2147483000;';
    var t = document.createElement('div'); t.style.cssText = 'font-weight:700;font-size:17px;margin-bottom:6px;'; t.textContent = 'Sign in to see your subscriptions';
    var s = document.createElement('div'); s.style.cssText = 'opacity:.75;margin-bottom:14px;'; s.textContent = 'YouTube Lite opens on Subscriptions instead of the Home feed. Sign in once and it stays signed in.';
    var a = document.createElement('a');
    a.href = 'https://accounts.google.com/ServiceLogin?service=youtube&continue=' + encodeURIComponent('https://m.youtube.com/feed/subscriptions');
    a.textContent = 'Sign in';
    a.style.cssText = 'display:inline-block;padding:10px 22px;border-radius:999px;background:#FF6B4A;color:#fff;font-weight:600;text-decoration:none;';
    box.appendChild(t); box.appendChild(s); box.appendChild(a);
    document.body.appendChild(box);
  }
  function hide() { var b = document.getElementById(ID); if (b) b.remove(); }
  function check() {
    var onSubs = /^\/feed\/subscriptions/.test(location.pathname);
    if (onSubs && !hasContent() && !signedIn()) show(); else hide();
  }
  setTimeout(check, 2500);
  window.__feedoff && window.__feedoff.onSweep(check);
})();
