import {
  ARENA_SIZE,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  type PlayerInput,
  type PlayerSnapshot,
  type ServerMessage,
} from "../../shared/protocol.ts";

type ConnectionStatus = {
  state: "connecting" | "online" | "offline" | "preview";
  label: string;
};

type InputState = Pick<PlayerInput, "moveX" | "moveZ" | "facing" | "attack">;

type GameClientOptions = {
  onConnectionChange: (status: ConnectionStatus) => void;
  onSnapshot: (myId: string, players: PlayerSnapshot[]) => void;
};

export class GameClient {
  private socket?: WebSocket;
  private myId = "";
  private sequence = 0;
  private reconnectTimer?: number;
  private lastInputSentAt = 0;
  private offlinePlayer?: PlayerSnapshot;
  private offlineLastUpdateAt = 0;

  constructor(private readonly options: GameClientOptions) {}

  connect(): void {
    window.clearTimeout(this.reconnectTimer);
    this.options.onConnectionChange({ state: "connecting", label: "正在连接…" });

    const configuredUrl = import.meta.env.VITE_WS_URL?.trim();
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const developmentUrl = `${protocol}//${location.hostname}:8787`;
    const productionUrl = `${protocol}//${location.host}`;
    const url = configuredUrl || (import.meta.env.DEV ? developmentUrl : productionUrl);
    this.socket = new WebSocket(url);

    this.socket.addEventListener("open", () => {
      this.options.onConnectionChange({ state: "online", label: "在线" });
      this.socket?.send(JSON.stringify({ type: "join", name: this.playerName() }));
    });

    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      if (message.type === "welcome") {
        this.myId = message.id;
      } else if (message.type === "snapshot" && this.myId) {
        this.options.onSnapshot(this.myId, message.players);
      }
    });

    this.socket.addEventListener("close", () => {
      if (import.meta.env.PROD && !configuredUrl) {
        this.startOfflinePreview();
        return;
      }
      this.options.onConnectionChange({ state: "offline", label: "连接中断，正在重试" });
      this.reconnectTimer = window.setTimeout(() => this.connect(), 1500);
    });

    this.socket.addEventListener("error", () => this.socket?.close());
  }

  sendInput(input: InputState): void {
    const now = performance.now();
    if (this.offlinePlayer) {
      this.updateOfflinePreview(input, now);
      return;
    }
    if (now - this.lastInputSentAt < 1000 / 30 || this.socket?.readyState !== WebSocket.OPEN) return;
    this.lastInputSentAt = now;
    this.sequence += 1;
    const payload = {
      type: "input",
      input: { ...input, sequence: this.sequence },
    };
    this.socket.send(JSON.stringify(payload));
  }

  private playerName(): string {
    const saved = localStorage.getItem("stickman-player-name");
    if (saved) return saved;
    const generated = `Player-${Math.floor(100 + Math.random() * 900)}`;
    localStorage.setItem("stickman-player-name", generated);
    return generated;
  }

  private startOfflinePreview(): void {
    if (this.offlinePlayer) return;
    this.myId = "offline-preview";
    this.offlineLastUpdateAt = performance.now();
    this.offlinePlayer = {
      id: this.myId,
      x: 0,
      z: 0,
      facing: 0,
      health: 100,
      score: 0,
      lastInputSequence: 0,
      attacking: false,
    };
    this.options.onConnectionChange({ state: "preview", label: "单机预览" });
    this.options.onSnapshot(this.myId, [this.offlinePlayer]);
  }

  private updateOfflinePreview(input: InputState, now: number): void {
    if (!this.offlinePlayer || now - this.lastInputSentAt < 1000 / 30) return;
    const deltaSeconds = Math.min((now - this.offlineLastUpdateAt) / 1000, 0.1);
    this.offlineLastUpdateAt = now;
    this.lastInputSentAt = now;

    const length = Math.hypot(input.moveX, input.moveZ);
    const scale = length > 1 ? 1 / length : 1;
    const boundary = ARENA_SIZE / 2 - PLAYER_RADIUS;
    this.offlinePlayer.x = clamp(
      this.offlinePlayer.x + input.moveX * scale * PLAYER_SPEED * deltaSeconds,
      -boundary,
      boundary,
    );
    this.offlinePlayer.z = clamp(
      this.offlinePlayer.z + input.moveZ * scale * PLAYER_SPEED * deltaSeconds,
      -boundary,
      boundary,
    );
    this.offlinePlayer.facing = input.facing;
    this.offlinePlayer.attacking = input.attack;
    this.offlinePlayer.lastInputSequence += 1;
    this.options.onSnapshot(this.myId, [this.offlinePlayer]);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
