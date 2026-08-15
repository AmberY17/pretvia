"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetcher } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"
import type { User } from "@/types/dashboard"

export type { User }

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
