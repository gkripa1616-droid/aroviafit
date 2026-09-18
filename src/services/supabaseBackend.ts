import { supabase, isSupabaseConfigured, getOrCreateSessionId } from '../lib/supabase'

export interface DBProduct {
  id: number
  name: string
  price: number
  mrp: number
  rating: number
  reviews: number
  badge: string
  imgId: string
  images?: string[]
  colors: string[]
  category: string
  description?: string
  stock?: number
}

export interface DBReview {
  id?: string
  product_id?: number
  product_name?: string
  name: string
  text: string
  rating: number
  created_at?: string
}

export interface DBCartItem {
  id?: string
  session_id: string
  product_id: number
  size: string
  color: string
  qty: number
}

export interface DBWishlistItem {
  id?: string
  session_id: string
  product_id: number
}

export interface DBOrder {
  id?: string
  session_id: string
  items: any[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  status?: string
  payment_status?: string
  payment_id?: string
  tracking_number?: string
  customer_name?: string
  customer_email?: string
  shipping_address?: string
  created_at?: string
}

export interface DBPayment {
  id?: string
  order_id?: string
  payment_id: string
  payment_method: string
  amount: number
  currency?: string
  status: string
  raw_details?: any
  created_at?: string
}

// ─── Products ────────────────────────────────────────────────────────────────
export async function fetchProductsFromDB(): Promise<DBProduct[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true })
    if (error || !data) {
      console.warn('Supabase fetchProducts error, falling back:', error)
      return null
    }
    return data.map(p => ({
      id: Number(p.id),
      name: p.name,
      price: Number(p.price),
      mrp: Number(p.mrp),
      rating: Number(p.rating),
      reviews: Number(p.reviews),
      badge: p.badge || '',
      imgId: p.img_id,
      images: Array.isArray(p.images) ? p.images : [],
      colors: Array.isArray(p.colors) ? p.colors : [],
      category: p.category,
      description: p.description || '',
      stock: p.stock ?? 100
    }))
  } catch (err) {
    console.error('Error fetching products from DB:', err)
    return null
  }
}

export async function createOrUpdateProductInDB(product: DBProduct): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('products').upsert([{
      id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      rating: product.rating,
      reviews: product.reviews,
      badge: product.badge,
      img_id: product.imgId,
      images: product.images || [],
      colors: product.colors,
      category: product.category,
      description: product.description || '',
      stock: product.stock ?? 100
    }])
    if (error) {
      console.error('Save product error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Save product exception:', err)
    return false
  }
}

export async function deleteProductFromDB(productId: number): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('products').delete().eq('id', productId)
    return !error
  } catch {
    return false
  }
}

export async function bulkCreateProductsInDB(products: DBProduct[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const payload = products.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      rating: product.rating || 4.8,
      reviews: product.reviews || 0,
      badge: product.badge || 'NEW',
      img_id: product.imgId,
      images: product.images || [],
      colors: product.colors,
      category: product.category,
      description: product.description || '',
      stock: product.stock ?? 100
    }))
    const { error } = await supabase.from('products').upsert(payload)
    return !error
  } catch (err) {
    console.error('Bulk save products error:', err)
    return false
  }
}

// ─── Reviews ─────────────────────────────────────────────────────────────────
export async function fetchReviewsFromDB(): Promise<DBReview[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
    if (error || !data) return null
    return data.map(r => ({
      id: r.id,
      product_id: r.product_id,
      product_name: r.product_name,
      name: r.name,
      text: r.text,
      rating: Number(r.rating),
      created_at: r.created_at
    }))
  } catch {
    return null
  }
}

export async function submitReviewToDB(review: DBReview): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('reviews').insert([{
      product_id: review.product_id,
      product_name: review.product_name || '',
      name: review.name,
      text: review.text,
      rating: review.rating
    }])
    if (error) return false
    return true
  } catch {
    return false
  }
}

// ─── Cart ────────────────────────────────────────────────────────────────────
export async function fetchCartFromDB(): Promise<DBCartItem[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const sessionId = getOrCreateSessionId()
  try {
    const { data, error } = await supabase.from('cart_items').select('*').eq('session_id', sessionId)
    if (error || !data) return null
    return data.map(c => ({
      id: c.id,
      session_id: c.session_id,
      product_id: Number(c.product_id),
      size: c.size,
      color: c.color,
      qty: Number(c.qty)
    }))
  } catch {
    return null
  }
}

