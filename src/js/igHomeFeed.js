// Instagram: with the "feed" toggle on, the home tab keeps the stories tray and nothing else.
// The post list is the stories tray's sibling, so mark that container and let the CSS hide it.
(function () {
  if (!/instagram\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('feed') !== -1; }
  var ID = '__feedoff_ig_hint';
  function isHome() { return /^\/?$/.test(location.pathname); }
  function isTray(el) {
    if (!el || el.matches('article') || el.querySelector('article')) return false;
    return !!el.querySelector('a[href^="/stories/"], canvas') || /your story/i.test(el.textContent || '');
  }
  function markFeed() {
    var main = document.querySelector('main');
    var art = main && main.querySelector('article');
    if (!art) return false;
    var el = art;
    while (el.parentElement && el.parentElement !== main && !isTray(el.previousElementSibling)) el = el.parentElement;
    if (el.parentElement === main || el === main) return false;
    if (el.getAttribute('data-feedoff-feed') !== '1') el.setAttribute('data-feedoff-feed', '1');
    return true;
  }
  function apply() {
    var home = on() && isHome();
    document.documentElement.classList.toggle('feedoff-ighome', home);
    if (home) markFeed();
    var hint = document.getElementById(ID);
    if (home && !hint) {
      var box = document.createElement('div');
      box.id = ID;
      box.style.cssText = 'position:fixed;left:16px;right:16px;top:50%;transform:translateY(-50%);padding:22px 18px;border-radius:16px;background:rgba(127,127,127,.12);text-align:center;font:15px/1.45 -apple-system,system-ui,sans-serif;color:inherit;z-index:2147483000;pointer-events:none;';
      var t = document.createElement('div'); t.style.cssText = 'font-weight:700;font-size:17px;margin-bottom:6px;'; t.textContent = 'Feed hidden';
      var s = document.createElement('div'); s.style.cssText = 'opacity:.75;'; s.textContent = 'Your stories, messages, profile and posting still work. Turn "Hide the whole feed" off in FeedOff settings to bring posts back.';
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
