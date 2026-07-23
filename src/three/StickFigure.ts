import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

export class StickFigure {
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly healthBar = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x5eead4, side: THREE.DoubleSide }),
  );
  private targetPosition = new THREE.Vector3();
  private targetFacing = 0;
  private health = 100;
  private attackingUntil = 0;
  private readonly leftArm: THREE.Mesh;
  private readonly rightArm: THREE.Mesh;

  constructor(color: number) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.62,
      metalness: 0.04,
    });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x122230, roughness: 0.8 });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), material);
    head.position.y = 2.15;
    head.castShadow = true;
    this.body.add(head);

    const torso = limb(0.16, 1.05, material);
    torso.position.y = 1.42;
    this.body.add(torso);

    this.leftArm = limb(0.1, 0.86, material);
    this.leftArm.position.set(-0.33, 1.55, 0);
    this.leftArm.rotation.z = -0.45;
    this.body.add(this.leftArm);

    this.rightArm = limb(0.1, 0.86, material);
    this.rightArm.position.set(0.33, 1.55, 0);
    this.rightArm.rotation.z = 0.45;
    this.body.add(this.rightArm);

    const leftLeg = limb(0.12, 0.96, darkMaterial);
    leftLeg.position.set(-0.2, 0.55, 0);
    leftLeg.rotation.z = -0.18;
    this.body.add(leftLeg);

    const rightLeg = limb(0.12, 0.96, darkMaterial);
    rightLeg.position.set(0.2, 0.55, 0);
    rightLeg.rotation.z = 0.18;
    this.body.add(rightLeg);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 24),
      new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.32, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    this.group.add(shadow);
    this.group.add(this.body);

    const healthBack = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide }),
    );
    healthBack.position.set(0, 2.72, 0);
    healthBack.rotation.x = -0.5;
    this.group.add(healthBack);
    this.healthBar.position.set(0, 2.71, -0.01);
    this.healthBar.rotation.x = -0.5;
    this.group.add(this.healthBar);
  }

  setTarget(x: number, z: number, facing: number, health: number, attacking: boolean, now: number): void {
    this.targetPosition.set(x, 0, z);
    this.targetFacing = facing;
    this.health = health;
    if (attacking) this.attackingUntil = now + 0.18;
  }

  update(deltaSeconds: number, now: number): void {
    const smoothing = 1 - Math.exp(-14 * deltaSeconds);
    this.group.position.lerp(this.targetPosition, smoothing);
    this.group.rotation.y = lerpAngle(this.group.rotation.y, this.targetFacing, smoothing);
    this.healthBar.scale.x = Math.max(0.001, this.health / 100);
    this.healthBar.position.x = -(1 - this.health / 100) * 0.625;

    const moving = this.group.position.distanceToSquared(this.targetPosition) > 0.0005;
    this.body.position.y = moving ? Math.abs(Math.sin(now * 10)) * 0.05 : 0;
    const attackAmount = now < this.attackingUntil ? Math.sin(((this.attackingUntil - now) / 0.18) * Math.PI) : 0;
    this.rightArm.rotation.x = -attackAmount * 1.7;
    this.rightArm.rotation.z = 0.45 - attackAmount * 0.5;
    this.leftArm.rotation.x = attackAmount * 0.35;
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    });
  }
}

function limb(radius: number, length: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length - radius * 2, 6, 12), material);
  mesh.castShadow = true;
  mesh.quaternion.setFromUnitVectors(UP, UP);
  return mesh;
}

function lerpAngle(from: number, to: number, amount: number): number {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * amount;
}
