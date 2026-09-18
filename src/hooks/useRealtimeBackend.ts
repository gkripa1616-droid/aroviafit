import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured, getOrCreateSessionId } from '../lib/supabase'
import {
  DBProduct,
  DBReview,
  DBOrder,
  DBPayment,
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
  createOrUpdateProductInDB
} from '../services/supabaseBackend'

export function useRealtimeBackend(initialProducts: DBProduct[], initialReviews: DBReview[]) {
  const [products, setProducts] = useState<DBProduct[]>(initialProducts)
  const [reviews, setReviews] = useState<DBReview[]>(initialReviews)
  const [cartItems, setCartItems] = useState<{ productId: number; size: string; color: string; qty: number }[]>([])
  const [wishlistIds, setWishlistIds] = useState<number[]>([])
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
    setActivityLog(prev => [logItem, ...prev.slice(0, 20)])
  }

  // Initial Load from Supabase
  useEffect(() => {
    if (!configured) return

    let isMounted = true

    async function loadData() {
      const dbProds = await fetchProductsFromDB()
      if (dbProds && dbProds.length > 0 && isMounted) {
        setProducts(dbProds)
      }

      const dbRevs = await fetchReviewsFromDB()
      if (dbRevs && dbRevs.length > 0 && isMounted) {
        setReviews(dbRevs)
      }

      const dbCart = await fetchCartFromDB()
      if (dbCart && isMounted) {
        setCartItems(dbCart.map(c => ({ productId: c.product_id, size: c.size, color: c.color, qty: c.qty })))
      }

      const dbWish = await fetchWishlistFromDB()
      if (dbWish && isMounted) {
        setWishlistIds(dbWish)
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

    loadData()

    return () => {
      isMounted = false
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
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
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
            colors: Array.isArray(newP.colors) ? newP.colors : [],
            category: newP.category,
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
          product_id: newR.product_id,
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
      setReviews(prev => [{ name, text, rating, product_name: productName }, ...prev])
    }
    return success
  }, [configured])

  const syncCartItem = useCallback((productId: number, size: string, color: string, qty: number) => {
    if (configured) {
      syncCartItemToDB(productId, size, color, qty)
    }
  }, [configured])

  const clearCart = useCallback(() => {
    if (configured) {
      clearCartFromDB()
    }
  }, [configured])

  const toggleWishlist = useCallback((productId: number, isWishlisted: boolean) => {
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
    shippingAddress?: string
  ) => {
    const sessionId = getOrCreateSessionId()
    const orderId = await createOrderInDB({
      session_id: sessionId,
      items,
      subtotal,
      discount,
      shipping,
      total,
      customer_name: customerName || 'Guest Customer',
      customer_email: customerEmail || 'customer@aroviafit.com',
      shipping_address: shippingAddress || 'India'
    })

    const finalOrderId = orderId || ('ORD-' + Math.floor(100000 + Math.random() * 900000))

    if (!configured) {
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
        customer_name: customerName || 'Guest Customer',
        customer_email: customerEmail || 'customer@aroviafit.com',
        shipping_address: shippingAddress || 'India',
        created_at: new Date().toISOString()
      }
      setOrders(prev => [mockOrder, ...prev])
    }

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
    
    if (configured) {
      await createPaymentRecordInDB({
        order_id: orderId,
        payment_id: paymentId,
        payment_method: paymentMethod,
        amount,
        status: 'captured'
      })
    } else {
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
    }

    logActivity(`Razorpay Payment Captured: ${paymentId} (${paymentMethod.toUpperCase()})`)
    return paymentId
  }, [configured])

  const updateOrderStatus = useCallback(async (orderId: string, status: string, paymentStatus?: string) => {
    if (configured) {
      await updateOrderStatusInDB(orderId, status, paymentStatus)
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, ...(paymentStatus ? { payment_status: paymentStatus } : {}) } : o))
    }
    logActivity(`Admin updated Order #${orderId.substring(0, 6)} status to ${status}`)
  }, [configured])

  const saveProduct = useCallback(async (prod: DBProduct) => {
    if (configured) {
      await createOrUpdateProductInDB(prod)
    } else {
      setProducts(prev => {
        const idx = prev.findIndex(p => p.id === prod.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = prod
          return updated
        }
        return [...prev, prod]
      })
    }
    logActivity(`Admin saved product "${prod.name}"`)
  }, [configured])

  return {
    products,
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
    syncCartItem,
    clearCart,
    toggleWishlist,
    placeOrder,
    processRazorpayPayment,
    updateOrderStatus,
    saveProduct
  }
}
