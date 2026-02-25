export function urlFetcher(key: string | readonly [string, ...unknown[]]) {
  const url = Array.isArray(key) ? key[0] : key;
  return fetch(url).then((r) => r.json());
}

const LOGS_PAGE_SIZE = 20;

export async function logsInfiniteFetcher(
  key: readonly [string, string | null],
): Promise<{ logs: unknown[]; nextCursor: string | null }> {
  const [baseUrl, cursor] = key;
  const separator = baseUrl.includes("?") ? "&" : "?";
  const limitParam = `${separator}limit=${LOGS_PAGE_SIZE}`;
  const url = cursor
    ? `${baseUrl}${limitParam}&cursor=${encodeURIComponent(cursor)}`
    : `${baseUrl}${limitParam}`;
  const data = await fetch(url).then((r) => r.json());
  return {
    logs: data.logs ?? [],
    nextCursor: data.nextCursor ?? null,
  };
}
