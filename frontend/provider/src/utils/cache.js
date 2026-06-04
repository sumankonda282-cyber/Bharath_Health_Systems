const DB_NAME = 'bh_provider_cache'
const DB_VERSION = 1
const STORE = 'cache'
const TTL_MS = 10 * 60 * 1000

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'key' })
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

async function cacheGet(key) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => {
        const row = req.result
        if (!row || Date.now() - row.ts > TTL_MS) { resolve(null); return }
        resolve(row.value)
      }
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

async function cacheSet(key, value) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ key, value, ts: Date.now() })
      tx.oncomplete = resolve
      tx.onerror = resolve
    })
  } catch {}
}

export async function cachedFetch(key, apiFn, onFresh) {
  const cached = await cacheGet(key)
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

export async function cacheClear() {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
  } catch {}
}

export async function cacheInvalidate(key) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
  } catch {}
}
