// YouTube desktop: when the Home feed is hidden, show a small card on / pointing to Subscriptions
// (the redirect handles most visits; this covers in-page navigation back to the logo).
(function () {
  if (!/youtube\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  var ID = '__feedoff_yt_home_hint';
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('homefeed') !== -1; }
  function check() {
    var onHome = location.pathname === '/' && on();
    document.documentElement.classList.toggle('feedoff-home', onHome);
    var box = document.getElementById(ID);
    if (!onHome) { if (box) box.remove(); return; }
    if (box) return;
    box = document.createElement('div'); box.id = ID;
    box.style.cssText = 'position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);max-width:420px;padding:26px 28px;border-radius:18px;background:rgba(127,127,127,.12);text-align:center;font:15px/1.45 system-ui,sans-serif;color:inherit;z-index:2147483000;';
    var t = document.createElement('div'); t.style.cssText = 'font-weight:700;font-size:18px;margin-bottom:6px;'; t.textContent = 'Home feed hidden';
    var s = document.createElement('div'); s.style.cssText = 'opacity:.75;margin-bottom:16px;'; s.textContent = 'FeedOff keeps YouTube to what you follow and what you search for.';
    var a = document.createElement('a'); a.href = '/feed/subscriptions'; a.textContent = 'Go to Subscriptions';
    a.style.cssText = 'display:inline-block;padding:10px 22px;border-radius:999px;background:#FF6B4A;color:#fff;font-weight:600;text-decoration:none;';
    box.appendChild(t); box.appendChild(s); box.appendChild(a);
    document.body.appendChild(box);
  }
  setTimeout(check, 500);
  FO && FO.onSweep(check);
  window.addEventListener('popstate', function () { setTimeout(check, 100); });
})();
