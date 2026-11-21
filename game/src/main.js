// NIGHTFALL main loop: input, fixed-step simulation, rendering, level flow.
import { TICK_MS } from './config.js';
import { initInput, axis, isDown, wasPressed, endFrame } from './input.js';
import { loadLevel, stepWorld, alertGuard, LEVELS } from './world.js';
import { render } from './render.js';
import { sfx } from './audio.js';
import { makeShotDriver } from './shots.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
canvas.width = canvas.clientWidth || 1280;
canvas.height = canvas.clientHeight || 720;

const params = new URLSearchParams(location.search);
const shot = makeShotDriver(params);
let state = loadLevel(Number(params.get('level') || 0), shot ? Number(params.get('seed') || 1) : (Date.now() % 100000));

initInput();
let move = { x: 0, y: 0 };
let sneak = { on: false };
let acc = 0, last = performance.now();

function onNoise(radius) {
  for (const g of state.guards) {
    if (Math.hypot(g.x - state.player.x, g.y - state.player.y) < radius) {
      alertGuard(state, g, state.player.x, state.player.y);
    }
  }
  if (Math.random() < 0.08) sfx.step();
}

function tick() {
  if (shot) {
    move = { x: 0, y: 0 };
    sneak = { on: false };
    shot.frame(move, sneak);
  } else if (state.status === 'playing') {
    move = axis();
    sneak = { on: isDown('ShiftLeft') || isDown('ShiftRight') };
  } else {
    move = { x: 0, y: 0 };
    if (wasPressed('KeyR') && state.status === 'caught') { sfx.clear(); state = loadLevel(state.levelIndex); }
    if (wasPressed('KeyN') && state.status === 'won') {
      const next = state.levelIndex + 1;
      state = next < LEVELS.length ? loadLevel(next) : state;
    }
  }
  const seenBefore = state.suspicion;
  stepWorld(state, move, sneak.on, onNoise);
  if (state.suspicion > seenBefore + 0.02 && state.status === 'playing') sfx.alert();
  if (state.status === 'caught') sfx.caught();
  if (state.status === 'won' && state.banner && state.bannerT === 0) { state.bannerT = 60; sfx.clear(); }
  status.textContent = state.status === 'playing'
    ? `Level ${state.levelIndex + 1}: ${state.levelName}. suspicion ${(state.suspicion * 100) | 0}%`
    : state.banner || state.status;
  endFrame();
}

function frame(now) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= TICK_MS) { tick(); acc -= TICK_MS; }
  render(canvas.getContext('2d'), state);
  if (shot && shot.done) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
