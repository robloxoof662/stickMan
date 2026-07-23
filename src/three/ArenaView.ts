import * as THREE from "three";
import { ARENA_SIZE, type PlayerSnapshot } from "../../shared/protocol.ts";
import { StickFigure } from "./StickFigure.ts";

const COLORS = [0x5eead4, 0xfbbf24, 0xfb7185, 0x60a5fa, 0xc084fc, 0xa3e635];

export class ArenaView {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  private readonly players = new Map<string, StickFigure>();
  private myId = "";

  constructor(private readonly host: HTMLElement) {
    this.scene.background = new THREE.Color(0x08131f);
    this.scene.fog = new THREE.Fog(0x08131f, 20, 38);

    this.camera.position.set(0, 14, 14);
    this.camera.lookAt(0, 0, 0);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    host.append(this.renderer.domElement);

    this.addEnvironment();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  applySnapshot(myId: string, snapshots: PlayerSnapshot[]): void {
    this.myId = myId;
    const activeIds = new Set(snapshots.map((snapshot) => snapshot.id));
    const now = performance.now() / 1000;

    snapshots.forEach((snapshot, index) => {
      let figure = this.players.get(snapshot.id);
      if (!figure) {
        figure = new StickFigure(snapshot.id === myId ? 0x5eead4 : COLORS[index % COLORS.length]);
        figure.group.position.set(snapshot.x, 0, snapshot.z);
        this.players.set(snapshot.id, figure);
        this.scene.add(figure.group);
      }
      figure.setTarget(snapshot.x, snapshot.z, snapshot.facing, snapshot.health, snapshot.attacking, now);
      figure.group.visible = snapshot.health > 0;
    });

    for (const [id, figure] of this.players) {
      if (activeIds.has(id)) continue;
      this.scene.remove(figure.group);
      figure.dispose();
      this.players.delete(id);
    }
  }

  update(deltaSeconds: number, now: number): void {
    for (const figure of this.players.values()) figure.update(deltaSeconds, now);

    const me = this.players.get(this.myId);
    if (me) {
      const desired = new THREE.Vector3(
        me.group.position.x,
        13.5,
        me.group.position.z + 13.5,
      );
      this.camera.position.lerp(desired, 1 - Math.exp(-2.8 * deltaSeconds));
      this.camera.lookAt(me.group.position.x, 0, me.group.position.z);
    }
    this.renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private addEnvironment(): void {
    const hemisphere = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 2.4);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xffffff, 3.1);
    sun.position.set(-5, 13, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    this.scene.add(sun);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x17324a, roughness: 0.86, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(ARENA_SIZE, 18, 0x38bdf8, 0x24465f);
    grid.position.y = 0.012;
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.38;
    });
    this.scene.add(grid);

    const borderMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0x5d3b00,
      emissiveIntensity: 0.5,
    });
    const borderGeometry = new THREE.BoxGeometry(ARENA_SIZE + 0.5, 0.18, 0.24);
    for (const [x, z, rotation] of [
      [0, -ARENA_SIZE / 2, 0],
      [0, ARENA_SIZE / 2, 0],
      [-ARENA_SIZE / 2, 0, Math.PI / 2],
      [ARENA_SIZE / 2, 0, Math.PI / 2],
    ] as const) {
      const border = new THREE.Mesh(borderGeometry, borderMaterial);
      border.position.set(x, 0.09, z);
      border.rotation.y = rotation;
      this.scene.add(border);
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 2.78, 64),
      new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    this.scene.add(ring);
  }
}
