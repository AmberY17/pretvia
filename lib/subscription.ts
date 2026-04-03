import type { Db } from "mongodb"
import { ObjectId } from "mongodb"
import type { CoachSubscription } from "@/types/dashboard"

const PLAN_LIMITS = {
  squad: { groups: 1, coachSeats: 0 },
  varsity: { groups: Infinity, coachSeats: 0 },
  club: { groups: 10, coachSeats: 3 },
} as const

export function getEffectiveLimits(sub: CoachSubscription) {
  if (sub.isAssistant) return { groups: 0, coachSeats: 0 }
  const base = PLAN_LIMITS[sub.plan]
  return {
    groups: base.groups === Infinity ? Infinity : base.groups + sub.addOnGroups * 5,
    coachSeats: base.coachSeats + sub.addOnSeats * 3,
  }
}

const DEFAULT_SUBSCRIPTION: CoachSubscription = {
  plan: "squad",
  isAssistant: false,
  addOnGroups: 0,
  addOnSeats: 0,
}

export async function getUserSubscription(
  db: Db,
  userId: string
): Promise<CoachSubscription> {
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) }, { projection: { subscription: 1 } })
  if (!user?.subscription) return DEFAULT_SUBSCRIPTION
  return {
    plan: user.subscription.plan ?? "squad",
    isAssistant: user.subscription.isAssistant ?? false,
    addOnGroups: user.subscription.addOnGroups ?? 0,
    addOnSeats: user.subscription.addOnSeats ?? 0,
  }
}
