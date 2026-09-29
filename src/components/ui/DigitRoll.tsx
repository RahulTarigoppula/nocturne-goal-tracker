import { memo, useEffect, useState } from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

interface Props {
  value: string;
  /** Screen-reader twin, e.g. "4 of 7". Defaults to the value. */
  label?: string;
  /** Start every digit below its window and roll in on mount. */
  rollIn?: boolean;
  delay?: number;
  className?: string;
}

/**
 * Each digit sits in a fixed 1em window over a 0–9 stack; a change translates the stack.
 * 20 ms stagger, rightmost first. Non-digits render as plain characters.
 */
export const DigitRoll = memo(function DigitRoll({ value, label, rollIn = false, delay = 0, className }: Props) {
  const [armed, setArmed] = useState(!rollIn);
  const [settled, setSettled] = useState(!rollIn);
  useEffect(() => {
    if (!rollIn) return;
    const t = window.setTimeout(() => setArmed(true), 20);
    const t2 = window.setTimeout(() => setSettled(true), 20 + delay + 800);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [rollIn, delay]);
  const chars = [...value];
  const digitCount = chars.filter((c) => /\d/.test(c)).length;
  let seen = 0;
  return (
    <span className={`roll ${className ?? ""}`}>
      <span className="roll-glyphs" aria-hidden="true" style={{ display: "inline-flex" }}>
        {chars.map((c, i) => {
          if (!/\d/.test(c)) {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: character position is the identity
              <span key={i} className="dchar">
                {c}
              </span>
            );
          }
          const fromRight = digitCount - 1 - seen++;
          const n = Number(c);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: character position is the identity
            <span key={i} className="dcol" style={{ width: "0.62em" }}>
              <span
                className="dstack"
                style={{
                  transform: `translateY(${armed ? -n : 1}em)`,
                  transitionDelay: `${fromRight * 20 + (settled ? 0 : delay)}ms`,
                }}
              >
                {DIGITS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
      <span className="sr-only">{label ?? value}</span>
    </span>
  );
});
