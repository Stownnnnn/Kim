/* ==========================================================================
   KIM — son procédural (Web Audio, aucun fichier audio)
   Désactivé par défaut. Bruit de pièce, pas, mur, Système.
   ========================================================================== */

window.KimAudio = (() => {
  'use strict';
  let ctx = null, master = null, ambient = null, on = false;

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    return true;
  }

  function noise(seconds, brown) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }

  /* Le « son de la pièce » : un souffle grave et un bourdon presque inaudible */
  function startAmbient() {
    const src = ctx.createBufferSource();
    src.buffer = noise(6, true);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 240;
    const g = ctx.createGain(); g.gain.value = 0.32;
    src.connect(lp).connect(g).connect(master);
    src.start();

    const hum = ctx.createOscillator();
    hum.type = 'sine'; hum.frequency.value = 43;
    const hg = ctx.createGain(); hg.gain.value = 0.05;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 0.03;
    lfo.connect(lg).connect(hg.gain);
    hum.connect(hg).connect(master);
    hum.start(); lfo.start();
    ambient = { src, hum, lfo };
  }

  function thump(t, vol, freq) {
    const s = ctx.createBufferSource();
    s.buffer = noise(0.18, false);
    const bp = ctx.createBiquadFilter();
    bp.type = 'lowpass'; bp.frequency.value = freq || 160;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16);
    s.connect(bp).connect(g).connect(master);
    s.start(t); s.stop(t + 0.2);
  }

  function beep(t, f, dur, vol, type) {
    const o = ctx.createOscillator();
    o.type = type || 'square'; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.setValueAtTime(vol, t + dur - 0.01);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    o.connect(lp).connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  const ready = () => on && ctx && ctx.state === 'running';

  return {
    get on() { return on; },
    setOn(v) {
      on = !!v;
      if (on) {
        if (!init()) return;
        ctx.resume();
        if (!ambient) startAmbient();
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0.7, ctx.currentTime, 0.6);
      } else if (ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      }
    },
    steps() {
      if (!ready()) return;
      const t = ctx.currentTime + 0.02;
      thump(t, 0.55, 150); thump(t + 0.3, 0.45, 140); thump(t + 0.6, 0.32, 130);
    },
    wall() {
      if (!ready()) return;
      thump(ctx.currentTime + 0.01, 0.8, 90);
    },
    ping() {
      if (!ready()) return;
      const t = ctx.currentTime + 0.01;
      beep(t, 988, 0.05, 0.035); beep(t + 0.07, 1480, 0.07, 0.03);
    },
    tone() {
      if (!ready()) return;
      const t = ctx.currentTime + 0.01;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 392;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 3.2);
      o.connect(g).connect(master); o.start(t); o.stop(t + 3.3);
    }
  };
})();
