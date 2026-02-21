export function urlFetcher(key: string | readonly [string, ...unknown[]]) {
  const url = Array.isArray(key) ? key[0] : key;
  return fetch(url).then((r) => r.json());
}