export async function syncCartItemToDB(productId: number, size: string, color: string, qty: number): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  const sessionId = getOrCreateSessionId()
  try {
    if (qty <= 0) {
      await supabase.from('cart_items')
        .delete()
        .match({ session_id: sessionId, product_id: productId, size, color })
    } else {
      const { data: existing } = await supabase.from('cart_items')
        .select('id')
        .match({ session_id: sessionId, product_id: productId, size, color })

      if (existing && existing.length > 0) {
        await supabase.from('cart_items')
          .update({ qty, updated_at: new Date().toISOString() })
          .eq('id', existing[0].id)
      } else {
        await supabase.from('cart_items')
          .insert([{ session_id: sessionId, product_id: productId, size, color, qty }])
      }
    }
    return true
  } catch (err) {
    console.error('Sync cart item DB error:', err)
    return false
  }
}

export async function clearCartFromDB(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  const sessionId = getOrCreateSessionId()
  try {
    await supabase.from('cart_items').delete().eq('session_id', sessionId)
    return true
  } catch {
    return false
  }
}

// ─── Wishlist ────────────────────────────────────────────────────────────────
export async function fetchWishlistFromDB(): Promise<number[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const sessionId = getOrCreateSessionId()
  try {
    const { data, error } = await supabase.from('wishlist').select('product_id').eq('session_id', sessionId)
    if (error || !data) return null
    return data.map(w => Number(w.product_id))
  } catch {
    return null
  }
}

export async function toggleWishlistItemDB(productId: number, isWishlisted: boolean): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  const sessionId = getOrCreateSessionId()
  try {
    if (isWishlisted) {
      await supabase.from('wishlist').insert([{ session_id: sessionId, product_id: productId }])
    } else {
      await supabase.from('wishlist').delete().match({ session_id: sessionId, product_id: productId })
    }
    return true
  } catch {
    return false
  }
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export async function createOrderInDB(order: DBOrder): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('orders').insert([{
      session_id: order.session_id,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      total: order.total,
      status: order.status || 'Processing',
      payment_status: order.payment_status || 'Unpaid',
      payment_id: order.payment_id || '',
      tracking_number: order.tracking_number || 'TRK-' + Math.floor(100000 + Math.random() * 900000),
      customer_name: order.customer_name || 'Guest Customer',
      customer_email: order.customer_email || 'customer@aroviafit.com',
      shipping_address: order.shipping_address || 'India'
    }]).select('id')

    if (error || !data || data.length === 0) return null
    return data[0].id
  } catch (err) {
    console.error('Create order error:', err)
    return null
  }
}

export async function fetchOrdersFromDB(): Promise<DBOrder[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (error || !data) return null
    return data.map(o => ({
      id: o.id,
      session_id: o.session_id,
      items: Array.isArray(o.items) ? o.items : [],
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      shipping: Number(o.shipping),
      total: Number(o.total),
      status: o.status || 'Processing',
      payment_status: o.payment_status || 'Paid',
      payment_id: o.payment_id || '',
      tracking_number: o.tracking_number || '',
      customer_name: o.customer_name || 'Customer',
      customer_email: o.customer_email || '',
      shipping_address: o.shipping_address || '',
      created_at: o.created_at
    }))
  } catch {
    return null
  }
}

export async function updateOrderStatusInDB(orderId: string, status: string, paymentStatus?: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const updateObj: any = { status }
    if (paymentStatus) updateObj.payment_status = paymentStatus
    const { error } = await supabase.from('orders').update(updateObj).eq('id', orderId)
    return !error
  } catch {
    return false
  }
}

// ─── Payments (Razorpay Realtime) ────────────────────────────────────────────
export async function createPaymentRecordInDB(payment: DBPayment): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('payments').insert([{
      order_id: payment.order_id,
      payment_id: payment.payment_id,
      payment_method: payment.payment_method,
      amount: payment.amount,
      currency: payment.currency || 'INR',
      status: payment.status || 'captured',
      raw_details: payment.raw_details || {}
    }])

    if (error) {
      console.error('Create payment DB error:', error)
      return false
    }

    if (payment.order_id) {
      await supabase.from('orders').update({
        payment_status: 'Paid',
        payment_id: payment.payment_id
      }).eq('id', payment.order_id)
    }

    return true
  } catch (err) {
    console.error('Create payment exception:', err)
    return false
  }
}

export async function fetchPaymentsFromDB(): Promise<DBPayment[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
    if (error || !data) return null
    return data.map(p => ({
      id: p.id,
      order_id: p.order_id,
      payment_id: p.payment_id,
      payment_method: p.payment_method,
      amount: Number(p.amount),
      currency: p.currency || 'INR',
      status: p.status || 'captured',
      created_at: p.created_at
    }))
  } catch {
    return null
  }
}
