export type OperatingHours = { start: string; end: string } | null | undefined;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** `null`/`undefined` operatingHours means always-on (24h). */
export function isWithinOperatingHours(operatingHours: OperatingHours, now: Date): boolean {
  if (!operatingHours) return true;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= toMinutes(operatingHours.start) && nowMinutes < toMinutes(operatingHours.end);
}
