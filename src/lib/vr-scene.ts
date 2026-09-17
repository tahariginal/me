/**
 * Scene description for the virtual-visit model: three connected rooms,
 * exhibits, signage and a waypoint route. Pure data, built once.
 * World units are metres; -z is forward along the visit.
 */

export type V3 = [number, number, number];
export type Seg = [V3, V3];

export const EYE = 1.6;
const W = 3.5; // half room width
const H = 3;
const DOOR = 0.75; // half door width
const DOOR_H = 2.3;

export const rooms = [
  { code: "A", name: "Entrance", z0: -1, z1: -8 },
  { code: "B", name: "Gallery", z0: -9, z1: -16 },
  { code: "C", name: "Exhibit hall", z0: -17, z1: -24 },
];

export const waypoints = [
  { x: 0, z: -4.5 },
  { x: 1.4, z: -11.5 },
  { x: -1.3, z: -15 },
  { x: 0, z: -21 },
];

export const roomAt = (z: number) => Math.max(0, rooms.findIndex((r) => z <= r.z0 && z >= r.z1 - 1));

export type ExhibitKind = "ico" | "octa" | "cube";
export type Exhibit = { pos: V3; kind: ExhibitKind; title: string; lines: string[] };

/** Unit-size wireframes for the floating exhibits. */
export const shapes: Record<ExhibitKind, Seg[]> = (() => {
  const edges = (verts: V3[], len: number): Seg[] => {
    const out: Seg[] = [];
    for (let i = 0; i < verts.length; i++)
      for (let j = i + 1; j < verts.length; j++) {
        const d = Math.hypot(verts[i][0] - verts[j][0], verts[i][1] - verts[j][1], verts[i][2] - verts[j][2]);
        if (Math.abs(d - len) < 1e-3) out.push([verts[i], verts[j]]);
      }
    return out;
  };
  const phi = (1 + Math.sqrt(5)) / 2;
  const ico: V3[] = [];
  for (const a of [-1, 1]) for (const b of [-phi, phi]) ico.push([0, a, b], [a, b, 0], [b, 0, a]);
  const octa: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const cube: V3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) cube.push([x, y, z]);
  const norm = (vs: V3[], r: number) => vs.map((v) => v.map((c) => c / r) as V3);
  return {
    ico: edges(norm(ico, Math.hypot(1, phi)), 2 / Math.hypot(1, phi)),
    octa: edges(octa, Math.SQRT2),
    cube: edges(norm(cube, Math.sqrt(3)), 2 / Math.sqrt(3)),
  };
})();

export function buildScene() {
  const segs: Seg[] = [];
  const tiles: Seg[] = []; // floor grid, for perspective
  const boundary: Seg[] = []; // play-area outline, drawn in accent
  const lights: Seg[] = [];
  const floor: V3[] = [];
  const exhibits: Exhibit[] = [];
  const signs: { pos: V3; text: string }[] = [];
  const add = (list: Seg[], a: V3, b: V3) => list.push([a, b]);
  const rect = (list: Seg[], pts: V3[]) => pts.forEach((p, i) => add(list, p, pts[(i + 1) % pts.length]));
  const kinds: ExhibitKind[] = ["ico", "octa", "cube"];

  rooms.forEach(({ z0, z1, code, name }, i) => {
    for (const x of [-W, W]) {
      add(segs, [x, 0, z0], [x, 0, z1]);
      add(segs, [x, H, z0], [x, H, z1]);
      add(segs, [x, 0, z0], [x, H, z0]);
      add(segs, [x, 0, z1], [x, H, z1]);
    }
    const walls: [number, boolean][] = [
      [z0, i > 0],
      [z1, i < rooms.length - 1],
    ];
    for (const [z, door] of walls) {
      add(segs, [-W, H, z], [W, H, z]);
      if (!door) {
        add(segs, [-W, 0, z], [W, 0, z]);
        continue;
      }
      add(segs, [-W, 0, z], [-DOOR, 0, z]);
      add(segs, [DOOR, 0, z], [W, 0, z]);
      rect(segs, [[-DOOR, 0, z], [-DOOR, DOOR_H, z], [DOOR, DOOR_H, z], [DOOR, 0, z]]);
    }
    if (i < rooms.length - 1) {
      const zn = rooms[i + 1].z0;
      for (const x of [-DOOR, DOOR]) {
        add(segs, [x, 0, z1], [x, 0, zn]);
        add(segs, [x, DOOR_H, z1], [x, DOOR_H, zn]);
      }
    }
    signs.push({ pos: [0, DOOR_H + 0.3, z0 - 0.02], text: `Room ${code} · ${name}` });

    // ceiling light panels
    const zc = (z0 + z1) / 2;
    for (const x of [-1.6, 1.6]) rect(lights, [[x - 0.5, H, zc - 2], [x + 0.5, H, zc - 2], [x + 0.5, H, zc + 2], [x - 0.5, H, zc + 2]]);

    // a framed panel on one wall
    const side = i % 2 === 0 ? -W : W;
    rect(segs, [[side, 1, zc - 1.3], [side, 2.2, zc - 1.3], [side, 2.2, zc + 1.3], [side, 1, zc + 1.3]]);

    // pedestal with a floating exhibit
    // placed ahead along the route, opposite the wall panel, so the tour looks at it
    const bx = -side * 0.55;
    const bz = zc - 1.6;
    const s = 0.28;
    for (const y of [0, 1]) rect(segs, [[bx - s, y, bz - s], [bx + s, y, bz - s], [bx + s, y, bz + s], [bx - s, y, bz + s]]);
    for (const [dx, dz] of [[-s, -s], [s, -s], [s, s], [-s, s]]) add(segs, [bx + dx, 0, bz + dz], [bx + dx, 1, bz + dz]);
    exhibits.push({
      pos: [bx, 1.45, bz],
      kind: kinds[i],
      title: `Exhibit 0${i + 1}`,
      lines: ["Interactive model", "Gaze held · info open"],
    });

    for (let x = -W + 0.25; x < W; x += 0.5) for (let z = z0 - 0.25; z > z1; z -= 0.5) floor.push([x, 0, z]);

    // floor grid every metre, and the play-area outline inset from the walls
    for (let x = -3; x <= 3; x++) add(tiles, [x, 0, z0], [x, 0, z1]);
    for (let z = Math.ceil(z1); z <= Math.floor(z0); z++) add(tiles, [-W, 0, z], [W, 0, z]);
    const b = 0.45;
    rect(boundary, [
      [-W + b, 0.02, z0 - b],
      [W - b, 0.02, z0 - b],
      [W - b, 0.02, z1 + b],
      [-W + b, 0.02, z1 + b],
    ]);
  });

  return { segs, tiles, boundary, lights, floor, exhibits, signs };
}
