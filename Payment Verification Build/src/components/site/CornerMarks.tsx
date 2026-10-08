/** Decorative L-shaped register marks placed at the four corners of a frame. */
export default function CornerMarks({
  inset = 8,
  size = 14,
}: {
  inset?: number;
  size?: number;
}) {
  const arm = `${size}px`;
  const off = `${inset}px`;

  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute border-l border-t border-lineStrong"
        style={{ top: off, left: off, width: arm, height: arm }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute border-r border-t border-lineStrong"
        style={{ top: off, right: off, width: arm, height: arm }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute border-b border-l border-lineStrong"
        style={{ bottom: off, left: off, width: arm, height: arm }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute border-b border-r border-lineStrong"
        style={{ bottom: off, right: off, width: arm, height: arm }}
      />
    </>
  );
}
