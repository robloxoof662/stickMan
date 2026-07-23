import assert from "node:assert/strict";
import test from "node:test";
import { ATTACK_DAMAGE } from "../shared/protocol.ts";
import { Game } from "./game.ts";

test("players are constrained to the arena", () => {
  const game = new Game();
  game.addPlayer("one", "One");
  game.setInput("one", { moveX: 1, moveZ: 1, facing: 0, attack: false, sequence: 1 });
  game.update(10, 1000);
  const player = game.snapshot()[0];
  assert.ok(player.x < 9);
  assert.ok(player.z < 9);
});

test("an attack damages a nearby player in front", () => {
  const game = new Game();
  game.addPlayer("one", "One");
  game.addPlayer("two", "Two");
  const one = game.players.get("one");
  const two = game.players.get("two");
  assert.ok(one && two);
  one.x = 0;
  one.z = 0;
  two.x = 0;
  two.z = 1;

  game.setInput("one", { moveX: 0, moveZ: 0, facing: 0, attack: true, sequence: 1 });
  game.update(1 / 30, 1000);
  assert.equal(two.health, 100 - ATTACK_DAMAGE);
});

test("stale inputs are ignored", () => {
  const game = new Game();
  game.addPlayer("one", "One");
  game.setInput("one", { moveX: 1, moveZ: 0, facing: 0, attack: false, sequence: 2 });
  game.setInput("one", { moveX: -1, moveZ: 0, facing: 0, attack: false, sequence: 1 });
  assert.equal(game.players.get("one")?.input.moveX, 1);
});
