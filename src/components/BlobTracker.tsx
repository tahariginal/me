/**
 * Blob-track overlay, in the manner of TouchDesigner's Blob Track TOP: a small
 * reticle and readout that follow the centre of the atmospheric field.
 * Positioned by the Field loop (no React updates). Fine pointers only, never
 * over content, hidden for reduced motion.
 */
export default function BlobTracker() {
  const tick = "absolute size-1.5 border-accent";
  return (
    <div
      id="blob-tracker"
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[5] hidden opacity-0 transition-opacity duration-700 will-change-transform motion-reduce:!hidden [@media(pointer:fine)]:block"
    >
      <span className={`${tick} left-0 top-0 border-l border-t`} />
      <span className={`${tick} right-0 top-0 border-r border-t`} />
      <span className={`${tick} bottom-0 left-0 border-b border-l`} />
      <span className={`${tick} bottom-0 right-0 border-b border-r`} />
      <span className="absolute left-1/2 top-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 bg-accent" />
      <span className="label absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap text-[0.5625rem] text-fg-3">
        <span data-blob-label className="tabular">—</span>
      </span>
    </div>
  );
}
