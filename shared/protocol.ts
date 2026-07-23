export const ARENA_SIZE = 18;
export const PLAYER_SPEED = 6;
export const PLAYER_RADIUS = 0.55;
export const ATTACK_RANGE = 2.2;
export const ATTACK_DAMAGE = 20;
export const ATTACK_COOLDOWN_MS = 650;
export const RESPAWN_MS = 1800;

export type PlayerInput = {
  moveX: number;
  moveZ: number;
  facing: number;
  attack: boolean;
  sequence: number;
};

export type PlayerSnapshot = {
  id: string;
  x: number;
  z: number;
  facing: number;
  health: number;
  score: number;
  lastInputSequence: number;
  attacking: boolean;
};

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "input"; input: PlayerInput };

export type ServerMessage =
  | { type: "welcome"; id: string }
  | { type: "snapshot"; serverTime: number; players: PlayerSnapshot[] }
  | { type: "notice"; text: string };
