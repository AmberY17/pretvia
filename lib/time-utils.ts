/**
 * Parse "HH:mm" into hours and minutes.
 */
export function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = String(time).trim().split(":").map(Number)
  return { hours: Number.isFinite(h) ? h : 0, minutes: Number.isFinite(m) ? m : 0 }
}
