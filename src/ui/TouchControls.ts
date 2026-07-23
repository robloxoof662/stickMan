type ControlState = {
  moveX: number;
  moveZ: number;
  facing: number;
  attack: boolean;
};

const JOYSTICK_RADIUS = 54;

export class TouchControls {
  private pointerId?: number;
  private origin = { x: 0, y: 0 };
  private moveX = 0;
  private moveZ = 0;
  private facing = 0;
  private attack = false;
  private readonly keys = new Set<string>();

  constructor(
    private readonly joystick: HTMLElement,
    private readonly knob: HTMLElement,
    private readonly attackButton: HTMLButtonElement,
  ) {
    joystick.addEventListener("pointerdown", this.onPointerDown);
    joystick.addEventListener("pointermove", this.onPointerMove);
    joystick.addEventListener("pointerup", this.onPointerUp);
    joystick.addEventListener("pointercancel", this.onPointerUp);

    attackButton.addEventListener("pointerdown", this.onAttackDown);
    attackButton.addEventListener("pointerup", this.onAttackUp);
    attackButton.addEventListener("pointercancel", this.onAttackUp);
    attackButton.addEventListener("contextmenu", (event) => event.preventDefault());

    window.addEventListener("keydown", (event) => {
      this.keys.add(event.code);
      if (event.code === "Space") {
        event.preventDefault();
        this.attack = true;
      }
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      if (event.code === "Space") this.attack = false;
    });
  }

  read(): ControlState {
    const keyboardX = Number(this.keys.has("KeyD") || this.keys.has("ArrowRight"))
      - Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
    const keyboardZ = Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"))
      - Number(this.keys.has("KeyW") || this.keys.has("ArrowUp"));
    const moveX = keyboardX || this.moveX;
    const moveZ = keyboardZ || this.moveZ;
    if (Math.hypot(moveX, moveZ) > 0.05) this.facing = Math.atan2(moveX, moveZ);

    return { moveX, moveZ, facing: this.facing, attack: this.attack };
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.pointerId = event.pointerId;
    this.joystick.setPointerCapture(event.pointerId);
    const bounds = this.joystick.getBoundingClientRect();
    this.origin = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    this.updateStick(event.clientX, event.clientY);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    event.preventDefault();
    this.updateStick(event.clientX, event.clientY);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.pointerId = undefined;
    this.moveX = 0;
    this.moveZ = 0;
    this.knob.style.transform = "translate3d(0, 0, 0)";
  };

  private readonly onAttackDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.attackButton.setPointerCapture(event.pointerId);
    this.attack = true;
    this.attackButton.classList.add("pressed");
  };

  private readonly onAttackUp = (event: PointerEvent): void => {
    event.preventDefault();
    this.attack = false;
    this.attackButton.classList.remove("pressed");
  };

  private updateStick(clientX: number, clientY: number): void {
    const dx = clientX - this.origin.x;
    const dy = clientY - this.origin.y;
    const distance = Math.hypot(dx, dy);
    const scale = distance > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / distance : 1;
    const clampedX = dx * scale;
    const clampedY = dy * scale;
    this.moveX = clampedX / JOYSTICK_RADIUS;
    this.moveZ = clampedY / JOYSTICK_RADIUS;
    this.knob.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
  }
}
