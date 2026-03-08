"use client"

import useSWR from "swr"

export interface User {
  id: string
  email: string
  displayName: string | null
  role: string
  groupId: string | null
  group: {
    id: string
    name: string
    code: string
    coachId: string
  } | null
  groups: {
    id: string
    name: string
    code: string
    coachId: string
  }[]
  groupIds: string[]
  profileComplete: boolean
  profileEmoji: string | null
  trainingSlots: { dayOfWeek: number; time: string; sourceGroupId?: string }[]
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error ?? "Request failed")
  return data
}

export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR<{ user: User | null }>(
    "/api/auth/session",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    user: data?.user ?? null,
    isLoading,
    isError: error,
    mutate,
  }
}
