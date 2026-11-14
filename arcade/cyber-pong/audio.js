/**
 * Cyber Pong — Procedural Web Audio Synthesizer
 *
 * Zero-dependency Web Audio API sound engine. Exposed as window.CP.Audio.
 * Mute state persisted in localStorage under `arcade.cyber-pong.muted`.
 */
(function () {
  'use strict';

  const CP = (window.CP = window.CP || {});
  const STORAGE_KEY = 'arcade.cyber-pong.muted';

  let ctx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let muted = loadMuted();

  function loadMuted() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return false;
      return raw === 'true' || JSON.parse(raw) === true;
    } catch (e) {
      return false;
    }
  }

  function saveMuted(val) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(!!val));
    } catch (e) {
      // Ignore storage quota or private browsing errors
    }
  }

  function createNoiseBuffer(audioCtx, duration) {
    const sampleRate = audioCtx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.1;
      b2 = 0.95 * b2 + white * 0.3;
      data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.45) * 0.7));
    }
    return buffer;
  }

  /** Initialize or resume AudioContext on first user interaction. */
  function unlock() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
        masterGain = ctx.createGain();
        masterGain.gain.value = muted ? 0 : 0.75;
        masterGain.connect(ctx.destination);
        noiseBuffer = createNoiseBuffer(ctx, 1.5);
      } catch (e) {
        return null;
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function ready() {
    if (muted) return false;
    if (!ctx) unlock();
    if (!ctx) return false;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return true;
  }

  function isMuted() {
    return muted;
  }

  function setMuted(val) {
    muted = !!val;
    saveMuted(muted);
    if (ctx && masterGain) {
      const t = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.75, t, 0.015);
    }
    return muted;
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (!next) {
      unlock();
      blip('ui');
    }
    return next;
  }

  /** Pitch-escalating paddle strike, plus sub-bass + plasma crackle when overcharged. */
  function paddleHit(rally, speed, isOvercharged) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const spdFactor = 0.85 + Math.min(1.5, (speed || 370) / 500) * 0.35;
    const baseFreq = (260 + Math.min(22, rally || 0) * 22) * spdFactor;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.38, t + 0.03);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.78, t + 0.085);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.095);

    if (isOvercharged) {
      // Sub-bass kinetic punch
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(160, t);
      sub.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      subGain.gain.setValueAtTime(0.3, t);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      sub.connect(subGain);
      subGain.connect(masterGain);
      sub.start(t);
      sub.stop(t + 0.18);

      // Plasma sawtooth crackle
      const saw = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const sawGain = ctx.createGain();
      saw.type = 'sawtooth';
      saw.frequency.setValueAtTime(baseFreq * 1.55, t);
      saw.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, t + 0.15);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.Q.value = 3.2;
      sawGain.gain.setValueAtTime(0.14, t);
      sawGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      saw.connect(filter);
      filter.connect(sawGain);
      sawGain.connect(masterGain);
      saw.start(t);
      saw.stop(t + 0.17);
    }
  }

  /** Tight low-mid bass rail thud on top/bottom bounce. */
  function wallHit(speed) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const amp = Math.min(0.22, 0.11 + ((speed || 370) / 900) * 0.11);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.075);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(amp, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.085);
  }

  /** Electric laser barrier deflection chord + ricochet sweep. */
  function shieldHit() {
    if (!ready()) return;
    const t = ctx.currentTime;

    [540, 810].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.12);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.17);
    });

    const sweep = ctx.createOscillator();
    const sGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(420, t);
    sweep.frequency.exponentialRampToValueAtTime(1240, t + 0.06);
    sweep.frequency.exponentialRampToValueAtTime(620, t + 0.18);
    sGain.gain.setValueAtTime(0.14, t);
    sGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    sweep.connect(sGain);
    sGain.connect(masterGain);
    sweep.start(t);
    sweep.stop(t + 0.2);
  }

  /** Distinct synth signature per mid-court anomaly pickup. */
  function powerup(type) {
    if (!ready()) return;
    const t = ctx.currentTime;

    if (type === 'overcharge') {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.2);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, t);
      filter.frequency.exponentialRampToValueAtTime(3200, t + 0.2);
      filter.Q.value = 4.0;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.23);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.24);
    } else if (type === 'expand') {
      [
        [330, 440],
        [495, 660],
      ].forEach(([f0, f1]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f1, t + 0.22);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.27);
      });
    } else if (type === 'multiball') {
      [523.25, 659.25, 987.77].forEach((freq, idx) => {
        const start = t + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.09, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + 0.12);
      });
    } else if (type === 'barrier') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(880, t + 0.055);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.23);
    } else {
      // Phase warp FM sweep
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();
      carrier.type = 'sine';
      mod.type = 'sine';
      carrier.frequency.setValueAtTime(360, t);
      carrier.frequency.exponentialRampToValueAtTime(1440, t + 0.08);
      carrier.frequency.exponentialRampToValueAtTime(280, t + 0.24);
      mod.frequency.setValueAtTime(180, t);
      modGain.gain.setValueAtTime(220, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(gain);
      gain.connect(masterGain);
      mod.start(t);
      carrier.start(t);
      mod.stop(t + 0.26);
      carrier.stop(t + 0.26);
    }
  }

  /** Sub-bass goal explosion + filtered noise blast + chromatic synth ring. */
  function goal(isMatchPoint) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const dur = isMatchPoint ? 0.78 : 0.48;

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(98, t);
    sub.frequency.exponentialRampToValueAtTime(24, t + dur);
    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(isMatchPoint ? 0.44 : 0.34, t + 0.012);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    sub.connect(subGain);
    subGain.connect(masterGain);
    sub.start(t);
    sub.stop(t + dur + 0.02);

    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isMatchPoint ? 1900 : 1350, t);
      filter.frequency.exponentialRampToValueAtTime(75, t + dur);
      filter.Q.value = 2.0;

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.001, t);
      nGain.gain.linearRampToValueAtTime(isMatchPoint ? 0.34 : 0.25, t + 0.01);
      nGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(masterGain);
      noise.start(t);
      noise.stop(t + dur + 0.02);
    }

    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ring.type = 'sawtooth';
    ring.frequency.setValueAtTime(520, t + 0.02);
    ring.frequency.exponentialRampToValueAtTime(130, t + (isMatchPoint ? 0.56 : 0.32));
    ringGain.gain.setValueAtTime(0.13, t + 0.02);
    ringGain.gain.exponentialRampToValueAtTime(0.0001, t + (isMatchPoint ? 0.58 : 0.34));
    ring.connect(ringGain);
    ringGain.connect(masterGain);
    ring.start(t + 0.02);
    ring.stop(t + (isMatchPoint ? 0.6 : 0.35));

    if (isMatchPoint) {
      [784, 1046.5].forEach((freq) => {
        const sh = ctx.createOscillator();
        const shGain = ctx.createGain();
        sh.type = 'triangle';
        sh.frequency.setValueAtTime(freq, t + 0.04);
        sh.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.65);
        shGain.gain.setValueAtTime(0.11, t + 0.04);
        shGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.68);
        sh.connect(shGain);
        shGain.connect(masterGain);
        sh.start(t + 0.04);
        sh.stop(t + 0.7);
      });
    }
  }

  /** Countdown digits (3, 2, 1) and launch chord (0). */
  function countdown(stage) {
    if (!ready()) return;
    const t = ctx.currentTime;

    if (stage > 0) {
      const freq = stage === 3 ? 440 : stage === 2 ? 493.88 : 587.33;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.12);
    } else {
      [659.25, 987.77].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.13, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.19);
      });
    }
  }

  /** 80s polysynth detuned arpeggio on victory or defeat. */
  function fanfare(kind) {
    if (!ready()) return;
    const t = ctx.currentTime;

    const notes =
      kind === 'defeat'
        ? [
            { f: 392.0, delay: 0.0, dur: 0.18 },
            { f: 349.23, delay: 0.16, dur: 0.18 },
            { f: 311.13, delay: 0.32, dur: 0.22 },
            { f: 261.63, delay: 0.5, dur: 0.55 },
          ]
        : [
            { f: 261.63, delay: 0.0, dur: 0.12 },
            { f: 329.63, delay: 0.1, dur: 0.12 },
            { f: 392.0, delay: 0.2, dur: 0.12 },
            { f: 523.25, delay: 0.3, dur: 0.16 },
            { f: 659.25, delay: 0.44, dur: 0.16 },
            { f: 783.99, delay: 0.58, dur: 0.55 },
            { f: 523.25, delay: 0.58, dur: 0.55 },
          ];

    notes.forEach((n) => {
      const start = t + n.delay;
      [-4.5, 4.5].forEach((detuneCents) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, start);
        osc.detune.setValueAtTime(detuneCents, start);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(n.f * 4.5, start);
        filter.frequency.exponentialRampToValueAtTime(n.f * 1.6, start + n.dur);
        filter.Q.value = 2.0;

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.085, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + n.dur + 0.02);
      });
    });
  }

  /** Crisp UI blips ('ui' | 'mode'). */
  function blip(kind) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (kind === 'mode') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(780, t + 0.065);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.08);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, t);
      osc.frequency.exponentialRampToValueAtTime(960, t + 0.045);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const onFirstGesture = () => {
      unlock();
    };
    window.addEventListener('pointerdown', onFirstGesture, { passive: true });
    window.addEventListener('keydown', onFirstGesture, { passive: true });
  }

  CP.Audio = {
    STORAGE_KEY,
    unlock,
    isMuted,
    setMuted,
    toggleMute,
    paddleHit,
    wallHit,
    shieldHit,
    powerup,
    goal,
    countdown,
    fanfare,
    blip,
  };
})();
