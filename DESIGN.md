# Design system — "Systems under the surface. Products above it."

## Concept

The site is one continuous space: a lattice of points (**the substrate**) behind every section.
Scroll moves a camera through it.

| Section    | Camera                                                           | Meaning                        |
| ---------- | ---------------------------------------------------------------- | ------------------------------ |
| Index      | Looks down on the surface; the name sits on the horizon          | The product people see         |
| Surface    | Pitch goes through 0°, so the plane collapses into one line      | The thesis, drawn as a hairline |
| Work       | Looks up at the surface from underneath                          | The systems under each project |
| Experience | Deeper, steeper                                                  | Foundations                    |
| System     | Top-down and flattened, so it reads as a grid                    | The stack as a structure       |
| About      | Calm, low amplitude                                              | Human                          |
| Contact    | Back above the surface, highest energy                           | Back to product                |

There is one generative visual. Everything else (diagrams, portrait, layer textures) uses
the same vocabulary: points, hairlines, one accent.

## Colour

The page is black, graphite, off-white and neutral grey. Blue is an accent that marks
state, interaction and information in transit. It is never used as a surface.

Tokens live in `@theme` in `src/app/globals.css`. Canvas and WebGL code reads the same
values from `src/lib/theme.ts`.

| Token          | Value                    | Use                                                                 |
| -------------- | ------------------------ | ------------------------------------------------------------------- |
| `bg`           | `#0c0c0b`                | Graphite ground                                                      |
| `fg`           | `#ece7df`                | Warm off-white. 15.9:1 on `bg`                                        |
| `fg-2`         | `#a8a39b`                | Secondary text. 7.8:1                                                |
| `fg-3`         | `#8a857e`                | Metadata only. 5.35:1, the lowest text contrast used                 |
| `line`         | `fg` at 10% / 18%        | Hairlines                                                            |
| `accent`       | `#3b82f6`                | 5.3:1, safe for text. Indexes, active nav, links, focus rings, status dots, diagram highlights |
| `accent-deep`  | `#2563eb`                | 3.8:1, not for small text. Lines, wires, fills, primary CTA hover (white text, 5.2:1) |
| `accent-light` | `#60a5fa`                | 7.7:1. Hover text, travelling pulses, animated diagram flows, selected points |
| `accent-glow`  | `rgb(59 130 246 / .15)`  | Tints only                                                           |

Where blue appears:

- **UI:** the active nav underline and index, project numbers, link underlines, a line drawn under secondary buttons on hover, focus rings, live-status dots, the work progress bar.
- **Field:** the lattice stays off-white. A sparse set of blue nodes is joined by thin blue links, and short pulses of light travel along those links. Blue heat also appears under the cursor. None of this adds glow.
- **Diagrams:** animated dashed flows and "hot" packets.
- **Portrait:** a handful of blue points, and blue heat under the cursor.
- **VR viewer:** waypoints, hotspots, the teleport arc and the dwell ring.

## Typography

- **Space Grotesk** for headings, project names, navigation, statements and body copy.
  - Display (`.display`): 500 weight, -0.04em tracking, 0.92 line height.
  - Hero name: 600 weight, -0.05em tracking.
  - Sub-heads: 400–500. Body: 400, with 1.45–1.6 line height.
- **IBM Plex Mono** only for labels, indexes, timestamps and readouts (`.label`): 400 weight, 11px, uppercase, +0.08em tracking.
- Never set running text in mono. Never set labels in sans.
- Headlines are short statements, not titles: "Read from the system up.", "From the surface down."

## Layout

- 12-column grid, gutter `clamp(1rem, 3.2vw, 2.75rem)`, content capped at 110rem.
- Each section starts with a `NN / Name` label, then a display headline, then at most a two-line lede.
- Numbering is structural: sections `00–05`, projects `01–05`, beats `01.1`, layers `L.01`, figures `Fig. 01`.

## Motion

- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for reveals, `cubic-bezier(0.76, 0, 0.24, 1)` for lines.
- Reveals run once: masked rise for headlines, fade-up for paragraphs, scaleX for hairlines. Stagger at most 90ms.
- Scroll-linked motion (the manifesto and the field camera) is driven by scroll position, not timers.
- Diagrams animate only while on screen (SMIL paused by IntersectionObserver).
- `prefers-reduced-motion`: no intro, no reveals, the manifesto shown fully composed, the field drawn as one still frame per scroll position, diagrams frozen.

## Project diagrams

Each diagram is drawn from the architecture described in the CV. None is a mock screenshot.

- **Factory**: CEO agent → permission gate → CTO modes → sandboxed build agents → milestone review, with an audit rail and an SLA escalation loop.
- **DPRO**: one opportunity record moving through five stages, a notification bus to four roles, and a before/after of the simplified screens.
- **Vamo**: an identity graph. Teammate-only phone visibility is drawn as accent links; other links are crossed out.
- **ft_transcendence**: a Pong court with the net as the server, over a sequence diagram of WebSocket events.
- **FIT**: six signals → context → complete look, with a reuse loop.

While you read, each beat highlights its part of the diagram (`data-beat` ↔ `data-k`).

## Atmosphere: the blob field

The site has one environmental layer: a single soft body that the lattice and the tracker respond to. The simulation lives in `Field.tsx`, and its state is shared through `src/lib/energy.ts`.

