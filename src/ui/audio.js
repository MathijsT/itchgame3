// Tiny procedural sound effects with WebAudio (no asset files needed).
import { ctx } from './ctx.js';

let ac = null;
let master = null;

function audio() {
  if (!ctx.settings.sound) return null;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.18;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq, start, dur, type = 'square', vol = 0.5, slide = 0) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  click: () => tone(880, 0, 0.04, 'square', 0.15),
  start: () => { tone(523, 0, 0.08); tone(659, 0.08, 0.08); tone(784, 0.16, 0.12); },
  ready: () => { tone(659, 0, 0.1, 'triangle', 0.6); tone(988, 0.1, 0.2, 'triangle', 0.6); },
  launch: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.18, 'square', 0.35)); },
  research: () => { tone(1200, 0, 0.06, 'sine', 0.5); tone(1600, 0.06, 0.12, 'sine', 0.5); },
  cash: () => { tone(1319, 0, 0.05, 'square', 0.25); tone(1760, 0.05, 0.12, 'square', 0.25); },
  upgrade: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.14, 'triangle', 0.5)); },
  event: () => { tone(440, 0, 0.12, 'sawtooth', 0.25); tone(440, 0.16, 0.12, 'sawtooth', 0.25); },
  bad: () => { tone(300, 0, 0.25, 'sawtooth', 0.3, -150); },
  achievement: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle', 0.5)); },
  review: (score = 7) => {
    const f = 300 + score * 70;
    tone(f, 0, 0.12, score >= 7 ? 'triangle' : 'square', 0.4, score >= 7 ? 200 : -80);
  },
};

export function sfx(name, arg) {
  try {
    const fn = SOUNDS[name];
    if (fn) fn(arg);
  } catch { /* audio is optional */ }
}
