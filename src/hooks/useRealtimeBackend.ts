import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured, getOrCreateSessionId } from '../lib/supabase'
import {
  DBProduct,
  DBReview,
  DBOrder,
  DBPayment,
  DBCategory,
  DEFAULT_TAXONOMY,
  fetchProductsFromDB,
  fetchReviewsFromDB,
  fetchCartFromDB,
  fetchWishlistFromDB,
  fetchOrdersFromDB,
  fetchPaymentsFromDB,
  submitReviewToDB,
  syncCartItemToDB,
  clearCartFromDB,
  toggleWishlistItemDB,
  createOrderInDB,
  createPaymentRecordInDB,
  updateOrderStatusInDB,
  createOrUpdateProductInDB,
  deleteProductFromDB,
  bulkCreateProductsInDB,
  deleteReviewFromDB,
  deleteOrderFromDB,
  refundPaymentInDB,
  updateProductStockInDB,
  bulkUpdateCategoryInDB,
  bulkUpdateBadgeInDB,
  bulkUpdatePriceInDB,
  bulkDeleteProductsInDB,
  bulkAttachImagesInDB,
  fetchCategoriesFromDB,
  saveCategoriesToDB,
  deleteCategoryFromDB
} from '../services/supabaseBackend'
import {
  getStoredProducts,
  getSyncStoredProducts,
  saveStoredProducts,
  getStoredCategories,
  getSyncStoredCategories,
  saveStoredCategories,
  onBroadcastEvent,
  sanitizeProduct,
  mergeProductsPreservingImages
} from '../services/storageService'
import { bookBlitzshipShipment } from '../services/blitzshipService'

