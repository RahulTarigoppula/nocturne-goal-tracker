interface Props {
  value: number;
  size?: 24 | 96;
}

/** 1 px surface-2 track, 1.5 px foil arc. pathLength 100 so the dash offset is the percentage. */
export function StrengthRing({ value, size = 24 }: Props) {
  return (
    <svg className="ring" viewBox="0 0 24 24" aria-hidden="true" width={size} height={size}>
      <circle className="track" cx="12" cy="12" r="11" />
      <circle
        className="arc"
        cx="12"
        cy="12"
        r="11"
        pathLength={100}
        style={{ strokeDashoffset: 100 - Math.max(0, Math.min(100, value)) }}
      />
    </svg>
  );
}
