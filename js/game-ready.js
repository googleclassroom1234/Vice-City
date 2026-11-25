/* Tells the player when a game has actually started, so its loader can hand
   over to a game that is already running instead of one still starting up.
   The vault server adds this to the head of every game page, ahead of the
   game's own scripts (a sub_filter in /etc/nginx/sites-enabled/default on
   the vault server; bump its ?v= when this file changes). Games it
   cannot see start fall back to the player's quiet-page check. */
(function () {
  'use strict';
  if (window.__kerroReady || window.parent === window) return;
  window.__kerroReady = true;
  function tell(state) {
    try { window.top.postMessage({ gv: state }, location.origin); } catch (e) {}
  }
  var sent = false;
  function ready() {
    if (sent) return;
    sent = true;
    // Two frames, so the game's first picture is on screen before the fade.
    requestAnimationFrame(function () { requestAnimationFrame(function () { tell('ready'); }); });
  }
  // Unity 2020 and later: createUnityInstance resolves once the game runs.
  function wrap(create) {
    if (typeof create !== 'function' || create.__kerro) return create;
    var wrapped = function () {
      tell('starting');
      if (/^\/account-play\/[a-f0-9]{32}\/traffic-rider\//.test(location.pathname) && arguments[1]) {
        arguments[1].autoSyncPersistentDataPath = true;
        arguments[1].frameworkUrl = 'Build/y8.kerro-progress-v2.framework.js';
        arguments[1].kerroProgressDatabase = '/kerro-progress/' + location.pathname.split('/')[2] + '/traffic-rider';
      }
      var started = create.apply(this, arguments);
      if (started && typeof started.then === 'function') started.then(ready, ready);
      return started;
    };
    wrapped.__kerro = true;
    return wrapped;
  }
  // Unity's loader declares it as a global function, which would replace any
  // property trap, so wrap it after each script runs. A script's load event
  // reaches this capturing listener before the page's own onload calls it.
  // It has to be the document: an element's load event never reaches window.
  function rewrap() {
    try { if (window.createUnityInstance) window.createUnityInstance = wrap(window.createUnityInstance); } catch (e) {}
    var scoped = location.pathname.match(/^\/account-play\/([a-f0-9]{32})\/2048\//);
    var Manager = window.LocalStorageManager;
    if (scoped && typeof Manager === 'function' && !Manager.__kerro) {
      var prefix = 'gv.saves.local.' + scoped[1] + '.2048.';
      var AccountManager = function () {
        Manager.apply(this, arguments);
        this.bestScoreKey = prefix + 'bestScore';
        this.gameStateKey = prefix + 'gameState';
      };
      AccountManager.prototype = Manager.prototype;
      AccountManager.__kerro = true;
      window.LocalStorageManager = AccountManager;
    }
  }
  document.addEventListener('load', function (e) {
    if (e.target && e.target.tagName === 'SCRIPT') rewrap();
  }, true);
  document.addEventListener('DOMContentLoaded', rewrap);
  rewrap();
})();
