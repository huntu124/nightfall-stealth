// Keyboard input: WASD/arrows to move, Shift to sneak, R to restart a level.
const down = new Set();
const pressed = new Set();

export function initInput(target = window) {
  target.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
  });
  target.addEventListener('keyup', (e) => down.delete(e.code));
}

export function axis() {
  let x = 0, y = 0;
  if (down.has('KeyA') || down.has('ArrowLeft')) x -= 1;
  if (down.has('KeyD') || down.has('ArrowRight')) x += 1;
  if (down.has('KeyW') || down.has('ArrowUp')) y -= 1;
  if (down.has('KeyS') || down.has('ArrowDown')) y += 1;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

export function isDown(code) { return down.has(code); }
export function wasPressed(code) { return pressed.has(code); }
export function endFrame() { pressed.clear(); }
