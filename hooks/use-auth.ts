"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetcher } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"

export interface User {
  id: string
  email: string
  displayName: string | null
  role: string
  activeGroupId: string | null
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

export function useAuth() {
  const queryClient = useQueryClient()
  const { data, error, isLoading } = useQuery<{ user: User | null }>({
    queryKey: queryKeys.auth.session,
    queryFn: () => apiFetcher<{ user: User | null }>("/api/auth/session"),
  })

  return {
    user: data?.user ?? null,
    isLoading,
    isError: error,
    mutate: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.session }),
  }
}
