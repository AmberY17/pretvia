import { QueryClient } from "@tanstack/react-query";

export async function apiFetcher<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

const LOGS_PAGE_SIZE = 20;

export async function logsFetcher<T = unknown>(url: string, cursor: string | null): Promise<{ logs: T[]; nextCursor: string | null }> {
  const separator = url.includes("?") ? "&" : "?";
  const limitParam = `${separator}limit=${LOGS_PAGE_SIZE}`;
  const fullUrl = cursor
    ? `${url}${limitParam}&cursor=${encodeURIComponent(cursor)}`
    : `${url}${limitParam}`;
  const data = await fetch(fullUrl).then((r) => r.json());
  return {
    logs: (data.logs ?? []) as T[],
    nextCursor: data.nextCursor ?? null,
  };
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}
