import type { Db } from "mongodb"
import { ObjectId } from "mongodb"
import type { TrainingSlot } from "@/types/dashboard"

export type GroupTrainingSlot = TrainingSlot

type StoredSlot = { dayOfWeek: number; time: string; sourceGroupId?: string; addedAt?: Date; removedAt?: Date }

function normalizeSlot(slot: { dayOfWeek: number; time: string }): GroupTrainingSlot {
  const t = String(slot.time).trim()
  const match = t.match(/^(\d{1,2}):(\d{2})$/)
  const time = match ? `${match[1].padStart(2, "0")}:${match[2]}` : "09:00"

  return {
    dayOfWeek: Math.max(0, Math.min(6, Number(slot.dayOfWeek) || 0)),
    time,
  }
}

export function normalizeGroupTrainingSchedule(
  slots: { dayOfWeek: number; time: string }[] | unknown
): GroupTrainingSlot[] {
  if (!Array.isArray(slots)) return []
  return slots.map((s) =>
    normalizeSlot({
      dayOfWeek: (s as { dayOfWeek: number }).dayOfWeek,
      time: (s as { time: string }).time,
    })
  )
}

export async function applyGroupTrainingScheduleToAllMembers(
  db: Db,
  groupId: string,
  template: GroupTrainingSlot[]
) {
  if (!template.length) return

  const members = await db
    .collection("users")
    .find({ $or: [{ groupIds: groupId }, { groupId }] })
    .project({ _id: 1, trainingSlots: 1, deletedSlots: 1 })
    .toArray()

  if (!members.length) return

  const now = new Date()
  const templateKeys = new Set(template.map((t) => `${t.dayOfWeek}:${t.time}`))

  const bulkOps = members.map((user) => {
    const currentSlots = Array.isArray(user.trainingSlots)
      ? (user.trainingSlots as StoredSlot[])
      : []
    const existingDeleted = Array.isArray(user.deletedSlots)
      ? (user.deletedSlots as StoredSlot[])
      : []
    const existingByKey = new Map(currentSlots.map((s) => [`${s.dayOfWeek}:${s.time}`, s]))

    const customSlots = currentSlots.filter(
      (s) => !s.sourceGroupId || s.sourceGroupId !== groupId
    )

    const groupSlots = template.map((t) => {
      const existing = existingByKey.get(`${t.dayOfWeek}:${t.time}`)
      return {
        dayOfWeek: t.dayOfWeek,
        time: t.time,
        sourceGroupId: groupId,
        addedAt: existing?.addedAt ?? now,
      }
    })

    const updatedSlots = [...customSlots, ...groupSlots]

    const nowDeleted = currentSlots
      .filter((s) => s.sourceGroupId === groupId && !templateKeys.has(`${s.dayOfWeek}:${s.time}`))
      .map((s) => ({ ...s, removedAt: now }))
    const updatedDeletedSlots = [...existingDeleted, ...nowDeleted]

    return {
      updateOne: {
        filter: { _id: user._id },
        update: { $set: { trainingSlots: updatedSlots, deletedSlots: updatedDeletedSlots } },
      },
    }
  })

  await db.collection("users").bulkWrite(bulkOps, { ordered: false })
}

export async function applyGroupTrainingScheduleToUser(
  db: Db,
  userId: string,
  groupId: string,
  template: GroupTrainingSlot[]
) {
  if (!template.length) return

  const user = await db.collection("users").findOne({
    _id: new ObjectId(userId),
  })
  if (!user) return

  const currentSlots = Array.isArray(user.trainingSlots)
    ? (user.trainingSlots as StoredSlot[])
    : []
  const existingDeleted = Array.isArray(user.deletedSlots)
    ? (user.deletedSlots as StoredSlot[])
    : []
  const existingByKey = new Map(currentSlots.map((s) => [`${s.dayOfWeek}:${s.time}`, s]))
  const now = new Date()
  const templateKeys = new Set(template.map((t) => `${t.dayOfWeek}:${t.time}`))

  const customSlots = currentSlots.filter(
    (s) => !s.sourceGroupId || s.sourceGroupId !== groupId
  )

  const groupSlots = template.map((t) => {
    const existing = existingByKey.get(`${t.dayOfWeek}:${t.time}`)
    return {
      dayOfWeek: t.dayOfWeek,
      time: t.time,
      sourceGroupId: groupId,
      addedAt: existing?.addedAt ?? now,
    }
  })

  const updatedSlots = [...customSlots, ...groupSlots]

  const nowDeleted = currentSlots
    .filter((s) => s.sourceGroupId === groupId && !templateKeys.has(`${s.dayOfWeek}:${s.time}`))
    .map((s) => ({ ...s, removedAt: now }))
  const updatedDeletedSlots = [...existingDeleted, ...nowDeleted]

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { trainingSlots: updatedSlots, deletedSlots: updatedDeletedSlots } }
  )
}

