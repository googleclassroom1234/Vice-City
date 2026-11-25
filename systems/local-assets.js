/* Keep the engine's runtime file requests in this game's Oracle vault. */
(function () {
  'use strict';
  var root = new URL('./', location.href);
  function local(value) {
    var url = new URL(String(value), root);
    if (url.hostname === 'cdn.dos.zone' && url.pathname.indexOf('/vcsky/') === 0) {
      return new URL(url.pathname.replace(/^\/vcsky\/(?:fetched\/)?/, '').toLowerCase(), root).href;
    }
    return value;
  }
  var fetchFile = window.fetch;
  window.fetch = function (input, options) {
    if (input instanceof Request) {
      var mapped = local(input.url);
      if (mapped !== input.url) input = new Request(mapped, input);
    } else input = local(input);
    return fetchFile.call(this, input, options);
  };
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function () {
    arguments[1] = local(arguments[1]);
    return open.apply(this, arguments);
  };
})();
