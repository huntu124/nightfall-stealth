// NIGHTFALL configuration: tile size, canvas size, timing and tuning knobs.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const WIDTH = COLS * TILE;   // 1280
export const HEIGHT = ROWS * TILE;  // 720

export const PLAYER_SPEED = 3.4;      // px per tick, walking
export const SNEAK_SPEED = 1.6;       // px per tick, sneaking (Shift)
export const PLAYER_RADIUS = 11;
export const GUARD_SPEED = 1.3;
export const GUARD_ALERT_SPEED = 2.2;
export const GUARD_RADIUS = 12;

export const VISION_RANGE = 300;      // px, guard sight distance
export const VISION_FOV = (70 * Math.PI) / 180; // degrees of the vision cone
export const CATCH_RANGE = 20;        // px, guard touching the player

export const DETECT_RATE = 0.9;       // suspicion gained per tick fully lit
export const DECAY_RATE = 0.25;       // suspicion lost per tick hidden
export const CAUGHT_AT = 1.0;         // suspicion that triggers capture

export const NOISE_WALK = 130;        // px radius: running footsteps alert guards
export const NOISE_SNEAK = 30;

export const TICK_MS = 1000 / 60;
export const MAX_LEVELS = 3;