**Motion**

- An under-damped spring follows the pointer. It lags, overshoots slightly and settles.
- The body stretches along its velocity and compresses as it slows. Three trailing satellites give it a faint wake.
- Hovering a link, button or `[data-energy]` element pulls the body toward it and swells it slightly.
- Scrolling drags the body and the spring brings it back. Section changes send a small pulse.
- After 2.6 s without input, the body drifts to its section's resting place. Position, radius and intensity are keyframed per section, alongside the camera: hero bright on the right, work quiet, about sitting on the portrait, contact the strongest.

**Rendering**

- The body is layered radial light (deep blue haze, a faint `accent` core and a thin rim) drawn in a Canvas 2D at 1/8 of the viewport. CSS stretches it, so the compositor's upscale does the blur at almost no cost.
- A full-resolution WebGL pass was tried first and cost too much on software GL, so it was replaced.
- Lattice points inside the body get slightly brighter and larger, with a hint of blue.

**Blob tracking**

- On fine pointers, a small 28 px reticle with a coordinate readout (`x / y`) follows the centre of the body, in the style of TouchDesigner's Blob Track TOP.
- The overlay sits under the content (z 5 < main z 10) and is hidden with reduced motion.

**Mobile and reduced motion**

- Mobile has no hover. The body follows touch while a finger is down, then rests at the section anchor. It is 20% smaller and 25% weaker.
- Under reduced motion the body is drawn once per scroll position at its anchor and never follows anything.

## Portrait: a TouchDesigner network in a shader

`me.jpeg` (background removed) is sampled into about 21k points on desktop and 10k on mobile. The pipeline mirrors a TD network, and the node strip under the plate is its UI:

`moviefilein1` → `lumadepth1` (z = brightness) → noise (simplex drift plus slice glitches) → instance points + `binary1` → `feedback1` (brightest of this frame or the decaying, drifting trail) → `out1` (tone map plus scanline).

**binary1: the backdrop**

- A wall of 0/1 glyphs (a point-sprite atlas) sits in depth behind the head. It is a nod to the binary backdrop of the original photo.
- Columns drift down at their own pace, brighter streams run through them, and bits flip. Bits flip faster and warm to blue near the cursor.
- A silhouette pass draws the head in black first, so it hides the wall. The wall shares the head's orbit at reduced strength, so it parallaxes behind it.

**Motion and fallbacks**

- As the About section scrolls into view, the points rise out of a flat substrate plane into the face, which ties back to the page field.
- The bust idles through a slow sway (±0.24 rad). The pointer orbits it, points dissolve under the cursor and turn blue with speed, and a handful of points stay lit in blue as nodes.
- A sculpted-volume version with normals and directional lighting was tried and dropped: it cost facial readability. Depth stays luma-based.
- The bust fades out at its base and sides, so the photo's crop never shows as a hard edge.
- Each operator is a real toggle button (`aria-pressed`). `moviefilein1` shows the source photograph.
- Under reduced motion the time is frozen and there is no feedback; a frame is drawn only when something changes.

## VR: virtual visit, stereo model (Experience → UM6P)

A Canvas 2D headset preview, split into scene data (`src/lib/vr-scene.ts`), a renderer (`src/lib/vr-render.ts`) and the component.

**View**

- Stereo (two lens-shaped eyes with an eye offset) or mono (one wide view). Both use barrel pre-distortion and a lens vignette.

**Scene**

- Three connected rooms with doorways, ceiling light panels, framed wall panels and a floor point grid.
- A sign over each doorway ("Room B · Gallery").
- A pedestal in each room with a slowly turning, bobbing wireframe exhibit (icosahedron, octahedron, cube) and a ◇ hotspot.

**Navigation**

- Four waypoints. The next one pulses blue, and animated floor chevrons flow toward it (Guides toggle).
- A right-hand controller with a pointer ray. On teleport the ray becomes a parabolic arc, followed by a fade-to-black comfort blink.
- A plan view shows the rooms, clickable waypoints, and the player with a view cone. Readouts show room, position, heading and frame time.

**Gaze**

- Holding the reticle on an exhibit for 1.1 s fills a dwell ring. The exhibit turns blue and a world-space info panel opens beside it, facing the viewer.

**Tour and input**

- **Auto-tour:** the head turns to an exhibit near the route, holds it until the panel opens, then teleports on. The tour pauses for 8 s after any input.
- **Mouse:** hover to look, drag to turn. A click on a waypoint ring jumps there; a click anywhere else advances.
- **Touch:** horizontal drag turns the view, and a tap advances.
- **Keyboard:** the viewer is focusable. Arrow keys look around, Enter or Space teleports, and 1–4 jumps to a waypoint. The plan waypoints are also buttons.
- **Reduced motion:** no auto-tour, arcs, blinks or rotation. Teleports are instant, and a frame is drawn on each input.

It is labelled as a model, not a capture of the delivered Unity project.

## Content rules

- `src/lib/content.ts` is the only source of facts, and every fact in it comes from the CV.
- No invented dates, metrics, employers or technologies. The CV has no dates, so the timeline has none.
- FIT is labelled as a product concept. DPRO is described as contributed work on a production platform.
- The phone number from the CV is left off the public site on purpose.
