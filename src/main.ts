import "./styles.css";
import { ArenaView } from "./three/ArenaView.ts";
import { TouchControls } from "./ui/TouchControls.ts";
import { GameClient } from "./network/GameClient.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main class="game-shell">
    <div id="scene" class="scene" aria-label="StickMan 对战场景"></div>
    <header class="hud">
      <div class="brand"><span class="brand-dot"></span>STICKMAN ARENA</div>
      <div id="connection" class="connection">正在连接…</div>
      <div class="score">击败 <strong id="score">0</strong></div>
    </header>
    <div class="health-panel">
      <span>生命</span>
      <div class="health-track"><div id="health" class="health-fill"></div></div>
      <strong id="health-value">100</strong>
    </div>
    <div id="message" class="message">等待另一位玩家加入</div>
    <div id="joystick" class="joystick" aria-label="移动摇杆">
      <div class="joystick-ring"></div>
      <div id="joystick-knob" class="joystick-knob"></div>
    </div>
    <button id="attack" class="attack" type="button" aria-label="攻击">
      <span>⚡</span>
      攻击
    </button>
    <div class="desktop-hint">WASD 移动 · 空格攻击</div>
    <div class="rotate-notice">请将 iPad 横过来进行对战</div>
  </main>
`;

const sceneHost = document.querySelector<HTMLDivElement>("#scene")!;
const connectionElement = document.querySelector<HTMLDivElement>("#connection")!;
const messageElement = document.querySelector<HTMLDivElement>("#message")!;
const scoreElement = document.querySelector<HTMLElement>("#score")!;
const healthElement = document.querySelector<HTMLDivElement>("#health")!;
const healthValueElement = document.querySelector<HTMLElement>("#health-value")!;

const arena = new ArenaView(sceneHost);
const controls = new TouchControls(
  document.querySelector<HTMLDivElement>("#joystick")!,
  document.querySelector<HTMLDivElement>("#joystick-knob")!,
  document.querySelector<HTMLButtonElement>("#attack")!,
);

const client = new GameClient({
  onConnectionChange(status) {
    connectionElement.textContent = status.label;
    connectionElement.dataset.state = status.state;
    messageElement.textContent = status.state === "preview"
      ? "单机预览：移动并试试攻击"
      : "等待另一位玩家加入";
  },
  onSnapshot(myId, players) {
    arena.applySnapshot(myId, players);
    const me = players.find((player) => player.id === myId);
    if (me) {
      scoreElement.textContent = String(me.score);
      healthValueElement.textContent = String(me.health);
      healthElement.style.transform = `scaleX(${me.health / 100})`;
    }
    messageElement.classList.toggle("hidden", players.length > 1);
  },
});

client.connect();

let previousTime = performance.now();
function frame(now: number): void {
  const deltaSeconds = Math.min((now - previousTime) / 1000, 0.1);
  previousTime = now;
  const input = controls.read();
  client.sendInput(input);
  arena.update(deltaSeconds, now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
