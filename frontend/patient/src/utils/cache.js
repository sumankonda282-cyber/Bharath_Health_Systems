/**
 * Patient portal — Level 2 IndexedDB cache
 * Caches: appointments, prescriptions, lab results, bills, timeline, profile
 * Real-time: new bookings, payments (not cached)
 * TTL: 10 minutes — stale data served while fresh fetch happens in background
 */

const DB_NAME = 'bh_patient_cache'
const DB_VERSION = 1
const TTL_MS = 10 * 60 * 1000 // 10 minutes

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function cacheSet(key, data) {
  try {
    const db = await openDB()
    const tx = db.transaction('cache', 'readwrite')
    tx.objectStore('cache').put({ key, data, ts: Date.now() })
    await new Promise(r => { tx.oncomplete = r; tx.onerror = r })
    db.close()
  } catch {}
}

export async function cacheGet(key) {
  try {
    const db = await openDB()
    const tx = db.transaction('cache', 'readonly')
    const req = tx.objectStore('cache').get(key)
    const result = await new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    })
    db.close()
    if (!result) return null
    if (Date.now() - result.ts > TTL_MS) return null // expired
    return result.data
  } catch { return null }
}

export async function cacheClear() {
  try {
    const db = await openDB()
    const tx = db.transaction('cache', 'readwrite')
    tx.objectStore('cache').clear()
    db.close()
  } catch {}
}

/**
 * Stale-while-revalidate fetch:
 * 1. Return cached data immediately (instant UI)
 * 2. Fetch fresh data in background
 * 3. Call onFresh(data) when fresh data arrives
 */
export async function cachedFetch(key, apiFn, onFresh) {
  const cached = await cacheGet(key)
  if (cached) {
    onFresh(cached) // show cached immediately
    // revalidate in background
    apiFn().then(fresh => {
      cacheSet(key, fresh)
      onFresh(fresh)
    }).catch(() => {})
    return cached
  }
  // no cache — fetch and store
  try {
    const fresh = await apiFn()
    await cacheSet(key, fresh)
    onFresh(fresh)
    return fresh
  } catch (err) {
    throw err
  }
}
