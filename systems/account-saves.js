/* Loaded before the Vice City engine: scope its disk before the first read. */
(function () {
  'use strict';
  var match = location.pathname.match(/^\/account-play\/([a-f0-9]{32})\/grand-theft-auto-vice-city\//);
  if (!match) return;
  var id = 'grand-theft-auto-vice-city';
  var root = '/vc-assets/local/userfiles';
  var database = '/kerro-progress/' + match[1] + '/' + id;
  var signal = 'gv.saves.local.' + match[1] + '.' + id + '.commit';
  var previous = window.syncfs;
  var scoped = false;
  window.syncfs = function (fs, mount, populate, callback, run) {
    if (!scoped) {
      var getDB = fs.getDB;
      fs.getDB = function (name, done) {
        return getDB.call(this, name === root ? database : name, done);
      };
      scoped = true;
    }
    function complete(error) {
      if (!error && !populate && mount.mountpoint === root) {
        // Storage events reach the player only after IDBFS commits to disk.
        try { localStorage.setItem(signal, crypto.randomUUID()); } catch (_) {}
      }
      callback(error);
    }
    if (previous) previous(fs, mount, populate, complete, run);
    else run(complete);
  };
})();
