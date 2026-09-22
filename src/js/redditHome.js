// Reddit: mark the Home / Popular / All pages so the CSS can hide their feeds, and show a hint
// where the feed was. Subreddits you visit directly keep their posts.
(function () {
  if (!/reddit\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('homefeed') !== -1; }
  var ID = '__feedoff_reddit_hint';
  function isHome() { return /^\/(r\/(popular|all)\/?|best\/?)?$/.test(location.pathname) || /^\/\?feed=/.test(location.pathname + location.search); }
  function apply() {
    var home = on() && isHome();
    document.documentElement.classList.toggle('feedoff-home', home);
    var hint = document.getElementById(ID);
    if (home && !hint) {
      var box = document.createElement('div');
      box.id = ID;
      box.style.cssText = 'position:fixed;left:16px;right:16px;top:40%;transform:translateY(-50%);padding:22px 18px;border-radius:16px;background:rgba(127,127,127,.12);text-align:center;font:15px/1.45 -apple-system,system-ui,sans-serif;color:inherit;z-index:2147483000;pointer-events:none;';
      var t = document.createElement('div'); t.style.cssText = 'font-weight:700;font-size:17px;margin-bottom:6px;'; t.textContent = 'Home feed hidden';
      var s = document.createElement('div'); s.style.cssText = 'opacity:.75;'; s.textContent = 'Open the menu in the top left for your communities, or search for one. Posts inside a community show as normal.';
      box.appendChild(t); box.appendChild(s);
      document.body.appendChild(box);
    } else if (!home && hint) {
      hint.remove();
    }
  }
  setTimeout(apply, 800);
  FO && FO.onSweep(apply);
  window.addEventListener('popstate', function () { setTimeout(apply, 50); });
})();