export function useRealtimeBackend(initialProducts: DBProduct[], initialReviews: DBReview[]) {
  const [categories, setCategories] = useState<DBCategory[]>(() => {
    const baseCats = getSyncStoredCategories()
    const initialProds = getSyncStoredProducts(initialProducts)
    const catMap = new Map<string, Set<string>>()
    baseCats.forEach(c => catMap.set(c.name.toLowerCase(), new Set(c.subCategories || [])))
    initialProds.forEach(p => {
      if (p.category) {
        const lower = p.category.toLowerCase()
        const sub = (p.subCategory || p.sub_category || '').trim()
        if (!catMap.has(lower)) {
          catMap.set(lower, new Set(sub ? [sub] : []))
          baseCats.push({ name: p.category, subCategories: sub ? [sub] : [] })
        } else if (sub) {
          const subs = catMap.get(lower)!
          if (!subs.has(sub)) {
            subs.add(sub)
            const target = baseCats.find(c => c.name.toLowerCase() === lower)
            if (target) target.subCategories.push(sub)
          }
        }
      }
    })
    return baseCats
  })

  const [products, setProducts] = useState<DBProduct[]>(() => {
    return getSyncStoredProducts(initialProducts)
  })

  const [reviews, setReviews] = useState<DBReview[]>(initialReviews)
  const [cartItems, setCartItems] = useState<{ productId: number; size: string; color: string; qty: number }[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('arovia_cart_items')
        if (saved) return JSON.parse(saved)
      } catch (e) {
        console.error('Error loading cart from localStorage:', e)
      }
    }
    return []
  })
  const [wishlistIds, setWishlistIds] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('arovia_wishlist_ids')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            // Clear old hardcoded default [1, 5] if present
            if (parsed.length === 2 && parsed.includes(1) && parsed.includes(5)) {
              localStorage.setItem('arovia_wishlist_ids', JSON.stringify([]))
              return []
            }
            return parsed
          }
        }
      } catch (e) {}
    }
    return []
  })
  const [orders, setOrders] = useState<DBOrder[]>([])
  const [payments, setPayments] = useState<DBPayment[]>([])
  const [activityLog, setActivityLog] = useState<{ id: string; text: string; time: string }[]>([])

  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<string>('')

  const configured = isSupabaseConfigured()

  const logActivity = (text: string) => {
    const logItem = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      time: new Date().toLocaleTimeString()
    }
    setActivityLog(prev => [logItem, ...prev.slice(0, 25)])
  }

  // Asynchronous IndexedDB recovery on startup & cross-tab live synchronization
  useEffect(() => {
    let isMounted = true

    async function loadStorage() {
      const idbProds = await getStoredProducts()
      if (isMounted && idbProds && idbProds.length > 0) {
        setProducts(idbProds)
      }
      const idbCats = await getStoredCategories()
      if (isMounted && idbCats && idbCats.length > 0) {
        setCategories(idbCats)
      }
    }
    loadStorage()

    const unsubProducts = onBroadcastEvent('arovia_products_updated', (prods) => {
      if (Array.isArray(prods)) {
        setProducts(prev => mergeProductsPreservingImages(prev, prods))
      }
    })
    const unsubCategories = onBroadcastEvent('arovia_categories_updated', (cats) => {
      if (Array.isArray(cats)) setCategories(cats)
    })

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'arovia_products' && e.newValue) {
        try {
          const incoming = JSON.parse(e.newValue)
          if (Array.isArray(incoming)) {
            setProducts(prev => mergeProductsPreservingImages(prev, incoming))
          }
        } catch (err) {}
      }
      if (e.key === 'arovia_categories' && e.newValue) {
        try {
          setCategories(JSON.parse(e.newValue))
        } catch (err) {}
      }
      if (e.key === 'arovia_cart_items' && e.newValue) {
        try {
          setCartItems(JSON.parse(e.newValue))
        } catch (err) {}
      }
      if (e.key === 'arovia_wishlist_ids' && e.newValue) {
        try {
          setWishlistIds(JSON.parse(e.newValue))
        } catch (err) {}
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      isMounted = false
      unsubProducts()
      unsubCategories()
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Initial Load from Supabase
  useEffect(() => {
    if (!configured) return

    let isMounted = true

    async function loadData() {
      // First ensure we have the latest local/IndexedDB products
      const localStoredProds = await getStoredProducts()
      const dbProds = await fetchProductsFromDB()

      if (dbProds && dbProds.length > 0 && isMounted) {
        setProducts(prev => {
          // Priority to local products if they exist, or merge dbProds
          const map = new Map<number, DBProduct>()
          // 1. Put dbProds
          dbProds.forEach(p => map.set(Number(p.id), p))
          // 2. Put localStoredProds over dbProds (local changes take priority, preserving images)
          if (localStoredProds && localStoredProds.length > 0) {
            localStoredProds.forEach(p => {
              const existing = map.get(Number(p.id))
              map.set(Number(p.id), existing ? mergeProductsPreservingImages([existing], [p])[0] : p)
            })
          }
          // 3. Put current prev state over dbProds, preserving rich galleries
          prev.forEach(p => {
            const existing = map.get(Number(p.id))
            map.set(Number(p.id), existing ? mergeProductsPreservingImages([existing], [p])[0] : p)
          })

          const merged = Array.from(map.values())
          saveStoredProducts(merged)
          return merged
        })
      }

      const dbCats = await fetchCategoriesFromDB()
      if (dbCats && dbCats.length > 0 && isMounted) {
        setCategories(prev => {
          const map = new Map<string, DBCategory>()
          dbCats.forEach(c => map.set(c.name.toLowerCase(), c))
          prev.forEach(c => {
            if (!map.has(c.name.toLowerCase())) {
              map.set(c.name.toLowerCase(), c)
            } else {
              // Merge subcategories
              const existing = map.get(c.name.toLowerCase())!
              const allSubs = Array.from(new Set([...existing.subCategories, ...c.subCategories]))
              map.set(c.name.toLowerCase(), { ...existing, subCategories: allSubs })
            }
          })
          const mergedCats = Array.from(map.values())
          saveStoredCategories(mergedCats)
          return mergedCats
        })
      }

      const dbRevs = await fetchReviewsFromDB()
      if (dbRevs && dbRevs.length > 0 && isMounted) {
        setReviews(dbRevs)
      }

      const dbCart = await fetchCartFromDB()
      if (dbCart && dbCart.length > 0 && isMounted) {
        const formattedCart = dbCart.map(c => ({ productId: c.product_id, size: c.size, color: c.color, qty: c.qty }))
        setCartItems(formattedCart)
        try {
          localStorage.setItem('arovia_cart_items', JSON.stringify(formattedCart))
        } catch (e) {}
      }

      const dbWish = await fetchWishlistFromDB()
      if (dbWish && isMounted) {
        setWishlistIds(dbWish)
        try {
          localStorage.setItem('arovia_wishlist_ids', JSON.stringify(dbWish))
        } catch (e) {}
      }

      const dbOrders = await fetchOrdersFromDB()
      if (dbOrders && isMounted) {
        setOrders(dbOrders)
      }

      const dbPayments = await fetchPaymentsFromDB()
      if (dbPayments && isMounted) {
        setPayments(dbPayments)
      }

      if (isMounted) {
        setIsConnected(true)
        logActivity('Supabase Realtime connected')
      }
    }

    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setIsConnected(true)
      }
    }, 2500)

    loadData().finally(() => {
      if (isMounted) {
        clearTimeout(fallbackTimer)
        setIsConnected(true)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(fallbackTimer)
    }
  }, [configured])

  // Realtime Subscriptions via WebSockets
  useEffect(() => {
    if (!configured || !supabase) return

    const channel = supabase.channel('realtime_arovia_fit')

    // Listen for live Product changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      (payload) => {
        setLastRealtimeEvent(`Product updated live: ${payload.eventType}`)
        logActivity(`Product ${payload.eventType} live`)
        if (payload.eventType === 'DELETE') {
          const oldId = Number((payload.old as any)?.id)
          if (oldId) setProducts(prev => prev.filter(p => p.id !== oldId))
        } else if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const newP = payload.new as any
          const formatted: DBProduct = {
            id: Number(newP.id),
            name: newP.name,
            price: Number(newP.price),
            mrp: Number(newP.mrp),
            rating: Number(newP.rating),
            reviews: Number(newP.reviews),
            badge: newP.badge || '',
            imgId: newP.img_id,
            images: Array.isArray(newP.images) ? newP.images : [],
            colors: Array.isArray(newP.colors) ? newP.colors : [],
            category: newP.category,
            subCategory: newP.sub_category || newP.subCategory || '',
            sub_category: newP.sub_category || newP.subCategory || '',
            description: newP.description || '',
            stock: newP.stock ?? 100
          }
          setProducts(prev => {
            const idx = prev.findIndex(p => p.id === formatted.id)
            if (idx >= 0) {
              const updated = [...prev]
              updated[idx] = formatted
              return updated
            }
            return [...prev, formatted]
          })
        }
      }
    )

    // Listen for live Review submissions
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reviews' },
      (payload) => {
        setLastRealtimeEvent('New Review added live!')
        logActivity('New customer review received live')
        const newR = payload.new as any
        const rev: DBReview = {
          id: newR.id,
          product_id: newR.product_id ? Number(newR.product_id) : undefined,
          product_name: newR.product_name,
          name: newR.name,
          text: newR.text,
          rating: Number(newR.rating),
          created_at: newR.created_at
        }
        setReviews(prev => [rev, ...prev])
      }
    )

    // Listen for live Orders (Admin & Customer)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        setLastRealtimeEvent('Order updated live!')
        logActivity(`Order ${payload.eventType} live: ID #${(payload.new as any)?.id?.substring(0, 6) || ''}`)
        fetchOrdersFromDB().then(dbOrders => {
          if (dbOrders) setOrders(dbOrders)
        })
      }
    )

    // Listen for live Payments (Razorpay Realtime)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments' },
      (payload) => {
        setLastRealtimeEvent('Payment captured live!')
        logActivity(`Payment captured live: ₹${(payload.new as any)?.amount} via ${(payload.new as any)?.payment_method?.toUpperCase()}`)
        fetchPaymentsFromDB().then(dbPayments => {
          if (dbPayments) setPayments(dbPayments)
        })
      }
    )

    // Listen for live Cart changes
    const sessionId = getOrCreateSessionId()
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cart_items', filter: `session_id=eq.${sessionId}` },
      async () => {
        setLastRealtimeEvent('Cart synced live')
        const freshCart = await fetchCartFromDB()
        if (freshCart) {
          setCartItems(freshCart.map(c => ({ productId: c.product_id, size: c.size, color: c.color, qty: c.qty })))
        }
      }
    )

    // Listen for live Wishlist changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wishlist', filter: `session_id=eq.${sessionId}` },
      async () => {
        setLastRealtimeEvent('Wishlist synced live')
        const freshWish = await fetchWishlistFromDB()
        if (freshWish) {
          setWishlistIds(freshWish)
        }
      }
    )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
      }
    })

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [configured])

  // Public helper methods
  const addReview = useCallback(async (productName: string, name: string, text: string, rating: number, productId?: number) => {
    const success = await submitReviewToDB({
      product_id: productId,
      product_name: productName,
      name,
      text,
      rating
    })
    if (!configured || !success) {
      setReviews(prev => [{ name, text, rating, product_name: productName, product_id: productId }, ...prev])
    }
    return success
  }, [configured])

  const syncCartItem = useCallback((productId: number, size: string, color: string, qty: number) => {
    setCartItems(prev => {
      let updated: { productId: number; size: string; color: string; qty: number }[]
      if (qty <= 0) {
        updated = prev.filter(i => !(Number(i.productId) === Number(productId) && i.size === size))
      } else {
        const existingIdx = prev.findIndex(i => Number(i.productId) === Number(productId) && i.size === size)
        if (existingIdx >= 0) {
          updated = [...prev]
          updated[existingIdx] = { ...updated[existingIdx], qty, color }
        } else {
          updated = [...prev, { productId: Number(productId), size, color, qty }]
        }
      }
      try {
        localStorage.setItem('arovia_cart_items', JSON.stringify(updated))
      } catch (e) {
        console.error('Error saving cart to localStorage:', e)
      }
      return updated
    })

    if (configured) {
      syncCartItemToDB(productId, size, color, qty)
    }
  }, [configured])

  const clearCart = useCallback(() => {
    setCartItems([])
    try {
      localStorage.removeItem('arovia_cart_items')
    } catch (e) {
      console.error('Error clearing cart in localStorage:', e)
    }
    if (configured) {
      clearCartFromDB()
    }
  }, [configured])

  const toggleWishlist = useCallback((productId: number, isWishlisted: boolean) => {
    setWishlistIds(prev => {
      const updated = isWishlisted ? (prev.includes(productId) ? prev : [...prev, productId]) : prev.filter(id => id !== productId)
      try {
        localStorage.setItem('arovia_wishlist_ids', JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
    if (configured) {
      toggleWishlistItemDB(productId, isWishlisted)
    }
  }, [configured])

  const placeOrder = useCallback(async (
    items: any[],
    subtotal: number,
    discount: number,
    shipping: number,
    total: number,
    customerName?: string,
    customerEmail?: string,
    shippingAddress?: string,
    customerPhone?: string,
    postalCode?: string,
    city?: string,
    state?: string
  ) => {
    const sessionId = getOrCreateSessionId()
    const orderId = configured ? await createOrderInDB({
      session_id: sessionId,
      items,
      subtotal,
      discount,
      shipping,
      total,
      customer_name: customerName || 'Guest Customer',
      customer_email: customerEmail || 'customer@aroviafit.com',
      customer_phone: customerPhone || '',
      shipping_address: shippingAddress || 'India',
      postal_code: postalCode || '',
      city: city || '',
      state: state || ''
    }) : null

    const finalOrderId = orderId || ('ORD-' + Math.floor(100000 + Math.random() * 900000))
    const initialAwb = 'BLZ' + Math.floor(10000000 + Math.random() * 90000000)

    const mockOrder: DBOrder = {
      id: finalOrderId,
      session_id: sessionId,
      items,
      subtotal,
      discount,
      shipping,
      total,
      status: 'Processing',
      payment_status: 'Paid',
      payment_id: 'pay_' + Math.random().toString(36).substring(2, 12),
      tracking_number: initialAwb,
      customer_name: customerName || 'Guest Customer',
      customer_email: customerEmail || 'customer@aroviafit.com',
      customer_phone: customerPhone || '',
      shipping_address: shippingAddress || 'India',
      postal_code: postalCode || '',
      city: city || '',
      state: state || '',
      created_at: new Date().toISOString()
    }
    setOrders(prev => [mockOrder, ...prev.filter(o => o.id !== finalOrderId)])

    // Asynchronously book with BlitzShipz Logistics Gateway
    bookBlitzshipShipment(mockOrder).then(booking => {
      if (booking && booking.awb_number) {
        setOrders(prev => prev.map(o => o.id === finalOrderId ? { ...o, tracking_number: booking.awb_number } : o))
        if (configured) {
          updateOrderStatusInDB(finalOrderId, 'Processing', 'Paid', booking.awb_number)
        }
        logActivity(`BlitzShipz EDI Manifest Created: AWB #${booking.awb_number} (${booking.courier_name})`)
      }
    })

    // Decrement local product stock
    setProducts(prev => prev.map(p => {
      const purchased = items.find((i: any) => (i.productId || i.product?.id) === p.id)
      if (purchased) {
        const qty = purchased.qty || 1
        return { ...p, stock: Math.max(0, (p.stock ?? 100) - qty) }
      }
      return p
    }))

    if (configured) {
      clearCartFromDB()
    }

    return finalOrderId
  }, [configured])

  const processRazorpayPayment = useCallback(async (
    orderId: string,
    paymentMethod: string,
    amount: number
  ) => {
    const paymentId = 'pay_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 6)
    
    const mockPayment: DBPayment = {
      id: 'pay_rec_' + Math.random().toString(36).substring(2, 8),
      order_id: orderId,
      payment_id: paymentId,
      payment_method: paymentMethod,
      amount,
      status: 'captured',
      created_at: new Date().toISOString()
    }
    setPayments(prev => [mockPayment, ...prev])
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: 'Paid', payment_id: paymentId } : o))

    if (configured) {
      await createPaymentRecordInDB({
        order_id: orderId,
        payment_id: paymentId,
        payment_method: paymentMethod,
        amount,
        status: 'captured'
      })
    }

    logActivity(`Razorpay Payment Captured: ${paymentId} (${paymentMethod.toUpperCase()})`)
    return paymentId
  }, [configured])

  const updateOrderStatus = useCallback(async (orderId: string, status: string, paymentStatus?: string, trackingNumber?: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      status,
      ...(paymentStatus ? { payment_status: paymentStatus } : {}),
      ...(trackingNumber ? { tracking_number: trackingNumber } : {})
    } : o))
    if (configured) {
      await updateOrderStatusInDB(orderId, status, paymentStatus, trackingNumber)
    }
    logActivity(`Admin updated Order #${orderId.substring(0, 6)} status to ${status}`)
  }, [configured])

  const saveProduct = useCallback(async (prod: DBProduct) => {
    const cleanProd = sanitizeProduct(prod)
    setProducts(prev => {
      const idx = prev.findIndex(p => Number(p.id) === Number(cleanProd.id))
      const nextProducts = idx >= 0
        ? prev.map((p, i) => i === idx ? cleanProd : p)
        : [...prev, cleanProd]
      // Save synchronously inside the updater so nextProducts is guaranteed non-empty
      saveStoredProducts(nextProducts)
      return nextProducts
    })

    // Ensure product's category and subcategory are registered in categories taxonomy
    if (prod.category) {
      const catTrim = prod.category.trim()
      const subTrim = (prod.subCategory || prod.sub_category || '').trim()
      setCategories(prevCats => {
        let updatedCats = [...prevCats]
        const catIdx = updatedCats.findIndex(c => c.name.toLowerCase() === catTrim.toLowerCase())
        if (catIdx < 0) {
          updatedCats.push({ name: catTrim, subCategories: subTrim ? [subTrim] : [] })
        } else if (subTrim) {
          const subs = updatedCats[catIdx].subCategories || []
          if (!subs.some(s => s.toLowerCase() === subTrim.toLowerCase())) {
            updatedCats[catIdx] = {
              ...updatedCats[catIdx],
              subCategories: [...subs, subTrim]
            }
          }
        }
        saveStoredCategories(updatedCats)
        return updatedCats
      })
    }

    if (configured) {
      try {
        await createOrUpdateProductInDB(prod)
      } catch (e) {}
    }
    logActivity(`Admin saved product "${prod.name}"`)
  }, [configured])

  const deleteProduct = useCallback(async (productId: number) => {
    setProducts(prev => {
      const nextProducts = prev.filter(p => Number(p.id) !== Number(productId))
      saveStoredProducts(nextProducts)
      return nextProducts
    })
    if (configured) {
      try {
        await deleteProductFromDB(productId)
      } catch (e) {}
    }
    logActivity(`Admin deleted product ID #${productId}`)
  }, [configured])

  const bulkSaveProducts = useCallback(async (prods: DBProduct[]) => {
    setProducts(prev => {
      const existingIds = new Set(prev.map(p => Number(p.id)))
      const newProds = prods.filter(p => !existingIds.has(Number(p.id)))
      const nextProducts = [...prev, ...newProds]
      saveStoredProducts(nextProducts)
      return nextProducts
    })
    if (configured) {
      try {
        await bulkCreateProductsInDB(prods)
      } catch (e) {}
    }
    logActivity(`Admin bulk imported ${prods.length} products`)
  }, [configured])

  // ─── Bulk Product Actions ──────────────────────────────────────────────────
  const bulkUpdateCategory = useCallback(async (productIds: number[], category: string, subCategory: string = '') => {
    let nextProducts: DBProduct[] = []
    setProducts(prev => {
      nextProducts = prev.map(p => {
        if (productIds.includes(p.id)) {
          return { ...p, category, subCategory, sub_category: subCategory }
        }
        return p
      })
      return nextProducts
    })
    await saveStoredProducts(nextProducts)
    if (configured) {
      try {
        await bulkUpdateCategoryInDB(productIds, category, subCategory)
      } catch (e) {}
    }
    logActivity(`Bulk moved ${productIds.length} items to "${category}${subCategory ? ` > ${subCategory}` : ''}"`)
  }, [configured])

  const bulkUpdateStock = useCallback(async (productIds: number[], stockOrDelta: number, mode: 'set' | 'add' | 'subtract' = 'set') => {
    let nextProducts: DBProduct[] = []
    setProducts(prev => {
      nextProducts = prev.map(p => {
        if (productIds.includes(p.id)) {
          let newStock = p.stock ?? 100
          if (mode === 'set') newStock = Math.max(0, stockOrDelta)
          else if (mode === 'add') newStock = Math.max(0, newStock + stockOrDelta)
          else if (mode === 'subtract') newStock = Math.max(0, newStock - stockOrDelta)
          return { ...p, stock: newStock }
        }
        return p
      })
      return nextProducts
    })
    await saveStoredProducts(nextProducts)
    if (configured) {
      for (const id of productIds) {
        const prod = products.find(p => p.id === id)
        const curStock = prod?.stock ?? 100
        let targetStock = curStock
        if (mode === 'set') targetStock = Math.max(0, stockOrDelta)
        else if (mode === 'add') targetStock = Math.max(0, curStock + stockOrDelta)
        else if (mode === 'subtract') targetStock = Math.max(0, curStock - stockOrDelta)
        try {
          await updateProductStockInDB(id, targetStock)
        } catch (e) {}
      }
    }
    logActivity(`Bulk updated stock for ${productIds.length} products`)
  }, [configured, products])

  const bulkUpdateBadge = useCallback(async (productIds: number[], badge: string) => {
    setProducts(prev => prev.map(p => productIds.includes(p.id) ? { ...p, badge } : p))
    if (configured) {
      await bulkUpdateBadgeInDB(productIds, badge)
    }
    logActivity(`Bulk set badge to "${badge || 'None'}" for ${productIds.length} products`)
  }, [configured])

  const bulkUpdatePrice = useCallback(async (
    productIds: number[],
    percentOrPrice: number,
    mode: 'fixed' | 'percent_discount' | 'percent_increase' = 'percent_discount'
  ) => {
    setProducts(prev => prev.map(p => {
      if (productIds.includes(p.id)) {
        let newPrice = p.price
        if (mode === 'fixed') newPrice = Math.max(1, Math.round(percentOrPrice))
        else if (mode === 'percent_discount') newPrice = Math.max(1, Math.round(p.price * (1 - percentOrPrice / 100)))
        else if (mode === 'percent_increase') newPrice = Math.max(1, Math.round(p.price * (1 + percentOrPrice / 100)))
        return { ...p, price: newPrice }
      }
      return p
    }))
    if (configured) {
      await bulkUpdatePriceInDB(productIds, percentOrPrice, mode)
    }
    logActivity(`Bulk adjusted price for ${productIds.length} products`)
  }, [configured])

  const bulkDeleteProducts = useCallback(async (productIds: number[]) => {
    let nextProducts: DBProduct[] = []
    setProducts(prev => {
      nextProducts = prev.filter(p => !productIds.includes(p.id))
      return nextProducts
    })
    await saveStoredProducts(nextProducts)
    if (configured) {
      try {
        await bulkDeleteProductsInDB(productIds)
      } catch (e) {}
    }
    logActivity(`Bulk deleted ${productIds.length} products`)
  }, [configured])

  const bulkAttachImages = useCallback(async (
    productIds: number[],
    newImages: string[],
    setAsThumbnail: boolean = false,
    distributeOneToOne: boolean = false
  ) => {
    let nextProducts: DBProduct[] = []
    setProducts(prev => {
      nextProducts = prev.map(p => {
        const pIdx = productIds.indexOf(p.id)
        if (pIdx >= 0) {
          if (distributeOneToOne && newImages[pIdx]) {
            const assignedPhoto = newImages[pIdx]
            const existingImages = (Array.isArray(p.images) ? p.images : [p.imgId]).filter(Boolean)
            const merged = [assignedPhoto, ...existingImages.filter(u => u !== assignedPhoto)]
            return sanitizeProduct({
              ...p,
              imgId: assignedPhoto,
              images: merged
            })
          } else {
            const existingImages = Array.isArray(p.images) ? p.images : [p.imgId].filter(Boolean)
            const merged = Array.from(new Set([...newImages, ...existingImages]))
            const nextImgId = setAsThumbnail && newImages[0] ? newImages[0] : (p.imgId || newImages[0] || '')
            return sanitizeProduct({
              ...p,
              imgId: nextImgId,
              images: merged
            })
          }
        }
        return p
      })
      return nextProducts
    })
    await saveStoredProducts(nextProducts)
    if (configured) {
      try {
        await bulkAttachImagesInDB(productIds, newImages, setAsThumbnail)
      } catch (e) {}
    }
    logActivity(`Bulk attached ${newImages.length} images to ${productIds.length} products`)
  }, [configured])

  // ─── Category & Subcategory Management ─────────────────────────────────────
  const addCategory = useCallback(async (name: string, subCategories: string[] = []) => {
    const trimmed = name.trim()
    if (!trimmed) return
    let updatedCategories: DBCategory[] = []
    setCategories(prev => {
      if (prev.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
        updatedCategories = prev
        return prev
      }
      updatedCategories = [...prev, { name: trimmed, subCategories }]
      return updatedCategories
    })
    await saveStoredCategories(updatedCategories)
    if (configured) {
      try {
        await saveCategoriesToDB(updatedCategories)
      } catch (e) {}
    }
    logActivity(`Added new category "${trimmed}"`)
  }, [configured])

  const updateCategory = useCallback(async (oldName: string, newName: string, subCategories: string[]) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    let updatedCategories: DBCategory[] = []
    setCategories(prev => {
      updatedCategories = prev.map(c => c.name === oldName ? { ...c, name: trimmed, subCategories } : c)
      return updatedCategories
    })
    if (oldName !== trimmed) {
      let nextProducts: DBProduct[] = []
      setProducts(prev => {
        nextProducts = prev.map(p => p.category === oldName ? { ...p, category: trimmed } : p)
        return nextProducts
      })
      await saveStoredProducts(nextProducts)
    }
    await saveStoredCategories(updatedCategories)
    if (configured) {
      try {
        await deleteCategoryFromDB(oldName)
        await saveCategoriesToDB(updatedCategories)
      } catch (e) {}
    }
    logActivity(`Updated category "${oldName}" to "${trimmed}"`)
  }, [configured])

  const deleteCategory = useCallback(async (name: string) => {
    let updatedCategories: DBCategory[] = []
    setCategories(prev => {
      updatedCategories = prev.filter(c => c.name.toLowerCase() !== name.toLowerCase())
      return updatedCategories
    })
    await saveStoredCategories(updatedCategories)

    // Clear category from products so it does not phantom resurrect
    setProducts(prev => {
      const updated = prev.map(p => {
        if ((p.category || '').toLowerCase() === name.toLowerCase()) {
          return { ...p, category: '', subCategory: '', sub_category: '' }
        }
        return p
      })
      saveStoredProducts(updated)
      return updated
    })

    if (configured) {
      try {
        await deleteCategoryFromDB(name)
      } catch (e) {}
    }
    logActivity(`Deleted category "${name}"`)
  }, [configured])

  const addSubCategory = useCallback(async (categoryName: string, subCategoryName: string) => {
    const catTrim = categoryName.trim()
    const subTrim = subCategoryName.trim()
    if (!catTrim || !subTrim) return
    let updatedCategories: DBCategory[] = []
    setCategories(prev => {
      const catIdx = prev.findIndex(c => c.name.toLowerCase() === catTrim.toLowerCase())
      if (catIdx < 0) {
        updatedCategories = [...prev, { name: catTrim, subCategories: [subTrim] }]
      } else {
        updatedCategories = prev.map((c, i) => {
          if (i === catIdx) {
            const subs = c.subCategories || []
            if (subs.some(s => s.toLowerCase() === subTrim.toLowerCase())) return c
            return { ...c, subCategories: [...subs, subTrim] }
          }
          return c
        })
      }
      return updatedCategories
    })
    await saveStoredCategories(updatedCategories)
    if (configured) {
      try {
        await saveCategoriesToDB(updatedCategories)
      } catch (e) {}
    }
    logActivity(`Added subcategory "${subTrim}" under "${catTrim}"`)
  }, [configured])

  const deleteSubCategory = useCallback(async (categoryName: string, subCategoryName: string) => {
    let updatedCategories: DBCategory[] = []
    const subLower = subCategoryName.trim().toLowerCase()
    const catLower = (categoryName || '').trim().toLowerCase()

    setCategories(prev => {
      updatedCategories = prev.map(c => {
        if (!catLower || c.name.toLowerCase() === catLower) {
          return {
            ...c,
            subCategories: (c.subCategories || []).filter(sc => sc.trim().toLowerCase() !== subLower)
          }
        }
        return c
      })
      return updatedCategories
    })
    await saveStoredCategories(updatedCategories)

    // Clear subCategory from products holding this subcategory
    setProducts(prev => {
      const updated = prev.map(p => {
        const pSub = (p.subCategory || p.sub_category || '').trim().toLowerCase()
        const pCat = (p.category || '').trim().toLowerCase()
        const matchCat = !catLower || pCat === catLower
        if (matchCat && pSub === subLower) {
          return { ...p, subCategory: '', sub_category: '' }
        }
        return p
      })
      saveStoredProducts(updated)
      return updated
    })

    if (configured) {
      try {
        await saveCategoriesToDB(updatedCategories)
      } catch (e) {}
    }
    logActivity(`Deleted subcategory "${subCategoryName}" from "${categoryName || 'all'}"`)
  }, [configured])

  const bulkSaveCategories = useCallback(async (cats: DBCategory[]) => {
    setCategories(cats)
    await saveStoredCategories(cats)
    if (configured) {
      try {
        await saveCategoriesToDB(cats)
      } catch (e) {}
    }
    logActivity(`Bulk saved ${cats.length} categories`)
  }, [configured])

  const deleteReview = useCallback(async (reviewId: string) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId))
    if (configured) {
      await deleteReviewFromDB(reviewId)
    }
    logActivity(`Admin deleted review ID #${reviewId.substring(0, 8)}`)
  }, [configured])

  const deleteOrder = useCallback(async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId))
    if (configured) {
      await deleteOrderFromDB(orderId)
    }
    logActivity(`Admin deleted order ID #${orderId.substring(0, 8)}`)
  }, [configured])

  const refundOrder = useCallback(async (orderId: string) => {
    const refundPayId = 'rfnd_' + Math.random().toString(36).substring(2, 10)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: 'Refunded', status: 'Refunded' } : o))
    setPayments(prev => prev.map(p => p.order_id === orderId ? { ...p, status: 'refunded' } : p))
    if (configured) {
      await refundPaymentInDB(orderId, refundPayId)
    }
    logActivity(`Refund processed for order #${orderId.substring(0, 8)} (ID: ${refundPayId})`)
  }, [configured])

  const updateProductStock = useCallback(async (productId: number, stock: number) => {
    const validStock = Math.max(0, stock)
    setProducts(prev => prev.map(p => Number(p.id) === Number(productId) ? { ...p, stock: validStock } : p))
    if (configured) {
      await updateProductStockInDB(productId, validStock)
    }
    logActivity(`Stock for SKU #${productId} adjusted to ${validStock} units`)
  }, [configured])

  const bulkAdjustStock = useCallback(async (amount: number) => {
    setProducts(prev => prev.map(p => ({ ...p, stock: Math.max(0, (p.stock ?? 100) + amount) })))
    logActivity(`Bulk adjusted all product stocks by ${amount > 0 ? '+' : ''}${amount}`)
  }, [])

  const refreshData = useCallback(async () => {
    logActivity('Refreshing database synchronization...')
    if (configured) {
      const [dbProds, dbOrders, dbPayments, dbReviews, dbCats] = await Promise.all([
        fetchProductsFromDB(),
        fetchOrdersFromDB(),
        fetchPaymentsFromDB(),
        fetchReviewsFromDB(),
        fetchCategoriesFromDB()
      ])
      if (dbProds) setProducts(dbProds)
      if (dbOrders) setOrders(dbOrders)
      if (dbPayments) setPayments(dbPayments)
      if (dbReviews) setReviews(dbReviews)
      if (dbCats && dbCats.length > 0) setCategories(dbCats)
      setIsConnected(true)
      logActivity('Data successfully refreshed from Supabase')
    } else {
      logActivity('Local fallback state active (No Supabase keys)')
    }
  }, [configured])

  const bookOrderWithBlitzship = useCallback(async (order: DBOrder) => {
    logActivity(`Booking order #${order.id?.substring(0, 8)} on BlitzShipz Logistics...`)
    const booking = await bookBlitzshipShipment(order)
    if (booking && booking.awb_number) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, tracking_number: booking.awb_number, status: 'Packed' } : o))
      if (configured && order.id) {
        await updateOrderStatusInDB(order.id, 'Packed', order.payment_status || 'Paid', booking.awb_number)
      }
      logActivity(`BlitzShipz AWB #${booking.awb_number} generated for Order #${order.id?.substring(0, 8)}`)
    }
    return booking
  }, [configured])

  const simulateRealtimeOrder = useCallback(async () => {
    const randomProduct = products[Math.floor(Math.random() * products.length)] || initialProducts[0]
    const randomQty = Math.floor(Math.random() * 2) + 1
    const subtotal = (randomProduct?.price || 999) * randomQty
    const discount = subtotal > 1500 ? 150 : 0
    const shipping = subtotal > 1000 ? 0 : 99
    const total = subtotal - discount + shipping

    const randomNames = ['Aarav Sharma', 'Pooja Verma', 'Vikram Malhotra', 'Sneha Patel', 'Tanvi Mehta', 'Ananya Kapoor', 'Rahul Deshmukh', 'Natasha Singh']
    const randomCities = ['Mumbai, Maharashtra', 'Bengaluru, Karnataka', 'New Delhi, Delhi', 'Hyderabad, Telangana', 'Pune, Maharashtra', 'Chennai, Tamil Nadu', 'Kolkata, West Bengal']
    const name = randomNames[Math.floor(Math.random() * randomNames.length)]
    const city = randomCities[Math.floor(Math.random() * randomCities.length)]

    const item = {
      product: randomProduct,
      productId: randomProduct.id,
      size: ['S', 'M', 'L', 'XL'][Math.floor(Math.random() * 4)],
      color: randomProduct.colors?.[0] || '#111',
      qty: randomQty
    }

    const orderId = await placeOrder(
      [item],
      subtotal,
      discount,
      shipping,
      total,
      name,
      `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      `Flat ${Math.floor(Math.random() * 500) + 101}, Prestige Tower, ${city}`,
      `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
      `${Math.floor(100000 + Math.random() * 900000)}`,
      city.split(',')[0],
      city.split(',')[1]?.trim()
    )

    if (orderId) {
      await processRazorpayPayment(orderId, ['upi', 'card', 'netbanking'][Math.floor(Math.random() * 3)], total)
    }
    return orderId
  }, [products, initialProducts, placeOrder, processRazorpayPayment])

  return {
    products,
    categories,
    reviews,
    cartItems,
    wishlistIds,
    orders,
    payments,
    activityLog,
    isConnected: configured && isConnected,
    isConfigured: configured,
    lastRealtimeEvent,
    addReview,
    deleteReview,
    syncCartItem,
    clearCart,
    toggleWishlist,
    placeOrder,
    processRazorpayPayment,
    updateOrderStatus,
    deleteOrder,
    refundOrder,
    saveProduct,
    deleteProduct,
    updateProductStock,
    bulkAdjustStock,
    bulkSaveProducts,
    bulkUpdateCategory,
    bulkUpdateStock,
    bulkUpdateBadge,
    bulkUpdatePrice,
    bulkDeleteProducts,
    bulkAttachImages,
    bulkSaveCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    deleteSubCategory,
    refreshData,
    bookOrderWithBlitzship,
    simulateRealtimeOrder
  }
}

