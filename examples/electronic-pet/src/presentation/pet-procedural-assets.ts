// SPDX-License-Identifier: MIT
import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from "three";
import type { ColorRepresentation } from "three";

function createPetMaterialV1(
  color: ColorRepresentation,
  roughness = 0.72,
): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

export function createPetRoomV1(
  primaryMaterialSourceName: string,
  primaryColor: string,
): Group {
  const room = new Group();
  room.name = "RoomShell";
  const floorMaterial = createPetMaterialV1(0xc9aa82, 0.88);
  const wallMaterial = createPetMaterialV1(primaryColor, 0.95);
  wallMaterial.name = primaryMaterialSourceName;
  const sideWallMaterial = wallMaterial.clone();
  sideWallMaterial.color.set(0xe8ddd0);
  const trimMaterial = createPetMaterialV1(0xf7f0e6, 0.82);
  const rugMaterial = createPetMaterialV1(0x719f93, 0.9);

  const floor = new Mesh(new PlaneGeometry(8, 6), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);
  const back = new Mesh(new PlaneGeometry(8, 4.6), wallMaterial);
  back.position.set(0, 2.3, -3);
  back.receiveShadow = true;
  room.add(back);
  const side = new Mesh(new PlaneGeometry(6, 4.6), sideWallMaterial);
  side.position.set(-4, 2.3, 0);
  side.rotation.y = Math.PI / 2;
  side.receiveShadow = true;
  room.add(side);

  const backTrim = new Mesh(new BoxGeometry(8, 0.12, 0.08), trimMaterial);
  backTrim.position.set(0, 0.06, -2.94);
  room.add(backTrim);
  const sideTrim = new Mesh(new BoxGeometry(0.08, 0.12, 6), trimMaterial.clone());
  sideTrim.position.set(-3.94, 0.06, 0);
  room.add(sideTrim);

  const rug = new Mesh(new CircleGeometry(1, 48), rugMaterial);
  rug.rotation.x = -Math.PI / 2;
  rug.scale.set(2.05, 1.42, 1);
  rug.position.set(0.3, 0.014, 0.12);
  rug.receiveShadow = true;
  room.add(rug);

  const windowPane = new Mesh(
    new PlaneGeometry(2.15, 1.65),
    new MeshStandardMaterial({
      color: 0xc7e2e5,
      emissive: 0x284b51,
      emissiveIntensity: 0.2,
      roughness: 0.48,
    }),
  );
  windowPane.position.set(-2.15, 2.62, -2.97);
  room.add(windowPane);
  const windowFrameMaterial = createPetMaterialV1(0xfaf4ea, 0.76);
  for (
    const [x, y, width, height] of [
      [-3.27, 2.62, 0.1, 1.86],
      [-1.03, 2.62, 0.1, 1.86],
      [-2.15, 3.5, 2.34, 0.1],
      [-2.15, 1.74, 2.34, 0.1],
      [-2.15, 2.62, 0.08, 1.72],
    ] as const
  ) {
    const frame = new Mesh(new BoxGeometry(width, height, 0.08), windowFrameMaterial);
    frame.position.set(x, y, -2.91);
    frame.castShadow = true;
    room.add(frame);
  }

  const bedBase = new Mesh(
    new CylinderGeometry(0.7, 0.74, 0.16, 32),
    createPetMaterialV1(0xc9826f, 0.94),
  );
  bedBase.position.set(-1.05, 0.08, -0.72);
  bedBase.scale.z = 0.78;
  bedBase.castShadow = true;
  bedBase.receiveShadow = true;
  room.add(bedBase);
  const bedCushion = new Mesh(
    new CylinderGeometry(0.53, 0.57, 0.12, 32),
    createPetMaterialV1(0xf2c5ad, 0.98),
  );
  bedCushion.position.set(-1.05, 0.17, -0.72);
  bedCushion.scale.z = 0.76;
  bedCushion.receiveShadow = true;
  room.add(bedCushion);

  const bowl = new Mesh(
    new CylinderGeometry(0.21, 0.29, 0.13, 32),
    createPetMaterialV1(0x8aa8c5, 0.46),
  );
  bowl.position.set(0.95, 0.065, 0.55);
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  room.add(bowl);
  return room;
}

export function createPetBallV1(
  primaryMaterialSourceName: string,
  primaryColor: string,
): Group {
  const toy = new Group();
  toy.name = "Ball";
  const material = createPetMaterialV1(primaryColor, 0.58);
  material.name = primaryMaterialSourceName;
  const ball = new Mesh(new SphereGeometry(0.19, 24, 16), material);
  ball.castShadow = true;
  ball.receiveShadow = true;
  toy.add(ball);
  return toy;
}

export function createPetBrushV1(
  primaryMaterialSourceName: string,
  primaryColor: string,
): Group {
  const brush = new Group();
  brush.name = "Brush";
  const bodyMaterial = createPetMaterialV1(primaryColor, 0.62);
  bodyMaterial.name = primaryMaterialSourceName;
  const bristleMaterial = createPetMaterialV1(0xf0d7b1, 0.96);

  const head = new Mesh(new BoxGeometry(0.34, 0.1, 0.48), bodyMaterial);
  head.position.z = -0.12;
  head.castShadow = true;
  head.receiveShadow = true;
  brush.add(head);

  const handle = new Mesh(new CylinderGeometry(0.055, 0.07, 0.48, 18), bodyMaterial);
  handle.rotation.x = Math.PI / 2;
  handle.position.z = 0.33;
  handle.castShadow = true;
  brush.add(handle);

  for (const x of [-0.1, 0, 0.1]) {
    for (const z of [-0.27, -0.14, -0.01]) {
      const bristle = new Mesh(new CylinderGeometry(0.012, 0.016, 0.08, 8), bristleMaterial);
      bristle.position.set(x, -0.085, z);
      bristle.castShadow = true;
      brush.add(bristle);
    }
  }
  return brush;
}
