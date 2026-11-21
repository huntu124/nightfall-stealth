// NIGHTFALL renderer: canvas drawing of map, vision cones, entities and HUD.
import { TILE, COLS, ROWS, WIDTH, HEIGHT, VISION_RANGE, VISION_FOV } from './config.js';
import { tileAt, guardSees } from './world.js';

const COLORS = {
  wall: '#2b3244', wallTop: '#3a4358', floor: '#12161f', crate: '#5a4326',
  crateTop: '#7a5a33', exit: '#1c5c3a', player: '#e8d87a', guard: '#c04b4b',
  coneLit: 'rgba(255,120,80,0.16)', cone: 'rgba(120,160,255,0.10)',
  hud: '#cfd6e4', alert: '#ff5a5a',
};

export function render(ctx, state) {
  // Floor
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Vision cones drawn under entities
  for (const g of state.guards) drawCone(ctx, state, g);

  // Tiles
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = tileAt(state.map, c, r);
      const x = c * TILE, y = r * TILE;
      if (t === '#') {
        ctx.fillStyle = COLORS.wall; ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop; ctx.fillRect(x, y, TILE, 4);
      } else if (t === 'c') {
        ctx.fillStyle = COLORS.crate; ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = COLORS.crateTop; ctx.fillRect(x + 3, y + 3, TILE - 6, 5);
      } else if (t === 'E') {
        ctx.fillStyle = COLORS.exit; ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#57e389';
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
        ctx.fillText('EXIT', x + TILE / 2, y + TILE / 2 + 5);
      }
      // Subtle grid on floor
      if (t === '.') {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(x, y, TILE - 1, TILE - 1);
      }
    }
  }

  // Exit pulse
  const pulse = 0.5 + 0.5 * Math.sin(state.steps / 20);
  ctx.strokeStyle = `rgba(87,227,137,${0.3 + 0.3 * pulse})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(state.exit.x - TILE / 2, state.exit.y - TILE / 2, TILE, TILE);

  // Alert pings
  for (const p of state.alertPings) {
    ctx.strokeStyle = `rgba(255,90,90,${Math.max(0, 1 - p.t / 40)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6 + p.t, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Guards
  for (const g of state.guards) {
    ctx.fillStyle = g.alert ? COLORS.alert : COLORS.guard;
    ctx.beginPath(); ctx.arc(g.x, g.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1d26'; ctx.lineWidth = 2; ctx.stroke();
    // Facing tick
    ctx.strokeStyle = '#ffd7d7'; ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.dir) * 16, g.y + Math.sin(g.dir) * 16);
    ctx.stroke();
  }

  // Player
  const p = state.player;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a1d26'; ctx.lineWidth = 2; ctx.stroke();

  // HUD
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.hud;
  ctx.font = '14px monospace';
  ctx.fillText(`NIGHTFALL — ${state.levelName}  (level ${state.levelIndex + 1}/3)`, 12, 22);
  ctx.fillText('WASD move · SHIFT sneak · R restart', 12, 40);
  // Detection meter
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(WIDTH - 240, 14, 220, 12);
  const hot = state.suspicion > 0.55;
  ctx.fillStyle = hot ? COLORS.alert : '#e8b84a';
  ctx.fillRect(WIDTH - 240, 14, 220 * state.suspicion, 12);
  ctx.strokeStyle = '#0a0d14'; ctx.strokeRect(WIDTH - 240, 14, 220, 12);
  ctx.fillStyle = hot ? COLORS.alert : COLORS.hud;
  ctx.fillText(hot ? 'DETECTION!' : 'suspicion', WIDTH - 240, 44);

  // Banner
  if (state.status !== 'playing') {
    ctx.fillStyle = 'rgba(6,8,12,0.72)';
    ctx.fillRect(0, HEIGHT / 2 - 60, WIDTH, 120);
    ctx.textAlign = 'center';
    ctx.fillStyle = state.status === 'won' ? '#57e389' : COLORS.alert;
    ctx.font = 'bold 34px monospace';
    ctx.fillText(state.banner || (state.status === 'won' ? 'CLEAR' : 'CAUGHT'), WIDTH / 2, HEIGHT / 2 + 4);
    ctx.fillStyle = COLORS.hud;
    ctx.font = '16px monospace';
    ctx.fillText(state.status === 'won' ? 'press N for next sector' : 'press R to try again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

function drawCone(ctx, state, g) {
  const sees = guardSees(state, g, state.player.x, state.player.y);
  ctx.fillStyle = (sees || g.alert) ? COLORS.coneLit : COLORS.cone;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.arc(g.x, g.y, VISION_RANGE, g.dir - VISION_FOV / 2, g.dir + VISION_FOV / 2);
  ctx.closePath();
  ctx.fill();
}
