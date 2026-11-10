// LinkedIn (desktop): mark the Home feed page so its CSS can hide the feed. The post box and both
// sidebars stay, so no hint is drawn over the page.
// A post opened from a notification goes to its own page, so it still opens with the feed hidden.
(function () {
  if (!/linkedin\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('homefeed') !== -1; }
  function isHome() { return /^\/(feed\/?|)$/.test(location.pathname) || /^\/feed\/(update|hashtag)?\/?$/.test(location.pathname); }
  // Notifications link to the feed with one post pinned on top (/feed/?highlightedUpdateUrn=...).
  // With the feed hidden that would be a blank page, so open the post on its own page instead.
  var sent = '';
  function urnFrom(pathname, search) {
    if (!/^\/feed\/?$/.test(pathname)) return null;
    var m = /[?&]highlightedUpdateUrns?=([^&#]+)/.exec(search || '');
    if (!m) return null;
    var urn; try { urn = decodeURIComponent(m[1]); } catch (e) { return null; }
    urn = urn.replace(/^[(\[]+/, '').split(',')[0];
    return /^urn:li:(activity|ugcPost|share):[0-9]+$/.test(urn) ? urn : null;
  }
  function openPost() {
    if (!on()) return false;
    var urn = urnFrom(location.pathname, location.search);
    if (!urn) return false;
    if (sent !== urn) { sent = urn; mark(urn); location.replace('/feed/update/' + urn + '/'); }
    return true;
  }
  // LinkedIn's post page puts the Home feed behind itself in history, so Back from a post opened
  // this way would land on the hidden feed. Remember the post and send that Back to Notifications.
  var KEY = '__feedoff_li_post', bouncing = false;
  function mark(urn) { try { sessionStorage.setItem(KEY, urn); } catch (e) {} }
  function marked() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function unmark() { try { sessionStorage.removeItem(KEY); } catch (e) {} }
  function backFromPost() {
    var m = marked();
    if (!m) return false;
    var path; try { path = decodeURIComponent(location.pathname); } catch (e) { path = location.pathname; }
    if (path.indexOf('/feed/update/' + m) === 0) return false;
    if (!on() || !isHome()) { unmark(); return false; }
    if (!bouncing) {
      bouncing = true;
      // Re-check after a beat: the post page passes through "/" while it sets up its history.
      setTimeout(function () {
        bouncing = false;
        if (marked() && isHome() && !urnFrom(location.pathname, location.search)) { unmark(); location.replace('/notifications/'); }
      }, 350);
    }
    return true;
  }
  // Mark the Network and Notifications pages so the suggestion and news rules stay scoped to them.
  function markPath() {
    var seg = location.pathname.split('/')[1] || '';
    var root = document.documentElement;
    root.classList.toggle('feedoff-network', seg === 'mynetwork');
    root.classList.toggle('feedoff-notifications', seg === 'notifications');
  }
  function apply() {
    markPath();
    if (openPost() || backFromPost()) { document.documentElement.classList.add('feedoff-home'); return; }
    var home = on() && isHome();
    document.documentElement.classList.toggle('feedoff-home', home);
  }
  openPost();
  markPath();
  setTimeout(apply, 800);
  FO && FO.onSweep(apply);
  window.addEventListener('popstate', function () { setTimeout(apply, 50); });
})();
