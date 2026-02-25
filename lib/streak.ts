/**
 * Streak calculation for training logs.
 * Streak = consecutive training slots where user either logged or skipped with reason.
 * 24-hour window: log must be within 24h of scheduled slot time.
 */

import type { Db } from "mongodb"
import { ObjectId } from "mongodb"

export interface TrainingSlot {
  dayOfWeek: number // 0 = Sun, 6 = Sat
  time: string // "HH:mm" 24h
  // Optional: which group this slot was sourced from (if any)
  sourceGroupId?: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_MS = DAY_MS // 24-hour window to log after slot

/**
 * Get the date of the most recent occurrence of a given dayOfWeek before or at a reference date.
 */
function getLastOccurrenceOfDay(refDate: Date, dayOfWeek: number): Date {
  const d = new Date(refDate)
  const currentDay = d.getUTCDay()
  let diff = currentDay - dayOfWeek
  if (diff < 0) diff += 7
  d.setUTCDate(d.getUTCDate() - diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Parse "HH:mm" into hours and minutes.
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number)
  return { hours: h ?? 0, minutes: m ?? 0 }
}

/**
 * Create a slot instance (exact datetime) for a given date and slot config.
 */
function slotInstanceForDate(date: Date, slot: TrainingSlot): Date {
  const { hours, minutes } = parseTime(slot.time)
  const d = new Date(date)
  d.setUTCHours(hours, minutes, 0, 0)
  return d
}

/**
 * Generate slot instances going backward from refDate for up to maxWeeks.
 * Returns array of { slotTime: Date, dayOfWeek, time } in reverse chronological order.
 */
function getSlotInstances(
  slots: TrainingSlot[],
  refDate: Date,
  maxWeeks = 52
): { slotTime: Date; dayOfWeek: number; time: string }[] {
  const result: { slotTime: Date; dayOfWeek: number; time: string }[] = []
  const now = new Date(refDate)

  for (let week = 0; week < maxWeeks; week++) {
    const weekStart = new Date(now)
    weekStart.setUTCDate(weekStart.getUTCDate() - week * 7)
    for (const slot of slots) {
      const occurrenceDate = getLastOccurrenceOfDay(weekStart, slot.dayOfWeek)
      const slotTime = slotInstanceForDate(occurrenceDate, slot)
      if (slotTime <= now) {
        result.push({
          slotTime,
          dayOfWeek: slot.dayOfWeek,
          time: slot.time,
        })
      }
    }
  }

  result.sort((a, b) => b.slotTime.getTime() - a.slotTime.getTime())
  return result
}

/**
 * Check if a log timestamp falls within the 24h window after a slot.
 */
function logMatchesSlot(logTimestamp: Date, slotTime: Date): boolean {
  const logMs = logTimestamp.getTime()
  const slotMs = slotTime.getTime()
  return logMs >= slotMs && logMs <= slotMs + WINDOW_MS
}

/**
 * Check if a skip record matches a slot instance (same date and slot config).
 */
function skipMatchesSlot(
  skip: { date: Date; dayOfWeek: number; scheduledTime: string },
  slotTime: Date,
  dayOfWeek: number,
  time: string
): boolean {
  const skipDateStr = skip.date.toISOString().slice(0, 10)
  const slotDateStr = slotTime.toISOString().slice(0, 10)
  return (
    skipDateStr === slotDateStr &&
    skip.dayOfWeek === dayOfWeek &&
    skip.scheduledTime === time
  )
}

export interface StreakResult {
  streak: number
  totalLogs: number
}

export async function computeStreak(
  db: Db,
  userId: string,
  trainingSlots: TrainingSlot[],
  timezone = "UTC"
): Promise<StreakResult> {
  const totalLogs = await db
    .collection("logs")
    .countDocuments({ userId })

  if (!trainingSlots || trainingSlots.length === 0) {
    return { streak: 0, totalLogs }
  }

  const now = new Date()
  const slotInstances = getSlotInstances(trainingSlots, now)

  const logs = await db
    .collection("logs")
    .find({ userId })
    .project({ timestamp: 1 })
    .sort({ timestamp: 1 })
    .toArray()

  const skips = await db
    .collection("skippedDays")
    .find({ userId })
    .toArray()

  const skipRecords = skips.map((s) => ({
    date: s.date instanceof Date ? s.date : new Date(s.date),
    dayOfWeek: s.dayOfWeek,
    scheduledTime: s.scheduledTime,
  }))

  // Streak = consecutive calendar days (one day = one point, even with multiple slots)
  const trainingDayOfWeeks = [...new Set(trainingSlots.map((s) => s.dayOfWeek))]
  let streak = 0
  let iterDate = new Date(now)
  iterDate.setUTCHours(23, 59, 59, 999)

  for (let i = 0; i < 365; i++) {
    const dayOfWeek = iterDate.getUTCDay()
    if (!trainingDayOfWeeks.includes(dayOfWeek)) {
      iterDate.setUTCDate(iterDate.getUTCDate() - 1)
      continue
    }

    const occurrenceDate = getLastOccurrenceOfDay(iterDate, dayOfWeek)
    const slotsOnDay = trainingSlots.filter((s) => s.dayOfWeek === dayOfWeek)
    let dayHit = false
    for (const slot of slotsOnDay) {
      const slotTime = slotInstanceForDate(occurrenceDate, slot)
      if (slotTime > now) continue
      const hasLog = logs.some((l) => {
        const logTs = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
        return logMatchesSlot(logTs, slotTime)
      })
      const hasSkip = skipRecords.some((s) =>
        skipMatchesSlot(s, slotTime, dayOfWeek, slot.time)
      )
      if (hasLog || hasSkip) {
        dayHit = true
        break
      }
    }
    if (dayHit) {
      streak++
    } else {
      break
    }
    iterDate.setUTCDate(iterDate.getUTCDate() - 1)
  }

  return { streak, totalLogs }
}

export interface TodaySkipStatus {
  canSkipToday: boolean
  skipDisabledReason: "no_training" | "already_skipped" | "already_logged" | null
}

export async function computeTodaySkipStatus(
  db: Db,
  userId: string,
  trainingSlots: TrainingSlot[]
): Promise<TodaySkipStatus> {
  const now = new Date()
  const todayDay = now.getUTCDay()
  const todayDateStr = now.toISOString().slice(0, 10)

  const todaySlots = trainingSlots.filter((s) => s.dayOfWeek === todayDay)
  if (todaySlots.length === 0) {
    return { canSkipToday: false, skipDisabledReason: "no_training" }
  }

  const skips = await db
    .collection("skippedDays")
    .find({ userId, dayOfWeek: todayDay })
    .toArray()
  const skipDates = new Set(
    skips.map((s) => {
      const d = s.date instanceof Date ? s.date : new Date(s.date)
      return d.toISOString().slice(0, 10)
    })
  )
  if (skipDates.has(todayDateStr)) {
    return { canSkipToday: false, skipDisabledReason: "already_skipped" }
  }

  const logs = await db
    .collection("logs")
    .find({ userId })
    .project({ timestamp: 1 })
    .toArray()

  for (const slot of todaySlots) {
    const occurrenceDate = getLastOccurrenceOfDay(now, slot.dayOfWeek)
    const slotTime = slotInstanceForDate(occurrenceDate, slot)
    if (slotTime > now) continue
    const hasLog = logs.some((l) => {
      const logTs = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
      return logMatchesSlot(logTs, slotTime)
    })
    if (hasLog) {
      return { canSkipToday: false, skipDisabledReason: "already_logged" }
    }
  }

  return { canSkipToday: true, skipDisabledReason: null }
}

/**
 * Remove skip records for slots that the given log satisfies.
 * Call when user logs after having previously skipped.
 */
export async function removeRedundantSkipsForLog(
  db: Db,
  userId: string,
  logTimestamp: Date,
  trainingSlots: TrainingSlot[]
): Promise<void> {
  if (!trainingSlots?.length) return

  const logMs = logTimestamp.getTime()
  const slotInstances = getSlotInstances(trainingSlots, logTimestamp, 2)

  for (const { slotTime, dayOfWeek, time } of slotInstances) {
    if (!logMatchesSlot(logTimestamp, slotTime)) continue
    const slotDate = slotTime.toISOString().slice(0, 10)
    const slotStart = new Date(slotDate + "T00:00:00.000Z")
    const slotEnd = new Date(slotDate + "T23:59:59.999Z")
    await db.collection("skippedDays").deleteMany({
      userId,
      dayOfWeek,
      scheduledTime: time,
      date: { $gte: slotStart, $lte: slotEnd },
    })
  }
}
