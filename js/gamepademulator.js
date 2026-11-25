/*! virtual-gamepad-lib 0.3.3 | Copyright (c) 2024 Kyle W-M | MIT; see gamepad-LICENSE.txt */
(() => {
  // .cache/vice-city-port/gamepad/package/enums.js
  var g = /* @__PURE__ */ ((e) => (e.up = "up", e.down = "down", e.left = "left", e.right = "right", e))(g || {});
  var h = /* @__PURE__ */ ((e) => (e.onOff = "onOff", e.variable = "variable", e))(h || {});
  var c = /* @__PURE__ */ ((e) => (e.real = "real", e.emulated = "emulated", e.overlay = "overlay", e))(c || {});
  var R = [
    "button_1",
    "button_2",
    "button_3",
    "button_4",
    "shoulder_button_front_left",
    "shoulder_button_front_right",
    "shoulder_trigger_back_left",
    "shoulder_trigger_back_right",
    "select_button",
    "start_button",
    "stick_button_left",
    "stick_button_right",
    "dpad_up",
    "dpad_down",
    "dpad_left",
    "dpad_right"
  ];
  var P = R.map((e) => e + "_tap_target");

  // .cache/vice-city-port/gamepad/package/utilities.js
  function i(t, e, n) {
    const r = Math.sqrt(t * t + e * e);
    return r > n ? { x: t / r, y: e / r } : { x: t / n, y: e / n };
  }

  // .cache/vice-city-port/gamepad/package/GamepadEmulator.js
  var L = Object.defineProperty;
  var x = (b, e, a) => e in b ? L(b, e, { enumerable: true, configurable: true, writable: true, value: a }) : b[e] = a;
  var v = (b, e, a) => x(b, typeof e != "symbol" ? e + "" : e, a);
  var M = 18;
  var A = 4;
  var G = class G2 {
    /** Creates a new GamepadEmulator object and monkey patches the browser getGamepads() API and gamepad events to report emulated gamepads
     * - **MUST** be called before any other libraries or functions use or store the browser gamepad api!
     * @param buttonPressThreshold - the threshold above which a variable button is considered a "pressed" button */
    constructor(e) {
      v(this, "getNativeGamepads");
      v(this, "buttonPressThreshold", 0.1);
      v(this, "realGpadToPatchedIndexMap", []);
      v(this, "patchedGpadToRealIndexMap", []);
      v(this, "emulatedGamepads", []);
      v(this, "emulatedGamepadsMetadata", []);
      v(this, "undoEventPatch", () => {
      });
      v(this, "AddDisplayButtonEventListeners", this.AddButtonTouchEventListeners);
      v(this, "AddDisplayJoystickEventListeners", this.AddJoystickTouchEventListeners);
      v(this, "ClearDisplayButtonEventListeners", this.ClearButtonTouchEventListeners);
      v(this, "ClearDisplayJoystickEventListeners", this.ClearJoystickTouchEventListeners);
      if (this.buttonPressThreshold = e || this.buttonPressThreshold, G2.instanceRunning) throw new Error("Only one GamepadEmulator instance may exist at a time!");
      G2.instanceRunning = true, this.undoEventPatch = this.monkeyPatchGamepadEvents(), this.monkeyPatchGetGamepads();
    }
    /** @returns true if the gamepad api is supported natively by the browser context */
    gamepadApiNativelySupported() {
      return !!this.getNativeGamepads && !!this.getNativeGamepads.apply(navigator);
    }
    /** creates a new emmulated gamepad at the given index as would be read in navigator.getGamepads
     * @param {number} gpadIndex - the index of the gamepad to create, pass null to create a new gamepad at the next available index
     * @param {string} overlayMode - if a real gamepad is connected at the same index as this emulated one and overlayMode is true, the emulated gamepad values will get merged or overlayed on the real gamepad button and axis values, otherwise the emulated gamepad will be shifted to the next available index (appear as a separate gamepad from the real gamepad)
     * @param {number} buttonCount - normally 18, the number of buttons on the gamepad
     * @param {number} axisCount - normally 4, the number of axes on the gamepad */
    AddEmulatedGamepad(e, a, i2 = M, o = A) {
      if ((e === -1 || !e && e !== 0) && (e = this.nextEmptyEGpadIndex(a)), this.emulatedGamepads[e]) return false;
      const n = {
        emulation: c.emulated,
        connected: true,
        timestamp: performance.now(),
        displayId: "Emulated Gamepad " + e,
        id: "Emulated Gamepad " + e + " (Xinput STANDARD GAMEPAD)",
        mapping: "standard",
        index: e,
        buttons: new Array(i2).fill({ pressed: false, value: 0, touched: false }, 0, i2),
        axes: new Array(o).fill(0, 0, o),
        hapticActuators: []
      };
      this.emulatedGamepads[e] = n, this.emulatedGamepadsMetadata[e] = { overlayMode: a };
      const d = new Event("gamepadconnected");
      return d.gamepad = n, window.dispatchEvent(d), n;
    }
    /** removes the emmulated gamepad at the passed index as would be read from the list in navigator.getGamepads
     * @param {number} gpadIndex - the index of the gamepad to remove */
    RemoveEmulatedGamepad(e) {
      this.ClearButtonTouchEventListeners(e), this.ClearJoystickTouchEventListeners(e);
      var a = this.emulatedGamepads[e];
      if (a) {
        delete this.emulatedGamepads[e], delete this.emulatedGamepadsMetadata[e];
        const i2 = {
          ...a,
          connected: false,
          timestamp: performance.now()
        }, o = new Event("gamepaddisconnected");
        o.gamepad = i2, window.dispatchEvent(o);
      } else
        console.warn("GamepadEmulator Error: Cannot remove emulated gamepad. No emulated gamepad exists at index " + e);
    }
    /** emulates pressing a button on an emulated gamepad at the given gamepad button index
     * @param {number} gpadIndex - the index of the emulated gamepad (as returned by navigator.getGamepads()) to press the button on
     * @param {number} buttonIndex - the index of the button to press on the gamepad - pass an array of indexes to control multiple buttons at once
     * @param {number} value - the value to set the button to between 0 and 1 (0 = not pressed, 1 = fully pressed, 0.5 = half pressed) if this value is greater than the pressedThreshold from the constructor, the button will be considered pressed
     * @param {boolean} touched - whether the button is considered "touched" or not, a "pressed" button is always considered "touched"
    */
    PressButton(e, a, i2, o) {
      var s, r, c2;
      if (this.emulatedGamepads[e] == null) throw new Error("Error: PressButton() - no emulated gamepad at index " + e + ", pass a valid index, or call AddEmulatedGamepad() first to create an emulated gamepad at that index");
      const n = [...((s = this.emulatedGamepads[e]) == null ? void 0 : s.buttons) || []], d = i2 > this.buttonPressThreshold;
      if (Array.isArray(a)) {
        const u = d || (o ?? ((r = n[a[0]]) == null ? void 0 : r.touched)) || false;
        for (var t = 0; t < a.length; t++) {
          const l = a[t];
          if (l < 0 || l >= this.emulatedGamepads[e].buttons.length) {
            console.error("Error: PressButton() - button index " + l + " out of range, pass a valid index between 0 and " + (this.emulatedGamepads[e].buttons.length - 1));
            continue;
          }
          n[l] = {
            pressed: d,
            value: i2 || 0,
            touched: u
          };
        }
      } else {
        const u = d || (o ?? ((c2 = n[a]) == null ? void 0 : c2.touched)) || false;
        if (a < 0 || a >= this.emulatedGamepads[e].buttons.length) {
          console.error("Error: PressButton() - button index " + a + " out of range, pass a valid index between 0 and " + (this.emulatedGamepads[e].buttons.length - 1));
          return;
        }
        n[a] = {
          pressed: d,
          value: i2 || 0,
          touched: u
        };
      }
      Object.defineProperty(this.emulatedGamepads[e], "buttons", { value: n, enumerable: true, configurable: true });
    }
    /** emulates moving an axis on the gamepad at the given axis index
     * @param gpadIndex - the index of the emulated gamepad to move the axis on
     * @param axisIndex - the index of the axis to move
     * @param value - the value to set the axis to between -1 and 1 (0 = center, -1 = left/up, 1 = right/down) */
    MoveAxis(e, a, i2) {
      var n;
      if (this.emulatedGamepads[e] == null) throw new Error("Error: MoveAxis() - no emulated gamepad at index " + e + ", pass a valid index, or call AddEmulatedGamepad() first to create an emulated gamepad at that index");
      const o = [...((n = this.emulatedGamepads[e]) == null ? void 0 : n.axes) || []];
      o[a] = i2, Object.defineProperty(this.emulatedGamepads[e], "axes", { value: o, enumerable: true, configurable: true });
    }
    /** add event listeners to the html/svg button elements of an onscreen gamepad to emulate gamepad input  when touched, clicked or dragged
    * @param gpadIndex - the index of the emulated gamepad to register events for
    * @param buttonConfigs - an array of config objects that set how each of the buttons on the onscreen gamepad should behave, and how they map to the emulated gamepad buttons. */
    AddButtonTouchEventListeners(e, a) {
      if (!this.emulatedGamepads[e]) throw new Error("Error: AddJoystickTouchEventListeners() - no emulated gamepad at index " + e + ", pass a valid index, or call AddEmulatedGamepad() first to create an emulated gamepad at that index");
      let i2 = [];
      for (var o = 0; o < a.length; o++) {
        const n = a[o];
        if (!n) continue;
        const d = n.buttonIndexes ?? n.buttonIndex, t = n.tapTarget;
        if (!t) {
          console.warn("GamepadEmulator: No tap target in gamepad " + e + " display config for button " + d + ", skipping...");
          continue;
        }
        const s = (l) => {
          const m = l.changedTouches[0].target;
          (m == t || m.parentElement == t) && l.preventDefault();
        };
        window.addEventListener("touchstart", s, { passive: false });
        const r = (l) => {
          const m = l.buttons == 1 ? 1 : 0;
          (!n.lockTargetWhilePressed || m == 0) && this.PressButton(e, d, m, true);
        };
        t.addEventListener("pointerenter", r);
        const c2 = (l) => {
          const m = l.buttons == 1 ? 1 : 0;
          (!n.lockTargetWhilePressed || m == 0) && this.PressButton(e, d, 0, false);
        };
        t.addEventListener("pointerleave", c2);
        const u = (l) => {
          this.PressButton(e, d, 0, false);
        };
        if (t.addEventListener("pointercancel", u), n.type == h.onOff) {
          const l = (p) => {
            p.preventDefault(), this.PressButton(e, d, 1, true), n.lockTargetWhilePressed ? t.setPointerCapture(p.pointerId) : t.releasePointerCapture(p.pointerId);
          };
          t.addEventListener("pointerdown", l);
          const m = () => {
            this.PressButton(e, d, 0);
          };
          t.addEventListener("pointerup", m), i2.push(function() {
            window.removeEventListener("touchstart", s), t.removeEventListener("pointerenter", r), t.removeEventListener("pointerleave", c2), t.removeEventListener("pointerdown", l), t.removeEventListener("pointerup", m), t.removeEventListener("pointercancel", u);
          });
        } else if (n.type == h.variable) {
          const l = this.AddDragControlListener(n, (m, p, f) => {
            let h2 = m ? this.buttonPressThreshold + 1e-5 : 0;
            h2 += n.directions[g.left] || n.directions[g.right] ? Math.abs(p) : 0, h2 += n.directions[g.up] || n.directions[g.down] ? Math.abs(f) : 0, this.PressButton(e, d, Math.min(h2, 1));
          });
          i2.push(function() {
            window.removeEventListener("touchstart", s), t.removeEventListener("pointerenter", r), t.removeEventListener("pointerleave", c2), t.removeEventListener("pointercancel", u), l();
          });
        }
      }
      this.emulatedGamepadsMetadata[e].removeButtonListenersFunc = () => {
        i2.forEach((n) => n());
      };
    }
    /** add event listeners to the html/svg joystick elements of an onscreen gamepad to emulate gamepad input when dragged with a mouse, touch or pen.
    * @param gpadIndex - the index of the emulated gamepad to register events for
    * @param joystickConfigs - an array of config objects that set how each of the joysticks on the onscreen gamepad should behave, and how they map to the emulated gamepad axes. */
    AddJoystickTouchEventListeners(e, a) {
      if (!this.emulatedGamepads[e]) throw new Error("Error: AddJoystickTouchEventListeners() - no emulated gamepad at index " + e + ", pass a valid index, or call AddEmulatedGamepad() first to create an emulated gamepad at that index");
      let i2 = [];
      for (let o = 0; o < a.length; o++) {
        const n = a[o];
        if (!n) continue;
        if (n.tapTarget == null) {
          console.warn("GamepadEmulator: No tap target in gamepad " + e + " display config for joystick " + o + ", skipping...");
          continue;
        }
        const d = this.AddDragControlListener(n, (t, s, r) => {
          n.xAxisIndex !== void 0 && this.MoveAxis(e, n.xAxisIndex, s), n.yAxisIndex !== void 0 && this.MoveAxis(e, n.yAxisIndex, r);
        });
        i2.push(d);
      }
      this.emulatedGamepadsMetadata[e].removeJoystickListenersFunc = () => {
        i2.forEach((o) => o());
      };
    }
    /** removes event listeners added with AddButtonTouchEventListeners()
    * @param gpadIndex - the index of the emulated gamepad to un-register events for */
    ClearButtonTouchEventListeners(e) {
      var a;
      this.emulatedGamepadsMetadata[e] && ((a = this.emulatedGamepadsMetadata[e]) != null && a.removeButtonListenersFunc) && this.emulatedGamepadsMetadata[e].removeButtonListenersFunc();
    }
    /** removes event listeners added with AddJoystickTouchEventListeners()
     * @param gpadIndex - the index of the emulated gamepad to un-register events for */
    ClearJoystickTouchEventListeners(e) {
      var a;
      this.emulatedGamepadsMetadata[e] && ((a = this.emulatedGamepadsMetadata[e]) != null && a.removeJoystickListenersFunc) && this.emulatedGamepadsMetadata[e].removeJoystickListenersFunc();
    }
    AddDragControlListener(e, a) {
      let i2 = {
        startX: 0,
        startY: 0
      }, o = -1;
      const n = (s) => {
        var r = s.pointerId;
        if (o === r) {
          const c2 = e.directions[g.left] ? -1 : 0, u = e.directions[g.right] ? 1 : 0, l = e.directions[g.up] ? -1 : 0, m = e.directions[g.down] ? 1 : 0, p = s.clientX - i2.startX, f = s.clientY - i2.startY;
          let { x: h2, y: E } = i(p, f, e.dragDistance);
          h2 = Math.max(Math.min(h2, u), c2), E = Math.max(Math.min(E, m), l), a(true, h2, E);
        }
      }, d = (s) => {
        o == s.pointerId && (document.removeEventListener("pointermove", n, false), document.removeEventListener("pointerup", d, false), o = -1, a(false, 0, 0));
      };
      e.tapTarget.addEventListener("pointerdown", (s) => {
        s.preventDefault(), i2.startX = s.clientX, i2.startY = s.clientY, o = s.pointerId, e.lockTargetWhilePressed ? e.tapTarget.setPointerCapture(s.pointerId) : e.tapTarget.releasePointerCapture(s.pointerId), a(true, 0, 0), document.addEventListener("pointermove", n, false), document.addEventListener("pointerup", d, false);
      });
      const t = (s) => {
        s.changedTouches[0].target == e.tapTarget && s.preventDefault();
      };
      return window.addEventListener("touchstart", t, { passive: false }), function() {
        window.removeEventListener("touchstart", t), e.tapTarget.removeEventListener("pointerdown", n);
      };
    }
    /** returns copy of the passed Gamepad object
     * The axies and buttons arrays are deep copied.
     * Every other property is a shallow copy
     * @param original - the gamepad object to copy */
    cloneGamepad(e) {
      if (!e) return e;
      const a = e.axes ? e.axes.length : 0, i2 = e.buttons ? e.buttons.length : 0, o = {};
      for (let n in e)
        if (n === "axes") {
          const d = new Array(a);
          for (let t = 0; t < a; t++)
            d[t] = Number(e.axes[t]);
          Object.defineProperty(o, "axes", { value: d, enumerable: true, configurable: true });
        } else if (n === "buttons") {
          const d = new Array(i2);
          for (let t = 0; t < i2; t++) {
            const s = e.buttons[t];
            if (s == null) d[t] = s;
            else {
              const r = s.pressed, c2 = s.value, u = s.touched || false;
              d[t] = { pressed: r, value: c2, touched: u };
            }
          }
          Object.defineProperty(o, "buttons", { value: d, enumerable: true, configurable: true });
        } else
          Object.defineProperty(o, n, { get: () => e[n], configurable: true, enumerable: true });
      return o.emulation || Object.defineProperty(o, "emulation", { value: c.real, configurable: true, enumerable: true }), o;
    }
    /** Searches for the next available index a new emulated gamepad could go and returns that index
    * this means no emulated gamepad is at that index and either the no real gamepad is at that index, or a real gamepad is at that index, but the @param overlayMode is true. */
    nextEmptyEGpadIndex(e) {
      let a = 0;
      if (e)
        do {
          if (!this.emulatedGamepads[a]) break;
          a++;
        } while (a < this.emulatedGamepads.length);
      else {
        const i2 = Math.max(this.emulatedGamepads.length, this.patchedGpadToRealIndexMap.length);
        do {
          if (!this.emulatedGamepads[a] && this.patchedGpadToRealIndexMap[a] == null) break;
          a++;
        } while (a < i2);
      }
      return a;
    }
    /** Searches for the next available index a freshly connected real gamepad could go and returns that index
     * this means no real gamepad is mapped to that index and either no emulated gamepad is at that index, or the emulated gamepad is in overlay mode
     * @param startingIndex the index to start searching from */
    nextEmptyRealGpadIndex(e) {
      let a = e;
      const i2 = Math.max(this.emulatedGamepads.length, this.patchedGpadToRealIndexMap.length);
      do {
        const o = this.emulatedGamepadsMetadata[a], n = this.realGpadToPatchedIndexMap[a] == null && this.patchedGpadToRealIndexMap[a] == null;
        if (o && o.overlayMode || !o && n) break;
        a++;
      } while (a < i2);
      return a;
    }
    /** Intercepts gamepadconnected & gamepaddisconnected events and re-sends them with the correct gamepad indecies */
    monkeyPatchGamepadEvents() {
      let e, a, i2, o;
      window.hasOwnProperty("ongamepadconnected") && (e = Object.getOwnPropertyDescriptor(window, "ongamepadconnected"), e.configurable = true, i2 = window.ongamepadconnected, window.ongamepadconnected = null, Object.defineProperty(window, "ongamepadconnected", {
        get: () => function(t) {
        },
        // returns an empty function, so no event is fired
        set: (t) => {
          i2 = t;
        },
        configurable: true
      })), window.hasOwnProperty("ongamepaddisconnected") && (a = Object.getOwnPropertyDescriptor(window, "ongamepaddisconnected"), a.configurable = true, o = window.ongamepaddisconnected, window.ongamepaddisconnected = null, Object.defineProperty(window, "ongamepaddisconnected", {
        get: () => function(t) {
        },
        // returns an empty function, so no event is fired
        set: (t) => {
          i2 = t;
        },
        configurable: true
      }));
      const n = (t) => {
        const s = t.gamepad;
        if (s && s.emulation === void 0) {
          t.stopImmediatePropagation(), t.preventDefault();
          const r = this.cloneGamepad(t.gamepad), c2 = r.index, u = this.nextEmptyRealGpadIndex(c2);
          this.realGpadToPatchedIndexMap[c2] = u, this.patchedGpadToRealIndexMap[u] = c2, Object.defineProperty(r, "index", { get: () => u }), Object.defineProperty(r, "emulation", { get: () => c.real });
          const l = new Event(t.type || "gamepadconnected");
          l.gamepad = r, window.dispatchEvent(l);
        }
        i2 && i2.call(window, t);
      };
      window.addEventListener("gamepadconnected", n);
      const d = (t) => {
        const s = t.gamepad;
        if (s && s.emulation === void 0) {
          t.stopImmediatePropagation(), t.preventDefault();
          const r = this.cloneGamepad(t.gamepad), c2 = this.realGpadToPatchedIndexMap[r.index] || r.index;
          Object.defineProperty(r, "index", { get: () => c2 }), Object.defineProperty(r, "emulation", { get: () => c.real }), delete this.realGpadToPatchedIndexMap[r.index], delete this.patchedGpadToRealIndexMap[c2];
          const u = new Event(t.type || "gamepaddisconnected");
          u.gamepad = r, window.dispatchEvent(u);
        }
        o && o.call(window, t);
      };
      return window.addEventListener("gamepaddisconnected", d), function() {
        window.removeEventListener("gamepadconnected", n), window.hasOwnProperty("ongamepadconnected") && (Object.defineProperty(window, "ongamepadconnected", e), window.ongamepadconnected = i2), window.removeEventListener("gamepaddisconnected", d), window.hasOwnProperty("ongamepaddisconnected") && (Object.defineProperty(window, "ongamepaddisconnected", a), window.ongamepaddisconnected = o);
      };
    }
    /** overwrite the browser gamepad api getGamepads() to return the emulated gamepad data for gamepad indexes corresponding to emulated gamepads
     * if a real gamepad is found with the same index value as an emulated gamepad, the  the navigator.getGamepads() list will either shift the emulated gamepad's index up to make room for the real gamepad when (emulatedGamepad.overlayMode = false),
     * or it will return the emulated gamepad "overlayed" on the real one where buttons pressed or axes moved on both the real gamepad and the emulated one will show up on that gamepad. */
    monkeyPatchGetGamepads() {
      const e = this;
      let a = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads || navigator.msGetGamepads;
      this.getNativeGamepads = a, navigator.getNativeGamepads = a || function() {
        return [];
      }, Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: function() {
          var d;
          let i2 = e.emulatedGamepads, o = a != null ? a.apply(navigator) || [] : [], n = new Array(Math.max(o.length, i2.length)).fill(null);
          for (let t = 0; t < o.length; t++) {
            const s = o[t];
            if (!s) continue;
            let r = e.cloneGamepad(s), c2 = e.realGpadToPatchedIndexMap[r.index] || r.index;
            Object.defineProperty(r, "index", { get: () => c2 }), n[c2] = r;
          }
          for (let t = 0; t < i2.length; t++) {
            let s = n[t], r = i2[t];
            if (r && s) {
              Object.defineProperty(n[t], "emulation", { value: c.overlay, configurable: true });
              let c2 = Math.max(((d = s == null ? void 0 : s.buttons) == null ? void 0 : d.length) ?? 0, r.buttons.length), u = new Array(c2);
              for (let p = 0; p < c2; p++) {
                const f = (r == null ? void 0 : r.buttons[p]) || { touched: false, pressed: false, value: 0 }, h2 = (s == null ? void 0 : s.buttons[p]) || { touched: false, pressed: false, value: 0 };
                u[p] = {
                  touched: f.touched || h2.touched || false,
                  pressed: f.pressed || h2.pressed || false,
                  value: Math.max(f.value, h2.value) || 0
                };
              }
              Object.defineProperty(n[t], "buttons", { value: u, enumerable: true, configurable: true });
              let l = Math.max(r.axes.length, s.axes.length), m = new Array(c2);
              for (let p = 0; p < l; p++) {
                const f = r.axes[p] ?? 0, h2 = s.axes[p] ?? 0;
                m[p] = Math.abs(f) > Math.abs(h2) ? f : h2;
              }
              Object.defineProperty(n[t], "axes", { value: m, enumerable: true, configurable: true });
            } else r && (Object.defineProperty(r, "emulation", { value: c.emulated, enumerable: true, configurable: true }), Object.defineProperty(r, "timestamp", { value: performance.now(), enumerable: true, configurable: true }), n[t] = e.cloneGamepad(r));
          }
          return n;
        }
      });
    }
    /** (destructor) - Cleans up any event listeners made by this class and restores the normal navigator.getGamepad() function and gamepad events */
    cleanup() {
      for (let e = 0; e < this.emulatedGamepads.length; e++)
        this.ClearButtonTouchEventListeners(e), this.ClearJoystickTouchEventListeners(e);
      this.emulatedGamepads = [], this.undoEventPatch(), this.getNativeGamepads ? Object.defineProperty(navigator, "getGamepads", {
        value: this.getNativeGamepads,
        configurable: true
      }) : Object.defineProperty(navigator, "getGamepads", {
        value: void 0,
        configurable: true
      }), G2.instanceRunning = false, delete navigator.getNativeGamepads;
    }
  };
  v(G, "instanceRunning", false);
  var P2 = G;

  // <stdin>
  window.GamepadEmulator = P2;
})();
