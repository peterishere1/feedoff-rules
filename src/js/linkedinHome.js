// LinkedIn: mark the Home feed page so its CSS can hide the feed, and show a hint where it was.
(function () {
  if (!/linkedin\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('homefeed') !== -1; }
  var ID = '__feedoff_li_hint';
  function isHome() { return /^\/(feed\/?|)$/.test(location.pathname) || /^\/feed\/(update|hashtag)?\/?$/.test(location.pathname); }
  function apply() {
    var home = on() && isHome();
    document.documentElement.classList.toggle('feedoff-home', home);
    var hint = document.getElementById(ID);
    if (home && !hint) {
      var box = document.createElement('div');
      box.id = ID;
      box.style.cssText = 'position:fixed;left:16px;right:16px;top:40%;transform:translateY(-50%);padding:22px 18px;border-radius:16px;background:rgba(127,127,127,.12);text-align:center;font:15px/1.45 -apple-system,system-ui,sans-serif;color:inherit;z-index:2147483000;';
      var t = document.createElement('div'); t.style.cssText = 'font-weight:700;font-size:17px;margin-bottom:6px;'; t.textContent = 'Feed hidden';
      var s = document.createElement('div'); s.style.cssText = 'opacity:.75;margin-bottom:14px;'; s.textContent = 'LinkedIn Lite is for messages, notifications, jobs and people. The feed stays off.';
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;';
      [['Messages', '/messaging/'], ['Notifications', '/notifications/'], ['Jobs', '/jobs/']].forEach(function (pair) {
        var a = document.createElement('a'); a.href = pair[1]; a.textContent = pair[0];
        a.style.cssText = 'display:inline-block;padding:9px 16px;border-radius:999px;background:#FF6B4A;color:#fff;font-weight:600;text-decoration:none;font-size:14px;';
        row.appendChild(a);
      });
      box.appendChild(t); box.appendChild(s); box.appendChild(row);
      document.body.appendChild(box);
    } else if (!home && hint) {
      hint.remove();
    }
  }
  setTimeout(apply, 800);
  FO && FO.onSweep(apply);
  window.addEventListener('popstate', function () { setTimeout(apply, 50); });
})();
