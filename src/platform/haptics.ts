import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNative } from "./index";

/** The haptics map (DESIGN §12). Never called from scroll handlers. Reduced motion does not disable haptics. */
const vibrate = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
};

const run = (native: () => Promise<void>, webMs: number) => {
  if (isNative()) native().catch(() => {});
  else vibrate(webMs);
};

export const haptics = {
  strike: () => run(() => Haptics.impact({ style: ImpactStyle.Light }), 8),
  armed: () => run(() => Haptics.impact({ style: ImpactStyle.Medium }), 12),
  lift: () => run(() => Haptics.selectionStart(), 8),
  tick: () => run(() => Haptics.selectionChanged(), 4),
  drop: () => run(() => Haptics.selectionEnd(), 6),
  success: () => run(() => Haptics.notification({ type: NotificationType.Success }), 16),
  warning: () => run(() => Haptics.notification({ type: NotificationType.Warning }), 16),
  light: () => run(() => Haptics.impact({ style: ImpactStyle.Light }), 8),
};
