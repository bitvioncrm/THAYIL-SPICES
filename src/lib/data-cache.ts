/** Bump whenever farmers/entries/bills/payments change so list caches refresh. */
let generation = 0

export function bumpDataCache() {
  generation += 1
}

export function dataCacheGeneration() {
  return generation
}

type CacheEntry<T> = { gen: number; key: string; value: T }

let totalsCache: CacheEntry<Map<string, unknown>> | null = null
let overviewCache: CacheEntry<unknown> | null = null

export function readCached<T>(
  store: 'totals' | 'overview',
  key: string,
): T | null {
  const entry = store === 'totals' ? totalsCache : overviewCache
  if (!entry || entry.gen !== generation || entry.key !== key) return null
  return entry.value as T
}

export function writeCached<T>(store: 'totals' | 'overview', key: string, value: T) {
  const packed: CacheEntry<T> = { gen: generation, key, value }
  if (store === 'totals') totalsCache = packed as CacheEntry<Map<string, unknown>>
  else overviewCache = packed as CacheEntry<unknown>
}
