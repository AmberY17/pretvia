import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

export async function GET() {
  try {
    const db = await getDb()
    const doc = await db.collection("siteSettings").findOne({ key: "site" })
    return NextResponse.json({
      eggForgotPassword: doc?.eggForgotPassword ?? false,
      eggSlotMachineEmoji: doc?.eggSlotMachineEmoji ?? false,
      eggRunawayTrash: doc?.eggRunawayTrash ?? false,
    })
  } catch (err) {
    console.error("GET /api/auth/egg:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
