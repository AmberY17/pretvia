export function urlFetcher(key: string | readonly [string, ...unknown[]]) {
  const url = Array.isArray(key) ? key[0] : key;
  return fetch(url).then((r) => r.json());
}

import type { LogEntry } from "@/types/dashboard";

const LOGS_PAGE_SIZE = 20;

export async function logsInfiniteFetcher(
  key: readonly [string, ...unknown[]],
): Promise<{ logs: LogEntry[]; nextCursor: string | null }> {
  const baseUrl = key[0];
  const cursor = (key.length >= 3 ? key[2] : key[1]) as string | null;
  const separator = baseUrl.includes("?") ? "&" : "?";
  const limitParam = `${separator}limit=${LOGS_PAGE_SIZE}`;
  const url = cursor
    ? `${baseUrl}${limitParam}&cursor=${encodeURIComponent(cursor)}`
    : `${baseUrl}${limitParam}`;
  const data = await fetch(url).then((r) => r.json());
  return {
    logs: (data.logs ?? []) as LogEntry[],
    nextCursor: data.nextCursor ?? null,
  };
}
