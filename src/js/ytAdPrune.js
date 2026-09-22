// YouTube: remove ad slots from the player data before the player ever sees them.
// Runs at document start. Gated by the "ads" toggle via window.__feedoff.enabled.
(function () {
  if (!/youtube\.com$/.test(location.hostname)) return;
  var FO = window.__feedoff;
  function on() { return !FO || !FO.enabled || FO.enabled.indexOf('ads') !== -1; }
  var KEYS = ['adPlacements', 'playerAds', 'adSlots', 'adBreakHeartbeatParams', 'adBreakParams', 'adParams'];
  function prune(o) {
    if (!o || typeof o !== 'object') return o;
    try {
      for (var i = 0; i < KEYS.length; i++) if (KEYS[i] in o) delete o[KEYS[i]];
      if (o.playerResponse) prune(o.playerResponse);
      if (o.playerConfig && o.playerConfig.daiConfig) delete o.playerConfig.daiConfig;
    } catch (e) {}
    return o;
  }
  var origParse = JSON.parse;
  JSON.parse = function () { var r = origParse.apply(this, arguments); return on() ? prune(r) : r; };
  if (window.Response && Response.prototype.json) {
    var origJson = Response.prototype.json;
    Response.prototype.json = function () {
      return origJson.apply(this, arguments).then(function (r) { return on() ? prune(r) : r; });
    };
  }
  var initial;
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true,
      get: function () { return initial; },
      set: function (v) { initial = on() ? prune(v) : v; },
    });
  } catch (e) {}
})();
