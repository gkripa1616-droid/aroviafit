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
  subCategory?: string
  sub_category?: string
  description?: string
  stock?: number
}

export interface DBCategory {
  id?: string
  name: string
  subCategories: string[]
  display_order?: number
}

// ─── Image Uploading & Bulk Photo Processing ─────────────────────────────────
export async function uploadImageToSupabase(file: File): Promise<string> {
  // 1. Try Supabase Storage bucket first
  if (isSupabaseConfigured() && supabase) {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)
      const fileName = `${Date.now()}_${cleanName}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      const filePath = `products/${fileName}`

      const { data, error } = await supabase.storage
        .from('products')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filePath)
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl
        }
      }
    } catch (e) {
      console.warn('Supabase storage upload fallback to canvas compressed DataURL:', e)
    }
  }

  // 2. High-Performance Client Canvas Compression + DataURL Fallback
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (!dataUrl) {
        resolve('')
        return
      }
      const imgObj = new Image()
      imgObj.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 650
          const MAX_HEIGHT = 850
          let width = imgObj.width
          let height = imgObj.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width)
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height)
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(imgObj, 0, 0, width, height)
            resolve(canvas.toDataURL('image/jpeg', 0.65))
          } else {
            resolve(dataUrl)
          }
        } catch {
          resolve(dataUrl)
        }
      }
      imgObj.onerror = () => {
        resolve(dataUrl)
      }
      imgObj.src = dataUrl
    }
    reader.onerror = () => {
      resolve('')
    }
    reader.readAsDataURL(file)
  })
}

export async function uploadMultipleImages(
  files: File[],
  onProgress?: (completed: number, total: number, latestUrl: string) => void
): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const url = await uploadImageToSupabase(file)
      urls.push(url)
      if (onProgress) {
        onProgress(i + 1, files.length, url)
      }
    } catch (err) {
      console.error(`Failed to upload ${file.name}:`, err)
    }
  }
  return urls
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
      images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.img_id],
      colors: Array.isArray(p.colors) ? p.colors : [],
      category: p.category,
      subCategory: p.sub_category || p.subCategory || '',
      sub_category: p.sub_category || p.subCategory || '',
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
    const subCat = product.subCategory || product.sub_category || ''
    const payload: any = {
      id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      rating: product.rating,
      reviews: product.reviews,
      badge: product.badge,
      img_id: product.imgId,
      images: product.images || [product.imgId],
      colors: product.colors,
      category: product.category,
      sub_category: subCat,
      description: product.description || '',
      stock: product.stock ?? 100
    }

    const { error } = await supabase.from('products').upsert([payload])
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
      images: product.images || [product.imgId],
      colors: product.colors,
      category: product.category,
      sub_category: product.subCategory || product.sub_category || '',
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

// ─── Bulk Product Operations ─────────────────────────────────────────────────
export async function bulkUpdateCategoryInDB(
  productIds: number[],
  category: string,
  subCategory: string = ''
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || productIds.length === 0) return false
  try {
    const { error } = await supabase
      .from('products')
      .update({
        category,
        sub_category: subCategory
      })
      .in('id', productIds)
    return !error
  } catch (err) {
    console.error('Bulk update category error:', err)
    return false
  }
}

export async function bulkDeleteProductsInDB(productIds: number[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || productIds.length === 0) return false
  try {
    const { error } = await supabase.from('products').delete().in('id', productIds)
    return !error
  } catch (err) {
    console.error('Bulk delete products error:', err)
    return false
  }
}

export async function bulkUpdateBadgeInDB(productIds: number[], badge: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || productIds.length === 0) return false
  try {
    const { error } = await supabase.from('products').update({ badge }).in('id', productIds)
    return !error
  } catch (err) {
    console.error('Bulk update badge error:', err)
    return false
  }
}

export async function bulkUpdatePriceInDB(
  productIds: number[],
  percentOrPrice: number,
  mode: 'fixed' | 'percent_discount' | 'percent_increase'
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || productIds.length === 0) return false
  try {
    const { data: currentProducts } = await supabase.from('products').select('id, price, mrp').in('id', productIds)
    if (!currentProducts) return false

    const updates = currentProducts.map(p => {
      let newPrice = p.price
      if (mode === 'fixed') {
        newPrice = Math.max(1, Math.round(percentOrPrice))
      } else if (mode === 'percent_discount') {
        newPrice = Math.max(1, Math.round(p.price * (1 - percentOrPrice / 100)))
      } else if (mode === 'percent_increase') {
        newPrice = Math.max(1, Math.round(p.price * (1 + percentOrPrice / 100)))
      }
      return {
        id: p.id,
        price: newPrice
      }
    })

    const { error } = await supabase.from('products').upsert(updates)
    return !error
  } catch (err) {
    console.error('Bulk update price error:', err)
    return false
  }
}

export async function bulkAttachImagesInDB(
  productIds: number[],
  newImages: string[],
  setAsThumbnail: boolean = false
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || productIds.length === 0 || newImages.length === 0) return false
  try {
    const { data: currentProducts } = await supabase.from('products').select('id, img_id, images').in('id', productIds)
    if (!currentProducts) return false

    const updates = currentProducts.map(p => {
      const existingImages = Array.isArray(p.images) ? p.images : [p.img_id].filter(Boolean)
      const mergedImages = Array.from(new Set([...existingImages, ...newImages]))
      return {
        id: p.id,
        img_id: setAsThumbnail && newImages[0] ? newImages[0] : p.img_id,
        images: mergedImages
      }
    })

    const { error } = await supabase.from('products').upsert(updates)
    return !error
  } catch (err) {
    console.error('Bulk attach images error:', err)
    return false
  }
}

// ─── Dynamic Categories & Subcategories ──────────────────────────────────────
export const DEFAULT_TAXONOMY: DBCategory[] = [
  {
    name: 'AroviaFit Rib Prime Collection',
    subCategories: ['Crop-top with flair pants']
  },
  {
    name: 'SPORTS BRA WITH GYM SHORTS',
    subCategories: ['Criss cross bra with gym shorts']
  },
  {
    name: 'CROP TOP ZIPPER BRA WITH YOGA PANTS',
    subCategories: ['crop tops']
  }
]

export async function fetchCategoriesFromDB(): Promise<DBCategory[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true })
    if (error || !data || data.length === 0) return null
    return data.map(c => ({
      id: c.id,
      name: c.name,
      subCategories: Array.isArray(c.sub_categories) ? c.sub_categories : [],
      display_order: c.display_order ?? 0
    }))
  } catch {
    return null
  }
}

export async function saveCategoriesToDB(categories: DBCategory[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const payload = categories.map((c, idx) => ({
      name: c.name,
      sub_categories: c.subCategories,
      display_order: idx
    }))
    const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'name' })
    return !error
  } catch (err) {
    console.error('Save categories error:', err)
    return false
  }
}

export async function deleteCategoryFromDB(categoryName: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('categories').delete().eq('name', categoryName)
    return !error
  } catch {
    return false
  }
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
  customer_phone?: string
  shipping_address?: string
  postal_code?: string
  city?: string
  state?: string
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

// ─── Reviews ─────────────────────────────────────────────────────────────────
export async function fetchReviewsFromDB(): Promise<DBReview[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
    if (error || !data) return null
    return data.map(r => ({
      id: r.id,
      product_id: r.product_id ? Number(r.product_id) : undefined,
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
    if (error) {
      console.error('Submit review error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Submit review exception:', err)
    return false
  }
}

export async function deleteReviewFromDB(reviewId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    return !error
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
      customer_phone: order.customer_phone || '',
      shipping_address: order.shipping_address || 'India',
      postal_code: order.postal_code || '',
      city: order.city || '',
      state: order.state || ''
    }]).select('id')

    if (error || !data || data.length === 0) {
      console.error('Create order Supabase error:', error)
      return null
    }

    // Atomic stock decrement for all items in order
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        const pId = item.productId || item.product?.id
        const qty = item.qty || 1
        if (pId) {
          try {
            await supabase.rpc('decrement_product_stock', { p_product_id: pId, p_qty: qty })
          } catch (e) {
            // Non-blocking fallback
          }
        }
      }
    }

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
      customer_phone: o.customer_phone || '',
      shipping_address: o.shipping_address || '',
      postal_code: o.postal_code || '',
      city: o.city || '',
      state: o.state || '',
      created_at: o.created_at
    }))
  } catch {
    return null
  }
}

export async function updateOrderStatusInDB(orderId: string, status: string, paymentStatus?: string, trackingNumber?: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const updateObj: any = { status }
    if (paymentStatus) updateObj.payment_status = paymentStatus
    if (trackingNumber) updateObj.tracking_number = trackingNumber
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

export async function deleteOrderFromDB(orderId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('orders').delete().eq('id', orderId)
    return !error
  } catch {
    return false
  }
}

export async function refundPaymentInDB(orderId: string, refundPaymentId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    await supabase.from('payments').update({ status: 'refunded' }).eq('order_id', orderId)
    await supabase.from('orders').update({ payment_status: 'Refunded', status: 'Refunded' }).eq('id', orderId)
    return true
  } catch {
    return false
  }
}

export async function updateProductStockInDB(productId: number, stock: number): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('products').update({ stock }).eq('id', productId)
    return !error
  } catch {
    return false
  }
}

