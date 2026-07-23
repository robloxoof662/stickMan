import {
  ARENA_SIZE,
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
  ATTACK_RANGE,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  RESPAWN_MS,
  type PlayerInput,
  type PlayerSnapshot,
} from "../shared/protocol.ts";

type PlayerState = PlayerSnapshot & {
  name: string;
  input: PlayerInput;
  lastAttackAt: number;
  respawnAt: number;
};

const EMPTY_INPUT: PlayerInput = {
  moveX: 0,
  moveZ: 0,
  facing: 0,
  attack: false,
  sequence: 0,
};

export class Game {
  readonly players = new Map<string, PlayerState>();

  addPlayer(id: string, name: string): void {
    const spawn = this.spawnPoint();
    this.players.set(id, {
      id,
      name: name.slice(0, 16) || "Player",
      x: spawn.x,
      z: spawn.z,
      facing: 0,
      health: 100,
      score: 0,
      lastInputSequence: 0,
      attacking: false,
      input: { ...EMPTY_INPUT },
      lastAttackAt: -ATTACK_COOLDOWN_MS,
      respawnAt: 0,
    });
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  setInput(id: string, input: PlayerInput): void {
    const player = this.players.get(id);
    if (!player || input.sequence <= player.lastInputSequence) return;

    player.input = {
      moveX: clamp(input.moveX, -1, 1),
      moveZ: clamp(input.moveZ, -1, 1),
      facing: Number.isFinite(input.facing) ? input.facing : 0,
      attack: Boolean(input.attack),
      sequence: input.sequence,
    };
    player.lastInputSequence = input.sequence;
  }

  update(deltaSeconds: number, now: number): void {
    for (const player of this.players.values()) {
      if (player.health <= 0) {
        if (now >= player.respawnAt) this.respawn(player);
        continue;
      }

      const length = Math.hypot(player.input.moveX, player.input.moveZ);
      const scale = length > 1 ? 1 / length : 1;
      player.x = clamp(
        player.x + player.input.moveX * scale * PLAYER_SPEED * deltaSeconds,
        -ARENA_SIZE / 2 + PLAYER_RADIUS,
        ARENA_SIZE / 2 - PLAYER_RADIUS,
      );
      player.z = clamp(
        player.z + player.input.moveZ * scale * PLAYER_SPEED * deltaSeconds,
        -ARENA_SIZE / 2 + PLAYER_RADIUS,
        ARENA_SIZE / 2 - PLAYER_RADIUS,
      );
      player.facing = player.input.facing;
      player.attacking = false;

      if (player.input.attack && now - player.lastAttackAt >= ATTACK_COOLDOWN_MS) {
        player.lastAttackAt = now;
        player.attacking = true;
        this.attack(player, now);
      }
    }
  }

  snapshot(): PlayerSnapshot[] {
    return [...this.players.values()].map(
      ({ id, x, z, facing, health, score, lastInputSequence, attacking }) => ({
        id,
        x,
        z,
        facing,
        health,
        score,
        lastInputSequence,
        attacking,
      }),
    );
  }

  private attack(attacker: PlayerState, now: number): void {
    let target: PlayerState | undefined;
    let nearest = Number.POSITIVE_INFINITY;

    for (const candidate of this.players.values()) {
      if (candidate.id === attacker.id || candidate.health <= 0) continue;
      const dx = candidate.x - attacker.x;
      const dz = candidate.z - attacker.z;
      const distance = Math.hypot(dx, dz);
      const angleToTarget = Math.atan2(dx, dz);
      const angleDifference = Math.abs(normalizeAngle(angleToTarget - attacker.facing));

      if (distance <= ATTACK_RANGE && angleDifference <= Math.PI * 0.42 && distance < nearest) {
        nearest = distance;
        target = candidate;
      }
    }

    if (!target) return;
    target.health = Math.max(0, target.health - ATTACK_DAMAGE);
    if (target.health === 0) {
      attacker.score += 1;
      target.respawnAt = now + RESPAWN_MS;
    }
  }

  private respawn(player: PlayerState): void {
    const spawn = this.spawnPoint();
    player.x = spawn.x;
    player.z = spawn.z;
    player.health = 100;
    player.respawnAt = 0;
    player.input = { ...EMPTY_INPUT, sequence: player.lastInputSequence };
  }

  private spawnPoint(): { x: number; z: number } {
    const span = ARENA_SIZE * 0.7;
    return {
      x: (Math.random() - 0.5) * span,
      z: (Math.random() - 0.5) * span,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
