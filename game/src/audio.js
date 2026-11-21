// NIGHTFALL audio: tiny WebAudio synth, no audio files needed.
let actx = null;

function ctx() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  return actx;
}

function blip(freq, dur, type = 'square', gain = 0.05) {
  try {
    const a = ctx();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  } catch { /* audio unavailable — stay silent */ }
}

export const sfx = {
  step: () => blip(160 + Math.random() * 30, 0.05, 'triangle', 0.02),
  alert: () => { blip(660, 0.12); setTimeout(() => blip(520, 0.16), 110); },
  caught: () => { blip(220, 0.3, 'sawtooth', 0.06); setTimeout(() => blip(160, 0.4, 'sawtooth', 0.06), 200); },
  clear: () => { blip(523, 0.1); setTimeout(() => blip(659, 0.1), 100); setTimeout(() => blip(784, 0.18), 200); },
};
