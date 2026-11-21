// NIGHTFALL world: tile maps, line of sight, guards, detection and level flow.
// Tiles: '#' wall, 'c' crate (cover, blocks sight), '.' floor, 'S' start, 'E' exit, 'G' guard path anchor.
import { COLS, ROWS, TILE, PLAYER_SPEED, SNEAK_SPEED, PLAYER_RADIUS, GUARD_SPEED, GUARD_ALERT_SPEED, GUARD_RADIUS, VISION_RANGE, VISION_FOV, CATCH_RANGE, DETECT_RATE, DECAY_RATE, CAUGHT_AT, NOISE_WALK } from './config.js';
import { mulberry32 } from './random.js';

export const LEVELS = [
  {
    name: 'Storehouse',
    map: [
      '################################',
      '#S.............#...............#',
      '#..............#...####....c...#',
      '#...####.......#...#...........#',
      '#...#..c...G...#...#...G...####E',
      '#...#......|...#...#...|.......#',
      '#...#......|...#...#...|.......#',
      '#..........|.......#...|...c...#',
      '#....c.....|.......#...........#',
      '#..........|...........#####...#',
      '#......#####...........#...#...#',
      '#......#...............#...#...#',
      '#......#...G...####....#...#...#',
      '#......#...|...#..#........c...#',
      '#..c...#...|...#..#.............',
      '#......#...|...#..#####....c...#',
      '#..............................#',
      '################################',
    ],
  },
  {
    name: 'Courtyard',
    map: [
      '################################',
      '#....c.....#........#....c.....#',
      '#..........#...G....#..........#',
      '#...####...#...|....#...####...#',
      '#...#..#...G...|....#...#..#...#',
      '#...#..#...#...|....#...#..#...#',
      '#......#.......|...........#...#',
      '#S.....#...c...|......G....#...E',
      '#......#.......|...........#...#',
      '#......#####...|....#####..#...#',
      '#..........#...|....#..........#',
      '#....G.....#...|....#....G.....#',
      '#....|.....#...c....#....|.....#',
      '#....|..................c|.....#',
      '#....|.....#........#....|.....#',
      '#..........#........#..........#',
      '#....c.....#........#....c.....#',
      '################################',
    ],
  },
  {
    name: 'Vault Wing',
    map: [
      '################################',
      '#S...#....c....#....c....#.....#',
      '#....#.........#.........#..G..#',
      '#....#..####...#...####..#..|..#',
      '#........#............#.....|..#',
      '#..G.....#..c......c..#.....|..#',
      '#..|.....#............#.....|..#',
      '#..|..................#..####..#',
      '#..|.....####...####..#........#',
      '#........#........#...#...c....#',
      '#...c....#..c..c..#............#',
      '#........#........#...G....####E',
      '#..####..#........#...|........#',
      '#........#...##...#...|..c.....#',
      '#...G....#...##...#...|........#',
      '#...|....#........#............#',
      '#....c...#........#....c.......#',
      '################################',
    ],
  },
];

export function tileAt(map, col, row) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return '#';
  return (map[row][col] || '.');
}

export function blocksSight(t) { return t === '#' || t === 'c'; }
export function blocksMove(t) { return t === '#' || t === 'c'; }

export function solidAtPx(state, x, y) {
  return blocksMove(tileAt(state.map, Math.floor(x / TILE), Math.floor(y / TILE)));
}

export function segHitsSolid(state, x0, y0, x1, y1) {
  // Step along the segment at 8px intervals; good enough for vision cones.
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
  for (let i = 1; i <= steps; i++) {
    const x = x0 + (dx * i) / steps, y = y0 + (dy * i) / steps;
    if (solidAtPx(state, x, y)) return true;
  }
  return false;
}

export function guardSees(state, guard, px, py) {
  const dx = px - guard.x, dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return false;
  let da = Math.atan2(dy, dx) - guard.dir;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  if (Math.abs(da) > VISION_FOV / 2) return false;
  return !segHitsSolid(state, guard.x, guard.y, px, py);
}

export function loadLevel(index, seed = 1) {
  const rng = mulberry32(seed * 7919 + index * 104729);
  const level = LEVELS[index];
  const map = level.map.map((r) => r.padEnd(COLS, '.').slice(0, COLS));
  const state = {
    levelIndex: index,
    levelName: level.name,
    map,
    rng,
    player: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    guards: [],
    suspicion: 0,
    alertPings: [],
    status: 'playing', // playing | caught | won
    banner: '',
    bannerT: 0,
    steps: 0,
  };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = map[r][c];
      if (t === 'S') { state.player.x = c * TILE + TILE / 2; state.player.y = r * TILE + TILE / 2; }
      if (t === 'E') { state.exit.x = c * TILE + TILE / 2; state.exit.y = r * TILE + TILE / 2; }
      if (t === 'G') state.guards.push(makeGuard(c, r, state));
    }
  }
  return state;
}

