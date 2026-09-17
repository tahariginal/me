/**
 * The atmospheric field shared by every generative layer.
 *
 * `Field` owns the simulation (one rAF loop) and writes here each frame; any
 * other layer that wants to react to the atmosphere should only read. Values
 * are in CSS pixels relative to the viewport.
 */
export const energy = {
  /** blob centre */
  x: -9999,
  y: -9999,
  /** blob velocity, px/s */
  vx: 0,
  vy: 0,
  /** main radius, px */
  r: 0,
  /** 0..1 — overall presence after section mood and reduced-motion rules */
  intensity: 0,
  /** 0..1 — how strongly an interactive element is pulling the field */
  hover: 0,
  /** raw pointer, for layers that need precision instead of inertia */
  px: -9999,
  py: -9999,
  pointer: false,
  /** true once the simulation is running */
  live: false,
};
