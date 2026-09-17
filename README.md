# taha koulal — portfolio

Personal site for Taha Koulal: backend, AI and product engineering.
Next.js (static export), TypeScript and Tailwind CSS v4. There are no animation or 3D libraries: the point field and the portrait are hand-written WebGL.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in ./out
npm start          # serve ./out
```

To get absolute Open Graph URLs, set `NEXT_PUBLIC_SITE_URL` (for example `https://tahakoulal.dev`) at build time.

## Deploy

`./out` is plain static files and can be hosted anywhere (Vercel, Netlify, GitHub Pages, S3). Serve it with gzip or brotli.

## Structure

```
src/
  app/            layout, page, global tokens (globals.css)
  lib/
    content.ts    every fact on the site (sourced from the CV)
    field-shaders.ts, gl.ts, useScrollProgress.ts
  components/
    Field.tsx     the substrate: WebGL point lattice, scroll-driven camera
    Hero, Manifesto, Experience, System, About, Contact, Nav, Portrait
    work/         case studies, diagrams (server-rendered SVG), focus + playback helpers
public/
  cv/taha-koulal-cv.pdf
  img/            portrait texture (background removed) + mono fallbacks
  og.png
```

## Editing content

Edit `src/lib/content.ts`. A project's `beats[].focus` must match a `k("...")` group in its diagram under `src/components/work/`.

To replace the CV, overwrite `public/cv/taha-koulal-cv.pdf`.

## Performance and accessibility

- Lighthouse, local static build with gzip: desktop performance 98. Mobile performance 76 under simulated 4× CPU throttling with software WebGL. Accessibility, Best Practices and SEO are 100. CLS is 0.
- The field starts on idle. It uses fewer points and a 30fps cap on touch or low-core devices, and drops to a coarse lattice if the first frames are slow. It pauses when the tab is hidden.
- Semantic landmarks, a skip link, visible focus states, keyboard-reachable stack trace buttons, an `aria-label` on each diagram, and alt text on the portrait.
- `prefers-reduced-motion` is fully supported (see DESIGN.md).

See [DESIGN.md](./DESIGN.md) for the design system.
