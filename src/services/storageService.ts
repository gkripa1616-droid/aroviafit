import { DBProduct, DBCategory, DBOrder, DBPayment, DBReview, DEFAULT_TAXONOMY } from './supabaseBackend'

const DB_NAME = 'arovia_fit_idb'
const DB_VERSION = 1
const STORE_PRODUCTS = 'products'
const STORE_CATEGORIES = 'categories'
const STORE_PHOTOS = 'uploaded_photos'
const STORE_ORDERS = 'orders'

// In-memory cache for ultra-fast sync access
let memoryProducts: DBProduct[] | null = null
let memoryCategories: DBCategory[] | null = null

// Initialize or open IndexedDB
function openIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase
        if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
          db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
          db.createObjectStore(STORE_CATEGORIES, { keyPath: 'name' })
        }
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_ORDERS)) {
          db.createObjectStore(STORE_ORDERS, { keyPath: 'id' })
        }
      }

      request.onsuccess = (event: any) => {
        resolve(event.target.result as IDBDatabase)
      }

      request.onerror = (err) => {
        console.warn('IndexedDB open error, falling back to localStorage:', err)
        resolve(null)
      }
    } catch (e) {
      console.warn('IndexedDB exception:', e)
      resolve(null)
    }
  })
}

// ─── Broadcast Channel for Cross-Tab / Cross-Window Live Sync ────────────────
let broadcastChannel: BroadcastChannel | null = null
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('arovia_channel')
  } catch (e) {}
}

export function broadcastEvent(event: string, payload?: any) {
  if (typeof window === 'undefined') return
  try {
    broadcastChannel?.postMessage({ event, payload, timestamp: Date.now() })
    window.dispatchEvent(new CustomEvent(event, { detail: payload }))
  } catch (e) {}
}

export function onBroadcastEvent(event: string, callback: (payload?: any) => void) {
  if (typeof window === 'undefined') return () => {}

  const handleCustom = (e: any) => {
    callback(e.detail)
  }
  window.addEventListener(event, handleCustom)

  const handleChannel = (msg: MessageEvent) => {
    if (msg.data && msg.data.event === event) {
      callback(msg.data.payload)
    }
  }
  broadcastChannel?.addEventListener('message', handleChannel)

  return () => {
    window.removeEventListener(event, handleCustom)
    broadcastChannel?.removeEventListener('message', handleChannel)
  }
}

// Helper to sanitize corrupt/truncated image data
export function sanitizeProduct(p: DBProduct): DBProduct {
  const isCorrupted = (str?: string) => Boolean(str && str.startsWith('data:') && str.length < 200)
  const validImgs = (p.images || []).filter(u => u && !isCorrupted(u))
  const validImgId = p.imgId && !isCorrupted(p.imgId) ? p.imgId : (validImgs[0] || '')
  return {
    ...p,
    imgId: validImgId,
    images: validImgs.length > 0 ? validImgs : (validImgId ? [validImgId] : [])
  }
}

// ─── Products Storage ────────────────────────────────────────────────────────
export async function getStoredProducts(): Promise<DBProduct[]> {
  // 1. Try IndexedDB first (source of truth for large data / images, unlimited storage)
  const db = await openIndexedDB()
  if (db) {
    try {
      const prods: DBProduct[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PRODUCTS, 'readonly')
        const store = tx.objectStore(STORE_PRODUCTS)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => reject(req.error)
      })
      if (prods && prods.length > 0) {
        const sanitized = prods.map(sanitizeProduct)
        memoryProducts = sanitized
        // Ensure localStorage also has a lightweight sync copy
        safeSaveProductsToLocalStorage(sanitized)
        return sanitized
      }
    } catch (e) {
      console.warn('IndexedDB read products failed:', e)
    }
  }

  // 2. Try in-memory cache
  if (memoryProducts && memoryProducts.length > 0) {
    return memoryProducts.map(sanitizeProduct)
  }

  // 3. Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('arovia_products')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map(sanitizeProduct)
          memoryProducts = sanitized
          return sanitized
        }
      }
    } catch (e) {}
  }

  return memoryProducts || []
}

export function getSyncStoredProducts(fallback: DBProduct[]): DBProduct[] {
  if (memoryProducts && memoryProducts.length > 0) {
    return memoryProducts.map(sanitizeProduct)
  }
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('arovia_products')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map(sanitizeProduct)
          memoryProducts = sanitized
          return sanitized
        }
      }
    } catch (e) {}
  }
  const cleanFallback = fallback.map(sanitizeProduct)
  memoryProducts = cleanFallback
  return cleanFallback
}

export async function saveStoredProducts(products: DBProduct[]): Promise<void> {
  const cleanProducts = products.map(sanitizeProduct)
  memoryProducts = cleanProducts

  // 1. Save to IndexedDB (Supports 100s of MBs, never throws QuotaExceeded)
  const db = await openIndexedDB()
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PRODUCTS, 'readwrite')
        const store = tx.objectStore(STORE_PRODUCTS)
        store.clear()
        cleanProducts.forEach(p => store.put(p))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.warn('IndexedDB save products error:', e)
    }
  }

  // 2. Safely sync to localStorage (resilient to 5MB quota)
  safeSaveProductsToLocalStorage(cleanProducts)

  // 3. Notify all open tabs & components
  broadcastEvent('arovia_products_updated', cleanProducts)
}

function safeSaveProductsToLocalStorage(products: DBProduct[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('arovia_products', JSON.stringify(products))
  } catch (e: any) {
    // If quota exceeded, save a lightweight version with cover image only so localStorage never goes stale!
    try {
      const lightweight = products.map(p => ({
        ...p,
        images: p.imgId ? [p.imgId] : []
      }))
      localStorage.setItem('arovia_products', JSON.stringify(lightweight))
    } catch (err) {
      console.warn('localStorage full even for lightweight version, IndexedDB retains complete data')
    }
  }
}

// ─── Categories Storage ──────────────────────────────────────────────────────
export async function getStoredCategories(): Promise<DBCategory[]> {
  if (memoryCategories && memoryCategories.length > 0) {
    return memoryCategories
  }

  const db = await openIndexedDB()
  if (db) {
    try {
      const cats: DBCategory[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CATEGORIES, 'readonly')
        const store = tx.objectStore(STORE_CATEGORIES)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => reject(req.error)
      })
      if (cats && cats.length > 0) {
        memoryCategories = cats
        return cats
      }
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('arovia_categories')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCategories = parsed
          return parsed
        }
      }
    } catch (e) {}
  }

  return DEFAULT_TAXONOMY
}

export function getSyncStoredCategories(): DBCategory[] {
  if (memoryCategories && memoryCategories.length > 0) return memoryCategories
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('arovia_categories')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCategories = parsed
          return parsed
        }
      }
    } catch (e) {}
  }
  return DEFAULT_TAXONOMY
}

export async function saveStoredCategories(categories: DBCategory[]): Promise<void> {
  memoryCategories = categories

  const db = await openIndexedDB()
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_CATEGORIES, 'readwrite')
        const store = tx.objectStore(STORE_CATEGORIES)
        store.clear()
        categories.forEach(c => store.put(c))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('arovia_categories', JSON.stringify(categories))
    } catch (e) {}
  }

  broadcastEvent('arovia_categories_updated', categories)
}
