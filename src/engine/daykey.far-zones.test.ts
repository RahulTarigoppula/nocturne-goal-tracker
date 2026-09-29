import { describe, expect, it } from "vitest";
import { nextOccurrence } from "./recurrence";
import type { DayKey } from "./types";

const k = (s: string) => s as DayKey;

// Day keys are floating calendar dates: the daily rule must be zone-independent at the far edges.
for (const zone of ["Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
  describe(`daily recurrence in ${zone}`, () => {
    it("advances exactly one calendar day for a year", () => {
      process.env.TZ = zone;
      let d = k("2026-01-01");
      for (let i = 0; i < 365; i++) d = nextOccurrence({ kind: "daily", interval: 1, mode: "fixed" }, d);
      expect(d).toBe("2027-01-01");
    });
  });
}
