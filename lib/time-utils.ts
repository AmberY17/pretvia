/**
 * Parse "HH:mm" into hours and minutes.
 */
export function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = String(time).trim().split(":").map(Number)
  return { hours: h ?? 0, minutes: m ?? 0 }
}
