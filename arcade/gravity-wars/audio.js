/**
 * Gravity Wars — Procedural Web Audio Synthesizer
 * Zero-dependency Web Audio API sound engine. Exposed as window.GW.Audio.
 *
 * Features:
 *   - Lazy AudioContext initialization on first user gesture (autoplay policy compliant)
 *   - Mute state persisted in localStorage under `arcade.gravity-wars.muted`
 *   - Power charging / aim adjustment pitch sweep
 *   - Projectile launch thump + weapon-specific laser pew
 *   - Dynamic gravitational proximity hum during projectile flight
 *   - Deep sub-bass explosion rumble + filtered noise blast on impact
 *   - Retro 80s synth victory/defeat fanfare and UI blips
 */
(function () {
  'use strict';

  const GW = (window.GW = window.GW || {});

  const STORAGE_KEY = 'arcade.gravity-wars.muted';

  let ctx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let muted = loadMuted();
  let lastSweepTime = 0;

  // Active flight hum nodes
  let humOsc1 = null;
  let humOsc2 = null;
  let humFilter = null;
  let humGain = null;

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

  /** Initialize or resume AudioContext on user interaction. */
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

  /** Pre-generate a reusable 1.5s pink-ish/white noise buffer for explosions & transients. */
  function createNoiseBuffer(audioCtx, duration) {
    const sampleRate = audioCtx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.1;
      b2 = 0.950 * b2 + white * 0.3;
      data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.45) * 0.7));
    }
    return buffer;
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
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.75, now, 0.015);
    }
    if (muted) stopFlightHum();
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

  /**
   * Subtle pitch sweep when adjusting angle or charging power.
   * Throttled so continuous slider/drag moves sound smooth rather than harsh.
   */
  function aimSweep(power, angle) {
    if (!ready()) return;
    const nowMs = performance.now();
    if (nowMs - lastSweepTime < 42) return;
    lastSweepTime = nowMs;

    const t = ctx.currentTime;
    const normPower = Math.max(0, Math.min(1, (power || 50) / 100));
    const angleMod = (((angle || 0) % 360) / 360) * 35;
    const baseFreq = 190 + normPower * 440 + angleMod;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 0.92, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.08, t + 0.045);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.055 + normPower * 0.04, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.055);
  }

  /**
   * Projectile launch: low punchy cannon thump + weapon-colored laser pew sweep.
   */
  function launch(weaponId, power) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const normPower = Math.max(0.2, Math.min(1, (power || 60) / 100));

    // 1. Launch kinetic sub-thump
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(145 + normPower * 45, t);
    thumpOsc.frequency.exponentialRampToValueAtTime(36, t + 0.18);

    thumpGain.gain.setValueAtTime(0.32 * normPower, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    thumpOsc.connect(thumpGain);
    thumpGain.connect(masterGain);
    thumpOsc.start(t);
    thumpOsc.stop(t + 0.2);

    // 2. Crisp noise puff transient
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(240, t + 0.12);
      filter.Q.value = 1.8;

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.14 * normPower, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(masterGain);
      noise.start(t);
      noise.stop(t + 0.14);
    }

    // 3. Synth laser pew tailored to weapon
    const pewOsc = ctx.createOscillator();
    const pewFilter = ctx.createBiquadFilter();
    const pewGain = ctx.createGain();

    let startFreq = 920;
    let endFreq = 170;
    let dur = 0.24;
    let wave = 'sawtooth';

    if (weaponId === 'torpedo') {
      startFreq = 520;
      endFreq = 85;
      dur = 0.34;
      wave = 'sawtooth';
    } else if (weaponId === 'cluster') {
      startFreq = 1120;
      endFreq = 260;
      dur = 0.22;
      wave = 'square';
    } else if (weaponId === 'bouncer') {
      startFreq = 1280;
      endFreq = 290;
      dur = 0.26;
      wave = 'triangle';
    }

    pewOsc.type = wave;
    pewOsc.frequency.setValueAtTime(startFreq, t);
    pewOsc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);

    pewFilter.type = 'lowpass';
    pewFilter.frequency.setValueAtTime(startFreq * 2.2, t);
    pewFilter.frequency.exponentialRampToValueAtTime(420, t + dur);
    pewFilter.Q.value = 4.5;

    pewGain.gain.setValueAtTime(0.001, t);
    pewGain.gain.linearRampToValueAtTime(0.18, t + 0.012);
    pewGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    pewOsc.connect(pewFilter);
    pewFilter.connect(pewGain);
    pewGain.connect(masterGain);
    pewOsc.start(t);
    pewOsc.stop(t + dur + 0.01);
  }

  /** Cluster splitter mid-air burst sound. */
  function split() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const freqs = [580, 760, 980];
    freqs.forEach((f, idx) => {
      const start = t + idx * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, start);
      osc.frequency.exponentialRampToValueAtTime(f * 0.45, start + 0.11);
      gain.gain.setValueAtTime(0.11, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(start);
      osc.stop(start + 0.13);
    });
  }

  /** Warp Bouncer elastic planet ricochet ping. */
  function bounce() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(1040, t + 0.07);
    osc.frequency.exponentialRampToValueAtTime(480, t + 0.18);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Start or maintain the continuous gravitational proximity hum while a projectile is in flight.
   */
  function startFlightHum() {
    if (!ready()) return;
    stopFlightHum();

    const t = ctx.currentTime;
    humOsc1 = ctx.createOscillator();
    humOsc2 = ctx.createOscillator();
    humFilter = ctx.createBiquadFilter();
    humGain = ctx.createGain();

    humOsc1.type = 'sine';
    humOsc2.type = 'sawtooth';
    humOsc1.frequency.setValueAtTime(58, t);
    humOsc2.frequency.setValueAtTime(116, t);

    humFilter.type = 'lowpass';
    humFilter.frequency.setValueAtTime(180, t);
    humFilter.Q.value = 3.2;

    humGain.gain.setValueAtTime(0.001, t);
    humGain.gain.setTargetAtTime(0.04, t, 0.05);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.35;

    humOsc1.connect(humFilter);
    humOsc2.connect(osc2Gain);
    osc2Gain.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(masterGain);

    humOsc1.start(t);
    humOsc2.start(t);
  }

  /**
   * Modulate the gravitational hum based on proximity to massive bodies.
   * @param {number} proximity - Normalized [0..1] gravitational pull / closeness to planet surfaces
   * @param {boolean} nearBlackHole - True when the strongest pull is a black hole singularity
   */
  function updateFlightHum(proximity, nearBlackHole) {
    if (muted || !ctx) return;
    if (!humOsc1 || !humOsc2 || !humFilter || !humGain) {
      startFlightHum();
      if (!humOsc1) return;
    }
    const p = Math.max(0, Math.min(1, proximity || 0));
    const t = ctx.currentTime;
    const base = nearBlackHole ? 74 : 56;
    const span = nearBlackHole ? 210 : 135;
    const f1 = base + p * p * span;
    const f2 = f1 * (nearBlackHole ? 1.5 : 2.01);

    humOsc1.frequency.setTargetAtTime(f1, t, 0.035);
    humOsc2.frequency.setTargetAtTime(f2, t, 0.035);
    humFilter.frequency.setTargetAtTime(160 + p * 950, t, 0.04);
    humGain.gain.setTargetAtTime(0.03 + p * 0.16, t, 0.04);
  }

  /** Silence and clean up the flight hum oscillators. */
  function stopFlightHum() {
    if (!ctx || !humGain) {
      humOsc1 = humOsc2 = humFilter = humGain = null;
      return;
    }
    const t = ctx.currentTime;
    const g = humGain;
    const o1 = humOsc1;
    const o2 = humOsc2;
    humOsc1 = humOsc2 = humFilter = humGain = null;
    try {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.025);
      o1.stop(t + 0.09);
      o2.stop(t + 0.09);
    } catch (e) {
      // Ignore already-stopped oscillator errors
    }
  }

  /**
   * Deep sub-bass explosion rumble + filtered noise roar on impact.
   * @param {number} blastRadius - Weapon blast radius (~20..75)
   * @param {boolean} majorHit - True when a ship or target drone is damaged/destroyed
   */
  function explosion(blastRadius, majorHit) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const scale = Math.max(0.45, Math.min(1.35, (blastRadius || 40) / 45));
    const dur = (majorHit ? 0.78 : 0.52) * scale;

    // 1. Deep sub-bass sine rumble (95Hz -> 22Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(majorHit ? 105 : 88, t);
    subOsc.frequency.exponentialRampToValueAtTime(22, t + dur);

    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(Math.min(0.5, 0.36 * scale), t + 0.012);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(t);
    subOsc.stop(t + dur + 0.02);

    // 2. Gritty low-mid triangle crunch
    const crunchOsc = ctx.createOscillator();
    const crunchGain = ctx.createGain();
    crunchOsc.type = 'triangle';
    crunchOsc.frequency.setValueAtTime(160, t);
    crunchOsc.frequency.exponentialRampToValueAtTime(32, t + dur * 0.75);
    crunchGain.gain.setValueAtTime(0.22 * scale, t);
    crunchGain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.78);
    crunchOsc.connect(crunchGain);
    crunchGain.connect(masterGain);
    crunchOsc.start(t);
    crunchOsc.stop(t + dur * 0.8);

    // 3. Filtered noise blast wave
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(majorHit ? 1650 : 1150, t);
      filter.frequency.exponentialRampToValueAtTime(65, t + dur);
      filter.Q.value = 2.2;

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.001, t);
      nGain.gain.linearRampToValueAtTime(Math.min(0.42, 0.28 * scale), t + 0.01);
      nGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(masterGain);
      noise.start(t);
      noise.stop(t + dur + 0.02);
    }

    // 4. Secondary synth ring if a ship/drone was hit
    if (majorHit) {
      const ringOsc = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ringOsc.type = 'sawtooth';
      ringOsc.frequency.setValueAtTime(520, t + 0.03);
      ringOsc.frequency.exponentialRampToValueAtTime(110, t + 0.42);
      ringGain.gain.setValueAtTime(0.14, t + 0.03);
      ringGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
      ringOsc.connect(ringGain);
      ringGain.connect(masterGain);
      ringOsc.start(t + 0.03);
      ringOsc.stop(t + 0.45);
    }
  }

  /**
   * Retro 80s synthwave fanfare on victory, round win, or defeat.
   * @param {'victory'|'round'|'defeat'} kind
   */
  function fanfare(kind) {
    if (!ready()) return;
    const t = ctx.currentTime;

    let notes;
    if (kind === 'defeat') {
      // Dramatic descending minor synth progression
      notes = [
        { f: 392.00, delay: 0.00, dur: 0.18 }, // G4
        { f: 349.23, delay: 0.16, dur: 0.18 }, // F4
        { f: 311.13, delay: 0.32, dur: 0.22 }, // Eb4
        { f: 261.63, delay: 0.50, dur: 0.55 }, // C4
      ];
    } else if (kind === 'round') {
      // Compact celebratory triad
      notes = [
        { f: 392.00, delay: 0.00, dur: 0.12 }, // G4
        { f: 523.25, delay: 0.10, dur: 0.14 }, // C5
        { f: 659.25, delay: 0.22, dur: 0.36 }, // E5
      ];
    } else {
      // Full 80s arcade synth victory fanfare (C major 9 arpeggio + brassy chord)
      notes = [
        { f: 261.63, delay: 0.00, dur: 0.12 }, // C4
        { f: 329.63, delay: 0.10, dur: 0.12 }, // E4
        { f: 392.00, delay: 0.20, dur: 0.12 }, // G4
        { f: 523.25, delay: 0.30, dur: 0.16 }, // C5
        { f: 659.25, delay: 0.44, dur: 0.16 }, // E5
        { f: 783.99, delay: 0.58, dur: 0.55 }, // G5
        { f: 523.25, delay: 0.58, dur: 0.55 }, // C5 harmony
      ];
    }

    notes.forEach((n) => {
      const start = t + n.delay;
      // Dual detuned sawtooth oscillators for authentic 80s polysynth warmth
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

  /**
   * Short retro UI synth blips.
   * @param {'ui'|'weapon'|'round'|'lock'} kind
   */
  function blip(kind) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (kind === 'weapon') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(780, t + 0.065);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.075);
    } else if (kind === 'lock') {
      osc.type = 'Square' in window ? 'square' : 'square';
      osc.frequency.setValueAtTime(660, t);
      osc.frequency.setValueAtTime(880, t + 0.045);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.12);
    } else if (kind === 'round') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, t);
      osc.frequency.exponentialRampToValueAtTime(660, t + 0.14);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.16);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, t);
      osc.frequency.exponentialRampToValueAtTime(960, t + 0.045);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.055);
    }
  }

  // Bind one-time global interaction listeners to unlock AudioContext per browser autoplay policy
  if (typeof window !== 'undefined') {
    const onFirstGesture = () => {
      unlock();
    };
    window.addEventListener('pointerdown', onFirstGesture, { passive: true });
    window.addEventListener('keydown', onFirstGesture, { passive: true });
  }

  GW.Audio = {
    STORAGE_KEY,
    unlock,
    isMuted,
    setMuted,
    toggleMute,
    aimSweep,
    launch,
    split,
    bounce,
    startFlightHum,
    updateFlightHum,
    stopFlightHum,
    explosion,
    fanfare,
    blip,
  };
})();
