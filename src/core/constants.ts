/**
 * Game constants: physics, scoring, timers, layout.
 * Pure values — no Phaser dependency.
 */

// --- Conversion ---
export const PIXELS_PER_METER = 18;

// --- Layout ---
export const PENGUIN_Y = 0.25; // vertical screen ratio
export const HITBOX_SHRINK = 0.7; // collision box vs display size

// --- Health ---
export const MAX_HEALTH = 100;
export const ROCK_DAMAGE_BASE = 25;
export const ROCK_DAMAGE_SPEED = 0.05; // extra damage per speed unit (max ~55 at 600 speed)
export const ROCK_KNOCKBACK = 80; // lateral pixels pushed sideways
export const TREE_DAMAGE_MIN = 5;
export const TREE_DAMAGE_MAX = 20;
export const CRASH_LANDING_DAMAGE = 10;
export const REGEN_DELAY = 5.0;
export const REGEN_RATE = 2;
export const FISH_HEAL = 5;
export const DAMAGE_COOLDOWN = 0.5;

// --- Physics ---
export const GRAVITY = 120;
export const FRICTION_NORMAL = 0.15;
export const FRICTION_ICE = 0.03;
export const FRICTION_SNOWDRIFT_EXTRA = 0.25;
export const WING_DRAG_TUCK = 0;
export const WING_DRAG_NEUTRAL = 10;
export const WING_DRAG_SPREAD = 60;
export const SCORE_RATE = 0.02; // score earned per pixel traveled

// --- Ice steering multipliers ---
export const ICE_TURN_ACCEL = 0.08;
export const ICE_TURN_SPEED = 0.15;
export const ICE_DRAG = 0.2;
export const ICE_CENTER = 0.2;
export const COUNTER_STEER_BOOST = 2.0;

// --- Airborne ---
export const AIR_ARC_HEIGHT = 80;
export const AIR_BASE_DURATION = 1.2;
export const AIR_SPEED_FACTOR = 0.002; // extra air time per speed unit above 200
export const AIR_ICY_MULTIPLIER = 1.5;
export const AIR_STORM_MULTIPLIER = 1.3;
export const AIR_DRIFT_FACTOR = 0.5; // passive lateral drift while airborne
export const MOGUL_AIR_DURATION = 0.5;
export const TRICK_ROTATION_TIME = 0.8; // seconds for full 2π rotation
export const WIND_AIRBORNE_MULTIPLIER = 5;

// --- Landing ---
export const LANDING_CLEAN_THRESHOLD = 0.5; // rotation diff for clean
export const LANDING_SLOPPY_THRESHOLD = 1.2; // rotation diff for sloppy (above = crash)

// --- Scoring ---
export const FISH_POINTS = 20;
export const ICE_POINTS = 25;
export const FLYOVER_POINTS = 50;
export const MULTI_TRICK_BONUS = 50;
export const SPIN_HALF_POINTS = 100;
export const ICE_SPEED_BOOST = 0.1; // 10% speed boost on ice contact
export const ICE_CAP_MULTIPLIER = 1.2; // allow 20% over speed cap while icy

// --- Collision ---
export const ROCK_DECEL = 200;
export const TREE_GRAZE_DECEL = 30;
export const TREE_CENTER_DECEL = 270; // added to graze for dead-center hit (total 300)
export const TREE_HIT_WIDTH = 0.35;

// --- Status effect durations ---
export const SLIPPERY_DURATION = 2.5;
export const SNOWDRIFT_DURATION = 1.2;
export const CRASH_LOCK_MS = 500;
export const GAME_OVER_DELAY_MS = 600;
