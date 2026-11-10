// Desktop Reddit / Facebook: mark the home page so the CSS can empty its feed, and leave a short
// note where the feed was. The note is drawn by the engine's own placeholder style, so nothing is
// inserted into the page (these sites re-render their trees and trip over foreign nodes).
(function () {
  var FO = window.__feedoff;
  var host = location.hostname.replace(/^www\./, '');
  var SITES = {
    'reddit.com': { home: /^\/(r\/(popular|all)\/?|best\/?)?$/, anchor: 'shreddit-feed', note: 'Home feed hidden by FeedOff.\nPick a community from the sidebar, or search for one.' },
    'facebook.com': { home: /^\/(home\.php)?$/, anchor: "[role='main'] div:has(> h3:first-child + div)", note: 'News Feed hidden by FeedOff.\nGroups, Marketplace, messages and events work as usual.' }
  };
  var site = SITES[host];
  if (!site) return;
  var ATTRS = ['data-feedoff-homenote', 'data-feedoff-after', 'data-feedoff-hidden', 'data-feedoff-note'];
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('homefeed') !== -1; }
  function clear(el) { ATTRS.forEach(function (a) { el.removeAttribute(a); }); }
  function apply() {
    var home = on() && site.home.test(location.pathname);
    document.documentElement.classList.toggle('feedoff-home', home);
    var marked = document.querySelectorAll('[data-feedoff-homenote]');
    if (!home) { marked.forEach(clear); return; }
    var el = null; try { el = document.querySelector(site.anchor); } catch (e) {}
    marked.forEach(function (m) { if (m !== el) clear(m); });
    if (el && (el.getAttribute('data-feedoff-hidden') !== 'end' || !el.hasAttribute('data-feedoff-homenote'))) {
      el.setAttribute('data-feedoff-homenote', '1');
      el.setAttribute('data-feedoff-after', '1');
      el.setAttribute('data-feedoff-hidden', 'end');
      el.setAttribute('data-feedoff-note', site.note);
    }
  }
  apply();
  setTimeout(apply, 800);
  FO && FO.onSweep(apply);
  window.addEventListener('popstate', function () { setTimeout(apply, 50); });
})();
