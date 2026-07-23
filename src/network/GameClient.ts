import type {
  PlayerInput,
  PlayerSnapshot,
  ServerMessage,
} from "../../shared/protocol.ts";

type ConnectionStatus = {
  state: "connecting" | "online" | "offline";
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

  constructor(private readonly options: GameClientOptions) {}

  connect(): void {
    window.clearTimeout(this.reconnectTimer);
    this.options.onConnectionChange({ state: "connecting", label: "正在连接…" });

    const configuredUrl = import.meta.env.VITE_WS_URL?.trim();
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = configuredUrl || `${protocol}//${location.host}/ws`;
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
      this.options.onConnectionChange({ state: "offline", label: "连接中断，正在重试" });
      this.reconnectTimer = window.setTimeout(() => this.connect(), 1500);
    });

    this.socket.addEventListener("error", () => this.socket?.close());
  }

  sendInput(input: InputState): void {
    const now = performance.now();
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
}
