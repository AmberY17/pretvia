import { NextResponse } from "next/server"

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess<T extends Record<string, unknown>>(data: T) {
  return NextResponse.json(data)
}
