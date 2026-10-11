import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Parse a response, throwing HttpError on non-2xx. A 401 means the session expired: go to login. */
async function readResponse(r: Response): Promise<unknown> {
  // Error pages from the platform (502/504) are HTML, not JSON.
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
      window.location.href = "/auth";
    }
    throw new HttpError((data as { error?: string } | null)?.error ?? "Request failed", r.status);
  }
  return data;
}

export async function apiFetcher<T>(url: string): Promise<T> {
  return (await readResponse(await fetch(url))) as T;
}

const LOGS_PAGE_SIZE = 20;

export async function logsFetcher<T = unknown>(url: string, cursor: string | null): Promise<{ logs: T[]; nextCursor: string | null }> {
  const separator = url.includes("?") ? "&" : "?";
  const limitParam = `${separator}limit=${LOGS_PAGE_SIZE}`;
  const fullUrl = cursor
    ? `${url}${limitParam}&cursor=${encodeURIComponent(cursor)}`
    : `${url}${limitParam}`;
  const data = (await readResponse(await fetch(fullUrl))) as { logs?: T[]; nextCursor?: string | null };
  return {
    logs: data.logs ?? [],
    nextCursor: data.nextCursor ?? null,
  };
}

export function makeQueryClient() {
  return new QueryClient({
    // One place to tell users a load failed (instead of silently showing empty data).
    // 4xx responses are expected states that pages handle themselves (e.g. club upsell on 403).
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (error instanceof HttpError && error.status < 500) return;
        toast.error("Couldn't load some data.", {
          id: query.queryHash,
          action: { label: "Retry", onClick: () => void query.fetch() },
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}
