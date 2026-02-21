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
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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
