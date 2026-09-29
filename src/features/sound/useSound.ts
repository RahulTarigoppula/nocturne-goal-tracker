import { useSettings } from "../../data/queries";
import { sound } from "./synth";

export function useSound() {
  const s = useSettings();
  return {
    strike: (n: number) => sound.strike(s, n),
    thock: () => sound.thock(s),
    chime: () => sound.chime(s),
    undo: () => sound.undo(s),
  };
}