function makeGuard(c, r, state) {
  return {
    x: c * TILE + TILE / 2, y: r * TILE + TILE / 2,
    dir: (state.rng() * Math.PI * 2),
    spin: state.rng() < 0.5 ? -1 : 1,
    turnT: 60 + Math.floor(state.rng() * 120),
    alert: 0, // 0 calm, 1 hunting last seen point
    lastSeen: null,
    homeX: c * TILE + TILE / 2, homeY: r * TILE + TILE / 2,
  };
}

function moveEntity(state, ent, dx, dy, radius) {
  // Axis-separated collision so sliding along walls feels right.
  const nx = ent.x + dx;
  if (!circleBlocked(state, nx, ent.y, radius)) ent.x = nx;
  const ny = ent.y + dy;
  if (!circleBlocked(state, ent.x, ny, radius)) ent.y = ny;
}

export function circleBlocked(state, x, y, radius) {
  for (const [ox, oy] of [[radius, 0], [-radius, 0], [0, radius], [0, -radius], [radius * 0.7, radius * 0.7], [-radius * 0.7, radius * 0.7], [radius * 0.7, -radius * 0.7], [-radius * 0.7, -radius * 0.7]]) {
    if (solidAtPx(state, x + ox, y + oy)) return true;
  }
  return false;
}

export function alertGuard(state, guard, x, y) {
  guard.alert = 1;
  guard.lastSeen = { x, y };
  state.alertPings.push({ x: guard.x, y: guard.y, t: 0 });
}

export function stepWorld(state, move, sneak, onNoise) {
  state.steps++;
  if (state.status !== 'playing') {
    state.bannerT--;
    return;
  }
  // Player
  const speed = sneak ? SNEAK_SPEED : PLAYER_SPEED;
  moveEntity(state, state.player, move.x * speed, move.y * speed, PLAYER_RADIUS);

  // Guards: patrol by slowly sweeping their facing; hunt toward lastSeen when alerted.
  for (const g of state.guards) {
    if (guardSees(state, g, state.player.x, state.player.y)) {
      alertGuard(state, g, state.player.x, state.player.y);
    }
    if (g.alert > 0 && g.lastSeen) {
      const dx = g.lastSeen.x - g.x, dy = g.lastSeen.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = GUARD_ALERT_SPEED;
      const nx = g.x + (dx / d) * sp, ny = g.y + (dy / d) * sp;
      if (!circleBlocked(state, nx, ny, GUARD_RADIUS)) { g.x = nx; g.y = ny; }
      g.dir = Math.atan2(dy, dx);
      if (d < 8) { g.alert = 0; g.lastSeen = null; }
    } else {
      // Patrol: slow spin with occasional reversal, drifting around home tile.
      g.turnT--;
      if (g.turnT <= 0) { g.spin = -g.spin; g.turnT = 90 + Math.floor(state.rng() * 150); }
      g.dir += g.spin * 0.006;
      const wob = Math.sin(state.steps / 90) * 10;
      const nx = g.homeX + wob * g.spin, ny = g.homeY;
      if (!circleBlocked(state, nx, g.y, GUARD_RADIUS)) g.x += (nx - g.x) * 0.02;
      if (!circleBlocked(state, g.x, ny, GUARD_RADIUS)) g.y += (ny - g.y) * 0.02;
    }
    // Capture check
    if (Math.hypot(g.x - state.player.x, g.y - state.player.y) < CATCH_RANGE + GUARD_RADIUS) {
      state.status = 'caught';
      state.banner = 'SPOTTED — R to retry';
      return;
    }
  }

  // Detection meter: does any guard see the player?
  let seen = false;
  for (const g of state.guards) if (guardSees(state, g, state.player.x, state.player.y)) seen = true;
  if (seen) state.suspicion = Math.min(CAUGHT_AT, state.suspicion + DETECT_RATE / 60);
  else state.suspicion = Math.max(0, state.suspicion - DECAY_RATE / 60);
  if (state.suspicion >= CAUGHT_AT) { state.status = 'caught'; state.banner = 'CAUGHT IN THE LIGHT'; return; }

  // Noise: running near a guard makes them investigate.
  if (!sneak && (move.x !== 0 || move.y !== 0)) onNoise?.(NOISE_WALK);

  // Exit
  if (Math.hypot(state.exit.x - state.player.x, state.exit.y - state.player.y) < TILE) {
    state.status = 'won';
    state.banner = state.levelIndex === LEVELS.length - 1 ? 'ALL VAULTS CLEARED' : 'SECTOR CLEAR';
    return;
  }
  if (state.bannerT > 0) state.bannerT--;
}