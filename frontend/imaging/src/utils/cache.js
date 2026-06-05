const DB_NAME = 'bh_imaging_cache'
const DB_VERSION = 1
// Bump CACHE_VERSION when API response shapes change — old entries are never read
const CACHE_VERSION = 1
const STORE = 'cache'

export const TTL = {
  SHORT:  10 * 60 * 1000,       // 10 min  — patient history, reports analytics, billing
  MEDIUM: 60 * 60 * 1000,       // 1 hour  — reference data
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'key' })
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

async function cacheGet(key, ttl) {
  try {
    const db = await openDB()
    return new Promise(resolve => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(`v${CACHE_VERSION}:${key}`)
      req.onsuccess = () => {
        const row = req.result
        if (!row || Date.now() - row.ts > ttl) { resolve(null); return }
        resolve(row.value)
      }
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

async function cacheSet(key, value) {
  try {
    const db = await openDB()
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ key: `v${CACHE_VERSION}:${key}`, value, ts: Date.now() })
      tx.oncomplete = resolve
      tx.onerror = resolve
    })
  } catch {}
}

// stale-while-revalidate
export async function cachedFetch(key, apiFn, onFresh, ttl = TTL.SHORT) {
  const cached = await cacheGet(key, ttl)
  if (cached) {
    onFresh(cached)
    apiFn().then(fresh => { cacheSet(key, fresh); onFresh(fresh) }).catch(() => {})
    return cached
  }
  const fresh = await apiFn()
  await cacheSet(key, fresh)
  onFresh(fresh)
  return fresh
}

// one-shot
export async function cachedGet(key, apiFn, ttl = TTL.SHORT) {
  const cached = await cacheGet(key, ttl)
  if (cached !== null) return cached
  const fresh = await apiFn()
  await cacheSet(key, fresh)
  return fresh
}

export async function cacheClear() {
  try {
    const db = await openDB()
    db.transaction(STORE, 'readwrite').objectStore(STORE).clear()
  } catch {}
}

export async function cacheInvalidate(key) {
  try {
    const db = await openDB()
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(\`v\${CACHE_VERSION}:\${key}\`)
  } catch {}
}
