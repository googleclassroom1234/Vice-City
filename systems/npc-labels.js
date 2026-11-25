/* Read-only labels for the pinned Vice City WebAssembly runtime.
 * Layout: CPools::ms_pPedPool; CPed size/type/health/position; TheCamera's
 * screen matrix. Projection follows CSprite::CalcScreenCoors (Wasm func 989),
 * without its far-clip test. Keep the engine hash check in the tests current.
 */
(function () {
  'use strict';
  var POOL = 3076984, MATRIX = 3009492, STRIDE = 1788;
  var MENU_SCREEN = 3046868, SETTING = 'gv.vice-city.here-labels';

  function readEnabled(storage) {
    try { return storage.getItem(SETTING) === '1'; } catch (_) { return false; }
  }

  function inOptions(heap, menuActive) {
    // CMenuManager at 3046640, current screen at +228; screen 27 is Options.
    return menuActive && !!heap && heap.byteLength >= MENU_SCREEN + 4 &&
      new Uint32Array(heap.buffer)[MENU_SCREEN / 4] === 27;
  }

  function project(matrix, x, y, z, width, height) {
    var sx = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    var sy = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    var depth = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    if (![sx, sy, depth].every(Number.isFinite)) return null;
    var divisor = Math.max(Math.abs(depth), 0.001);
    var dx = (sx - depth * 0.5) / divisor * width;
    var dy = (sy - depth * 0.5) / divisor * height;
    var edge = depth <= 0 || Math.abs(dx) > width / 2 - 30 || Math.abs(dy) > height / 2 - 30;
    if (edge) {
      if (Math.abs(dx) + Math.abs(dy) < 0.001) dy = height;
      var scale = Math.min((width / 2 - 30) / Math.max(Math.abs(dx), 0.001),
        (height / 2 - 30) / Math.max(Math.abs(dy), 0.001));
      dx *= scale;
      dy *= scale;
    }
    return {x: width / 2 + dx, y: height / 2 + dy, edge: edge, angle: Math.atan2(dy, dx)};
  }

  function targets(heap, width, height) {
    if (!heap || heap.byteLength < POOL + 4 || width <= 60 || height <= 60) return [];
    var words = new Uint32Array(heap.buffer), floats = new Float32Array(heap.buffer);
    var pool = words[POOL / 4];
    if (!pool || pool % 4 || pool + 12 > heap.byteLength) return [];
    var objects = words[pool / 4], flags = words[pool / 4 + 1], count = words[pool / 4 + 2];
    if (!objects || objects % 4 || !flags || count > 10000 ||
        objects + count * STRIDE > heap.byteLength || flags + count > heap.byteLength) return [];
    var matrix = floats.subarray(MATRIX / 4, MATRIX / 4 + 16);
    if (!matrix.some(function (value) { return value !== 0; })) return [];
    var result = [];
    for (var slot = 0; slot < count; slot++) {
      if (heap[flags + slot] & 128) continue; // Empty pool slots retain old bytes.
      var ped = objects + slot * STRIDE;
      if (words[(ped + 976) / 4] !== 20 || !(floats[(ped + 848) / 4] > 0)) continue;
      var point = project(matrix, floats[(ped + 52) / 4], floats[(ped + 56) / 4],
        floats[(ped + 60) / 4] + 1.2, width, height);
      if (point) result.push(point);
    }
    return result;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = {project: project, targets: targets, readEnabled: readEnabled, inOptions: inOptions};
    return;
  }

  var enabled = false, options, checkbox, overlay, context;
  try { enabled = readEnabled(window.localStorage); } catch (_) {}

  function updateOptions(canvas) {
    if (!canvas || !inOptions(window.HEAPU8, document.body.dataset.stateMenu === '1')) {
      if (options) options.hidden = true;
      if (checkbox && document.activeElement === checkbox) checkbox.blur();
      return;
    }
    if (!options) {
      options = document.createElement('label');
      options.id = 'npc-here-options';
      options.style.cssText = 'position:fixed;z-index:101;box-sizing:border-box;' +
        'padding:12px 18px;border:2px solid #f5a5d4;border-radius:4px;' +
        'background:#15101df2;color:#f5a5d4;font:600 18px sans-serif;' +
        'text-align:center;cursor:pointer;';
      checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = enabled;
      checkbox.style.cssText = 'width:20px;height:20px;margin:0 12px 0 0;vertical-align:middle;accent-color:#f5a5d4;';
      checkbox.addEventListener('change', function () {
        enabled = checkbox.checked;
        try { window.localStorage.setItem(SETTING, enabled ? '1' : '0'); } catch (_) {}
        if (!enabled && overlay) overlay.hidden = true;
      });
      options.appendChild(checkbox);
      options.appendChild(document.createTextNode('HERE labels'));
    }
    if (options.parentNode !== canvas.parentNode) canvas.parentNode.appendChild(options);
    var rect = canvas.getBoundingClientRect();
    var width = Math.min(340, rect.width - 32);
    options.style.left = rect.left + (rect.width - width) / 2 + 'px';
    options.style.top = rect.top + rect.height * 0.8 + 'px';
    options.style.width = width + 'px';
    options.hidden = false;
  }

  // Installed before SDL: keep checkbox input out of the native menu's controls.
  // Browser checkbox/label activation still works, including Tab and Space.
  ['keydown', 'keyup', 'mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup', 'touchstart', 'touchend']
    .forEach(function (type) {
      window.addEventListener(type, function (event) {
        if (options && !options.hidden && event.type === 'keydown' && event.key === 'Tab') {
          checkbox.focus();
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (!options || options.hidden || !options.contains(event.target)) return;
        if (event.key === 'Escape' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          checkbox.blur();
          return;
        }
        event.stopImmediatePropagation();
      }, true);
    });

  function frame() {
    window.requestAnimationFrame(frame);
    var canvas = document.getElementById('canvas');
    updateOptions(canvas);
    if (!enabled || !canvas || !window.HEAPU8 || document.body.dataset.stateMenu === '1' ||
        document.body.dataset.stateCutscene === '1' || document.body.dataset.stateDownload === '1') {
      if (overlay) overlay.hidden = true;
      return;
    }
    var rect = canvas.getBoundingClientRect();
    var points = targets(window.HEAPU8, rect.width, rect.height);
    if (!points.length) {
      if (overlay) overlay.hidden = true;
      return;
    }
    if (!overlay) {
      overlay = document.createElement('canvas');
      overlay.id = 'npc-here-labels';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:100;';
      context = overlay.getContext('2d');
    }
    // Emscripten reparents the game canvas for fullscreen; keep its overlay with it.
    if (overlay.parentNode !== canvas.parentNode) canvas.parentNode.appendChild(overlay);
    overlay.hidden = false;
    var ratio = window.devicePixelRatio || 1;
    var width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
    if (overlay.width !== width || overlay.height !== height) {
      overlay.width = width;
      overlay.height = height;
    }
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.font = 'bold 16px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    points.forEach(function (point) {
      context.fillStyle = '#15101de6';
      context.fillRect(point.x - 25, point.y - 20, 50, 24);
      context.strokeStyle = '#000';
      context.lineWidth = 3;
      context.strokeText('HERE', point.x, point.y - 8);
      context.fillStyle = '#ffeb3b';
      context.fillText('HERE', point.x, point.y - 8);
      if (point.edge) {
        context.save();
        context.translate(point.x, point.y);
        context.rotate(point.angle);
        context.beginPath();
        context.moveTo(12, 0);
        context.lineTo(5, -4);
        context.lineTo(5, 4);
        context.closePath();
        context.fill();
        context.restore();
      }
    });
  }
  window.requestAnimationFrame(frame);
})();
