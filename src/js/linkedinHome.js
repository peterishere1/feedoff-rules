// LinkedIn: mark the Home feed page so its CSS can hide the feed, and show a hint where it was.
// A post opened from a notification goes to its own page, so it still opens with the feed hidden.
(function () {
  if (!/linkedin\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('homefeed') !== -1; }
  var ID = '__feedoff_li_hint';
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
  function apply() {
    if (openPost() || backFromPost()) { document.documentElement.classList.add('feedoff-home'); return; }
    var home = on() && isHome();
    document.documentElement.classList.toggle('feedoff-home', home);
    var hint = document.getElementById(ID);
    if (home && !hint) {
      var box = document.createElement('div');
      box.id = ID;
      box.style.cssText = 'position:fixed;left:16px;right:16px;top:40%;transform:translateY(-50%);padding:22px 18px;border-radius:16px;background:rgba(127,127,127,.12);text-align:center;font:15px/1.45 -apple-system,system-ui,sans-serif;color:inherit;z-index:2147483000;';
      var t = document.createElement('div'); t.style.cssText = 'font-weight:700;font-size:17px;margin-bottom:6px;'; t.textContent = 'Feed hidden';
      var s = document.createElement('div'); s.style.cssText = 'opacity:.75;margin-bottom:14px;'; s.textContent = 'In FeedOff, LinkedIn is for messages, notifications, jobs and people. The feed stays off.';
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
  openPost();
  setTimeout(apply, 800);
  FO && FO.onSweep(apply);
  window.addEventListener('popstate', function () { setTimeout(apply, 50); });
})();
