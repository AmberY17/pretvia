/**
 * Get the next practice datetime from a training schedule.
 * Returns the closest slot occurrence at or after fromDate, in local time.
 */

import { parseTime } from "@/lib/time-utils"

/**
 * Get the next occurrence of a (dayOfWeek, time) slot at or after fromDate.
 * Uses local time. dayOfWeek: 0 = Sunday, 6 = Saturday.
 */
function getNextOccurrence(
  from: Date,
  dayOfWeek: number,
  hours: number,
  minutes: number
): Date {
  const result = new Date(from)
  const currentDay = result.getDay()
  const currentMinutes = result.getHours() * 60 + result.getMinutes()
  const slotMinutes = hours * 60 + minutes

  let daysToAdd = (dayOfWeek - currentDay + 7) % 7
  if (daysToAdd === 0 && slotMinutes <= currentMinutes) {
    daysToAdd = 7
  }

  result.setDate(result.getDate() + daysToAdd)
  result.setHours(hours, minutes, 0, 0)
  return result
}

/**
 * Returns the next practice datetime from the schedule, or null if no slots.
 * If it's 10am and today's practice is at 6pm, returns 6pm today.
 */
export function getNextPracticeFromSchedule(
  slots: { dayOfWeek: number; time: string }[],
  fromDate: Date = new Date()
): Date | null {
  if (!slots?.length) return null

  const candidates: Date[] = []
  for (const slot of slots) {
    const { hours, minutes } = parseTime(slot.time || "09:00")
    const next = getNextOccurrence(fromDate, slot.dayOfWeek, hours, minutes)
    candidates.push(next)
  }

  return new Date(Math.min(...candidates.map((c) => c.getTime())))
}
