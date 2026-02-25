import type { Db } from "mongodb"
import { ObjectId } from "mongodb"

export interface GroupTrainingSlot {
  dayOfWeek: number
  time: string
}

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

  const cursor = db
    .collection("users")
    .find({ $or: [{ groupIds: groupId }, { groupId }] })

  // eslint-disable-next-line no-await-in-loop
  for await (const user of cursor) {
    const currentSlots = Array.isArray(user.trainingSlots)
      ? (user.trainingSlots as { dayOfWeek: number; time: string; sourceGroupId?: string }[])
      : []

    let groupSlotIndex = 0
    const updatedSlots: { dayOfWeek: number; time: string; sourceGroupId?: string }[] = []
    for (const slot of currentSlots) {
      if (slot.sourceGroupId === groupId) {
        if (groupSlotIndex < template.length) {
          updatedSlots.push({
            dayOfWeek: template[groupSlotIndex].dayOfWeek,
            time: template[groupSlotIndex].time,
            sourceGroupId: groupId,
          })
          groupSlotIndex += 1
        }
      } else {
        updatedSlots.push(slot)
      }
    }
    for (let i = groupSlotIndex; i < template.length; i++) {
      updatedSlots.push({
        dayOfWeek: template[i].dayOfWeek,
        time: template[i].time,
        sourceGroupId: groupId,
      })
    }

    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { trainingSlots: updatedSlots } }
    )
  }
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
    ? (user.trainingSlots as { dayOfWeek: number; time: string; sourceGroupId?: string }[])
    : []

  // Preserve original order: replace group slots in place with template slots, keep custom slots where they are
  let groupSlotIndex = 0
  const updatedSlots: { dayOfWeek: number; time: string; sourceGroupId?: string }[] = []
  for (const slot of currentSlots) {
    if (slot.sourceGroupId === groupId) {
      if (groupSlotIndex < template.length) {
        updatedSlots.push({
          dayOfWeek: template[groupSlotIndex].dayOfWeek,
          time: template[groupSlotIndex].time,
          sourceGroupId: groupId,
        })
        groupSlotIndex += 1
      }
      // else template shrank, drop this group slot
    } else {
      updatedSlots.push(slot)
    }
  }
  for (let i = groupSlotIndex; i < template.length; i++) {
    updatedSlots.push({
      dayOfWeek: template[i].dayOfWeek,
      time: template[i].time,
      sourceGroupId: groupId,
    })
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { trainingSlots: updatedSlots } }
  )
}

