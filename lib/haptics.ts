/** Light tap feedback where the device supports Vibration API (e.g. iPhone Safari). */
export function hapticLight(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(10);
  } catch {
    /* ignore */
  }
}

export function hapticMedium(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate([12, 24, 12]);
  } catch {
    /* ignore */
  }
}
