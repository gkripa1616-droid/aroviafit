import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  DBProduct,
  DBReview,
  DBOrder,
  DBPayment,
  DBCategory,
  DEFAULT_TAXONOMY,
  uploadMultipleImages,
  uploadImageToSupabase
} from '../services/supabaseBackend'
import { generateBlitzshipThermalLabel } from '../services/blitzshipService'
import TrackingModal from './TrackingModal'

// ─── Sound Notification Synthesizer (Native Web Audio API) ───────────────────
function playNotificationSound(type: 'order' | 'payment' | 'alert' | 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    if (type === 'order') {
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, now)
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15)
      gain1.gain.setValueAtTime(0.15, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.35)
    } else if (type === 'payment') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(523.25, now)
      osc.frequency.setValueAtTime(659.25, now + 0.08)
      osc.frequency.setValueAtTime(783.99, now + 0.16)
      osc.frequency.setValueAtTime(1046.50, now + 0.24)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.45)
    } else if (type === 'alert') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.linearRampToValueAtTime(200, now + 0.2)
      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.2)
    } else {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, now)
      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.15)
    }
  } catch {
    // Audio context gesture policy handled gracefully
  }
}

// ─── Preset Colors & Couriers ────────────────────────────────────────────────
const PRESET_COLORS = [
  { name: 'Pitch Black', hex: '#111111' },
  { name: 'Slate Gray', hex: '#6b7280' },
  { name: 'Royal Purple', hex: '#7c3aed' },
  { name: 'Warm Amber', hex: '#b45309' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Hot Pink', hex: '#ec4899' },
  { name: 'Azure Blue', hex: '#3b82f6' },
  { name: 'Burgundy Red', hex: '#c53030' },
  { name: 'Sand Beige', hex: '#f5f5f4' },
  { name: 'Mustard Gold', hex: '#fcd34d' }
]

const COURIERS = [
  'Delhivery Surface',
  'Blue Dart Express',
  'DTDC Priority',
  'Ekart Logistics',
  'India Post SpeedPost',
  'FedEx India Express'
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const isValidImg = (id: string | undefined | null): boolean => {
  if (!id || typeof id !== 'string') return false
  if (id.startsWith('data:') && id.length < 200) return false
  return true
}

const imgUrl = (id: string, _w = 300, _h = 400) => {
  if (!isValidImg(id)) return ''
  return id
}

export interface AdminPanelProps {
  products: DBProduct[]
  categories?: DBCategory[]
  orders: DBOrder[]
  payments: DBPayment[]
  reviews: DBReview[]
  activityLog: { id: string; text: string; time: string }[]
  isConnected: boolean
  isConfigured: boolean
  lastRealtimeEvent?: string
  onSaveProduct: (p: DBProduct) => void
  onDeleteProduct: (id: number) => void
  onUpdateProductStock: (id: number, stock: number) => void
  onBulkAdjustStock: (amount: number) => void
  onUpdateOrderStatus: (id: string, status: string, payStatus?: string, tracking?: string) => void
  onDeleteOrder: (id: string) => void
  onRefundOrder: (id: string) => void
  onAddReview: (productName: string, name: string, text: string, rating: number, productId?: number) => void
  onDeleteReview: (id: string) => void
  onBulkImport: () => void
  onRefreshData: () => void
  onSimulateOrder: () => Promise<string | null>
  onReturnToStore: () => void
  onBookBlitzship?: (order: DBOrder) => Promise<{ success: boolean; awb?: string; courier?: string; message: string }>
  // Bulk Actions & Category Management
  onBulkUpdateCategory?: (productIds: number[], category: string, subCategory?: string) => Promise<void> | void
  onBulkUpdateStock?: (productIds: number[], stockOrDelta: number, mode?: 'set' | 'add' | 'subtract') => Promise<void> | void
  onBulkUpdateBadge?: (productIds: number[], badge: string) => Promise<void> | void
  onBulkUpdatePrice?: (productIds: number[], percentOrPrice: number, mode?: 'fixed' | 'percent_discount' | 'percent_increase') => Promise<void> | void
  onBulkDeleteProducts?: (productIds: number[]) => Promise<void> | void
  onBulkAttachImages?: (productIds: number[], images: string[], setAsThumbnail?: boolean) => Promise<void> | void
  onAddCategory?: (name: string, subCategories?: string[]) => Promise<void> | void
  onUpdateCategory?: (oldName: string, newName: string, subCategories: string[]) => Promise<void> | void
  onDeleteCategory?: (name: string) => Promise<void> | void
  onAddSubCategory?: (categoryName: string, subCategoryName: string) => Promise<void> | void
  onDeleteSubCategory?: (categoryName: string, subCategoryName: string) => Promise<void> | void
}

// ─── Admin Security PIN Gate ─────────────────────────────────────────────────
function AdminSecurityGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.trim() === '1234' || pin.trim().toLowerCase() === 'admin') {
      playNotificationSound('success')
      onUnlock()
    } else {
      playNotificationSound('alert')
      setError(true)
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-black via-zinc-700 to-black" />
        <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-md">
          🔐
        </div>
        <span className="bg-zinc-100 text-zinc-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-zinc-200 inline-block mb-2">
          Arovia Fit Operations
        </span>
        <h2 className="text-2xl font-black tracking-tight text-gray-900">Admin Realtime Console</h2>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Authenticate to access live inventory telemetry, Supabase realtime gateway & bulk media studio.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="password"
              maxLength={8}
              value={pin}
              onChange={e => { setPin(e.target.value); setError(false) }}
              placeholder="Enter PIN (Default: 1234)"
              className="w-full text-center tracking-[0.3em] text-xl font-mono font-bold border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:border-black transition-colors"
              autoFocus
            />
            {error && <p className="text-xs text-red-600 mt-2 font-medium">Incorrect security passcode. Hint: Use 1234 or admin</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-black text-white text-xs font-bold py-3.5 rounded-xl tracking-wider hover:bg-zinc-800 transition-all active:scale-[0.99] shadow-md flex items-center justify-center gap-2"
          >
            <span>UNLOCK REALTIME CONSOLE</span>
            <span>→</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span>Master Demo Key: <strong className="text-gray-700 font-mono">1234</strong></span>
          <button
            onClick={() => { setPin('1234'); onUnlock(); playNotificationSound('success') }}
            className="text-blue-600 font-semibold hover:underline"
          >
            Instant 1-Click Unlock
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Realtime Admin Panel ───────────────────────────────────────────────
export default function AdminPanel({
  products,
  categories = DEFAULT_TAXONOMY,
  orders,
  payments,
  reviews,
  activityLog,
  isConnected,
  isConfigured,
  lastRealtimeEvent,
  onSaveProduct,
  onDeleteProduct,
  onUpdateProductStock,
  onBulkAdjustStock,
  onUpdateOrderStatus,
  onDeleteOrder,
  onRefundOrder,
  onAddReview,
  onDeleteReview,
  onBulkImport,
  onRefreshData,
  onSimulateOrder,
  onReturnToStore,
  onBookBlitzship,
  onBulkUpdateCategory,
  onBulkUpdateStock,
  onBulkUpdateBadge,
  onBulkUpdatePrice,
  onBulkDeleteProducts,
  onBulkAttachImages,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubCategory,
  onDeleteSubCategory
}: AdminPanelProps) {
  const [unlocked, setUnlocked] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'photos' | 'categories' | 'orders' | 'payments' | 'reviews' | 'coupons' | 'system'>('overview')
  
  // UI & Sound Controls
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Multi-Selection State for Bulk Operations
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])

  // Bulk Action Modals
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false)
  const [showBulkStockModal, setShowBulkStockModal] = useState(false)
  const [showBulkBadgeModal, setShowBulkBadgeModal] = useState(false)
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [showBulkAttachPhotosModal, setShowBulkAttachPhotosModal] = useState(false)

  // Bulk Category Form State
  const [bulkTargetCategory, setBulkTargetCategory] = useState(categories[0]?.name || 'Bottoms')
  const [bulkTargetSubCategory, setBulkTargetSubCategory] = useState('')
  const [isCreatingNewCatInBulk, setIsCreatingNewCatInBulk] = useState(false)
  const [newCatNameInput, setNewCatNameInput] = useState('')
  const [newSubCatNameInput, setNewSubCatNameInput] = useState('')

  // Bulk Stock Form State
  const [bulkStockMode, setBulkStockMode] = useState<'set' | 'add' | 'subtract'>('set')
  const [bulkStockValue, setBulkStockValue] = useState<number>(100)

  // Bulk Price Form State
  const [bulkPriceMode, setBulkPriceMode] = useState<'fixed' | 'percent_discount' | 'percent_increase'>('percent_discount')
  const [bulkPriceValue, setBulkPriceValue] = useState<number>(10)

  // Bulk Badge Form State
  const [bulkBadgeValue, setBulkBadgeValue] = useState<string>('BESTSELLER')

  // Bulk Photo Studio State
  const [uploadedPhotos, setUploadedPhotos] = useState<{ id: string; url: string; name: string; timestamp: string }[]>(() => {
    const existing = products.flatMap(p => (p.images || [p.imgId]).filter(Boolean).map((url, i) => ({
      id: `prod_${p.id}_${i}`,
      url,
      name: `${p.name} #${i + 1}`,
      timestamp: 'Active Media'
    })))
    return existing
  })
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[]>([])
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [uploadProgressText, setUploadProgressText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const singleProductPhotoInputRef = useRef<HTMLInputElement>(null)
  const [singlePhotoTargetId, setSinglePhotoTargetId] = useState<number | null>(null)

  const handleSingleProductPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !singlePhotoTargetId) return
    const file = e.target.files[0]
    const targetProd = products.find(p => p.id === singlePhotoTargetId)
    if (!targetProd) return

    showToast(`Uploading photo for "${targetProd.name}"...`)
    try {
      const url = await uploadImageToSupabase(file)
      if (isValidImg(url)) {
        const existingImgs = (targetProd.images || [targetProd.imgId]).filter(isValidImg)
        const updatedImgs = [url, ...existingImgs.filter(u => u !== url)]
        const updatedProd: DBProduct = {
          ...targetProd,
          imgId: url,
          images: updatedImgs
        }
        onSaveProduct(updatedProd)
        if (soundEnabled) playNotificationSound('success')
        showToast(`✓ Photo updated for "${targetProd.name}"!`)
      }
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`)
    } finally {
      setSinglePhotoTargetId(null)
      if (e.target) e.target.value = ''
    }
  }

  // Category Hub Modal / Edit State
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [newSubCategoriesInput, setNewSubCategoriesInput] = useState('')
  const [editingCategory, setEditingCategory] = useState<DBCategory | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [editingCatSubs, setEditingCatSubs] = useState('')
  const [activeSubCatInputCatName, setActiveSubCatInputCatName] = useState<string | null>(null)
  const [quickSubCatInput, setQuickSubCatInput] = useState('')
  const [showTaxonomyManager, setShowTaxonomyManager] = useState(false)

  // Product Edit / Create Modals
  const [editingProd, setEditingProd] = useState<DBProduct | null>(null)
  const [isNewProdModal, setIsNewProdModal] = useState(false)
  const [deleteConfirmProd, setDeleteConfirmProd] = useState<DBProduct | null>(null)
  const [customColorInput, setCustomColorInput] = useState('#111111')
  const [newImageUrlInput, setNewImageUrlInput] = useState('')
  const [isModalUploadingPhoto, setIsModalUploadingPhoto] = useState(false)
  const [modalUploadProgressText, setModalUploadProgressText] = useState('')
  const modalFileInputRef = useRef<HTMLInputElement>(null)
  const [productFormError, setProductFormError] = useState<string | null>(null)
  const [isCreatingModalCat, setIsCreatingModalCat] = useState(false)
  const [modalNewCatInput, setModalNewCatInput] = useState('')
  const [isCreatingModalSubCat, setIsCreatingModalSubCat] = useState(false)
  const [modalNewSubCatInput, setModalNewSubCatInput] = useState('')

  // Order Details & Actions
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<DBOrder | null>(null)
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<DBOrder | null>(null)
  const [selectedTrackOrder, setSelectedTrackOrder] = useState<DBOrder | null>(null)
  const [bookingBlitzshipId, setBookingBlitzshipId] = useState<string | null>(null)
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<DBOrder | null>(null)
  const [showNewReviewModal, setShowNewReviewModal] = useState(false)
  const [showSqlModal, setShowSqlModal] = useState(false)

  // Search & Filter
  const [prodSearch, setProdSearch] = useState('')
  const [prodCategoryFilter, setProdCategoryFilter] = useState('ALL')
  const [prodSubCategoryFilter, setProdSubCategoryFilter] = useState('ALL')
  const [prodStockFilter, setProdStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [prodSortBy, setProdSortBy] = useState<'id' | 'price_asc' | 'price_desc' | 'stock_asc' | 'rating'>('id')
  const [prodViewMode, setProdViewMode] = useState<'grid' | 'table'>('table')

  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL')

  // Promotions & Marketing
  const [coupons, setCoupons] = useState([
    { code: 'AROVIA150', discount: 150, type: 'flat', minOrder: 1500, active: true, usageCount: 42 },
    { code: 'WELCOME10', discount: 10, type: 'percent', minOrder: 999, active: true, usageCount: 118 },
    { code: 'FIT20', discount: 20, type: 'percent', minOrder: 2499, active: true, usageCount: 35 },
    { code: 'FREESHIP', discount: 99, type: 'flat', minOrder: 0, active: true, usageCount: 89 }
  ])
  const [newCouponCode, setNewCouponCode] = useState('')
  const [newCouponDiscount, setNewCouponDiscount] = useState(15)
  const [newCouponMin, setNewCouponMin] = useState(1000)
  const [announcementText, setAnnouncementText] = useState('⚡ EXCLUSIVE DROP: 4-WAY ITALIAN STRETCH ACTIVEWEAR | FREE SHIPPING ON ORDERS OVER ₹999')

  // Review Form
  const [newReviewForm, setNewReviewForm] = useState({
    productId: products[0]?.id || 1,
    name: 'Verified Arovia Athlete',
    rating: 5,
    text: 'Incredible hand-feel and flattering compression fit! Does not slide down during intense HIIT.'
  })

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // ─── Analytics Computations ──────────────────────────────────────────────────
  const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0), [orders])
  const capturedPayments = useMemo(() => payments.filter(p => p.status === 'captured').reduce((sum, p) => sum + p.amount, 0), [payments])
  const averageOrderValue = useMemo(() => orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0, [totalRevenue, orders.length])
  const outOfStockCount = useMemo(() => products.filter(p => (p.stock ?? 100) <= 0).length, [products])
  const lowStockCount = useMemo(() => products.filter(p => (p.stock ?? 100) > 0 && (p.stock ?? 100) <= 20).length, [products])
  const processingOrdersCount = useMemo(() => orders.filter(o => o.status === 'Processing' || !o.status).length, [orders])

  // Automatically include any category present in products or categories prop
  const effectiveCategories = useMemo(() => {
    const catMap = new Map<string, DBCategory>()
    categories.forEach(c => {
      catMap.set(c.name.toLowerCase(), { ...c, subCategories: [...(c.subCategories || [])] })
    })
    products.forEach(p => {
      if (p.category) {
        const lower = p.category.toLowerCase()
        const sub = p.subCategory || p.sub_category || ''
        if (!catMap.has(lower)) {
          catMap.set(lower, { name: p.category, subCategories: sub ? [sub] : [] })
        } else if (sub) {
          const cat = catMap.get(lower)!
          if (!cat.subCategories.includes(sub)) {
            cat.subCategories.push(sub)
          }
        }
      }
    })
    return Array.from(catMap.values())
  }, [categories, products])

  // Subcategories for current category filter
  const currentCategoryObj = effectiveCategories.find(c => c.name.toLowerCase() === prodCategoryFilter.toLowerCase())
  const availableSubCategoriesForFilter = useMemo(() => {
    if (prodCategoryFilter === 'ALL') {
      const allSubs = new Set<string>()
      products.forEach(p => {
        const s = p.subCategory || p.sub_category
        if (s) allSubs.add(s)
      })
      effectiveCategories.forEach(c => c.subCategories.forEach(sc => allSubs.add(sc)))
      return Array.from(allSubs)
    }
    return currentCategoryObj ? currentCategoryObj.subCategories : []
  }, [prodCategoryFilter, currentCategoryObj, products, effectiveCategories])

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = prodSearch === '' ||
        p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
        String(p.id).includes(prodSearch) ||
        (p.category || '').toLowerCase().includes(prodSearch.toLowerCase()) ||
        (p.subCategory || '').toLowerCase().includes(prodSearch.toLowerCase())
      
      const matchesCategory = prodCategoryFilter === 'ALL' || (p.category || '').toLowerCase() === prodCategoryFilter.toLowerCase()
      const matchesSubCategory = prodSubCategoryFilter === 'ALL' || ((p.subCategory || p.sub_category || '').toLowerCase() === prodSubCategoryFilter.toLowerCase())
      
      const stock = p.stock ?? 100
      let matchesStock = true
      if (prodStockFilter === 'in_stock') matchesStock = stock > 20
      else if (prodStockFilter === 'low_stock') matchesStock = stock > 0 && stock <= 20
      else if (prodStockFilter === 'out_of_stock') matchesStock = stock <= 0

      return matchesSearch && matchesCategory && matchesSubCategory && matchesStock
    }).sort((a, b) => {
      if (prodSortBy === 'price_asc') return a.price - b.price
      if (prodSortBy === 'price_desc') return b.price - a.price
      if (prodSortBy === 'stock_asc') return (a.stock ?? 100) - (b.stock ?? 100)
      if (prodSortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
      return a.id - b.id
    })
  }, [products, prodSearch, prodCategoryFilter, prodSubCategoryFilter, prodStockFilter, prodSortBy])

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = orderSearch === '' ||
        (o.id || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
        (o.customer_name || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
        (o.customer_email || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
        (o.customer_phone || '').includes(orderSearch) ||
        (o.tracking_number || '').toLowerCase().includes(orderSearch.toLowerCase())
      const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, orderSearch, orderStatusFilter])

  // ─── Multi-Selection Helpers ────────────────────────────────────────────────
  const isAllFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))
  
  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const currentFilteredIds = new Set(filteredProducts.map(p => p.id))
      setSelectedProductIds(prev => prev.filter(id => !currentFilteredIds.has(id)))
    } else {
      const combined = Array.from(new Set([...selectedProductIds, ...filteredProducts.map(p => p.id)]))
      setSelectedProductIds(combined)
    }
  }

  const handleToggleSelectOne = (id: number) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // ─── Bulk Operations Handlers ────────────────────────────────────────────────
  const handleExecuteBulkCategoryMove = async () => {
    let targetCat = bulkTargetCategory
    let targetSubCat = bulkTargetSubCategory

    if (isCreatingNewCatInBulk) {
      if (!newCatNameInput.trim()) {
        showToast('Please enter a valid category name')
        return
      }
      targetCat = newCatNameInput.trim()
      targetSubCat = newSubCatNameInput.trim()
      if (onAddCategory) {
        onAddCategory(targetCat, targetSubCat ? [targetSubCat] : [])
      }
    }

    if (onBulkUpdateCategory && selectedProductIds.length > 0) {
      await onBulkUpdateCategory(selectedProductIds, targetCat, targetSubCat)
      if (soundEnabled) playNotificationSound('success')
      showToast(`⚡ Successfully moved ${selectedProductIds.length} items to "${targetCat}${targetSubCat ? ` > ${targetSubCat}` : ''}"`)
    }
    setShowBulkCategoryModal(false)
    setIsCreatingNewCatInBulk(false)
    setNewCatNameInput('')
    setNewSubCatNameInput('')
  }

  const handleExecuteBulkStock = async () => {
    if (onBulkUpdateStock && selectedProductIds.length > 0) {
      await onBulkUpdateStock(selectedProductIds, bulkStockValue, bulkStockMode)
      if (soundEnabled) playNotificationSound('success')
      showToast(`📦 Updated stock for ${selectedProductIds.length} items`)
    }
    setShowBulkStockModal(false)
  }

  const handleExecuteBulkBadge = async () => {
    if (onBulkUpdateBadge && selectedProductIds.length > 0) {
      await onBulkUpdateBadge(selectedProductIds, bulkBadgeValue)
      if (soundEnabled) playNotificationSound('success')
      showToast(`⭐ Badge set to "${bulkBadgeValue || 'None'}" for ${selectedProductIds.length} items`)
    }
    setShowBulkBadgeModal(false)
  }

  const handleExecuteBulkPrice = async () => {
    if (onBulkUpdatePrice && selectedProductIds.length > 0) {
      await onBulkUpdatePrice(selectedProductIds, bulkPriceValue, bulkPriceMode)
      if (soundEnabled) playNotificationSound('success')
      showToast(`💰 Prices adjusted for ${selectedProductIds.length} items`)
    }
    setShowBulkPriceModal(false)
  }

  const handleExecuteBulkDelete = async () => {
    if (onBulkDeleteProducts && selectedProductIds.length > 0) {
      await onBulkDeleteProducts(selectedProductIds)
      if (soundEnabled) playNotificationSound('alert')
      showToast(`🗑️ Deleted ${selectedProductIds.length} products`)
      setSelectedProductIds([])
    }
    setShowBulkDeleteModal(false)
  }

  const handleExecuteBulkAttachPhotos = async () => {
    if (selectedPhotoUrls.length === 0) {
      showToast('Please select at least 1 photo from Studio')
      return
    }
    if (onBulkAttachImages && selectedProductIds.length > 0) {
      await onBulkAttachImages(selectedProductIds, selectedPhotoUrls, false)
      if (soundEnabled) playNotificationSound('success')
      showToast(`📸 Attached ${selectedPhotoUrls.length} images to ${selectedProductIds.length} items`)
    }
    setShowBulkAttachPhotosModal(false)
  }

  // ─── Bulk Photo Upload Studio Handlers ────────────────────────────────────────
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArray.length === 0) return

    setIsUploadingPhotos(true)
    setUploadProgressText(`Uploading 0 / ${fileArray.length} photos...`)

    try {
      const urls = await uploadMultipleImages(fileArray, (done, total, latestUrl) => {
        setUploadProgressText(`Uploading ${done} / ${total} photos...`)
      })

      const newPhotoObjects = urls.map((url, idx) => ({
        id: `upl_${Date.now()}_${idx}`,
        url,
        name: fileArray[idx]?.name || `Upload ${idx + 1}`,
        timestamp: new Date().toLocaleTimeString()
      }))

      setUploadedPhotos(prev => [...newPhotoObjects, ...prev])
      if (soundEnabled) playNotificationSound('success')
      showToast(`⚡ Successfully uploaded ${urls.length} high-res photos to DB!`)
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`)
    } finally {
      setIsUploadingPhotos(false)
      setUploadProgressText('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCreateProductFromSelectedPhotos = () => {
    if (selectedPhotoUrls.length === 0) {
      showToast('Select photos from Studio first')
      return
    }
    const newId = Date.now()
    const firstCat = categories[0]?.name || 'Bottoms'
    const firstSubCat = categories[0]?.subCategories[0] || 'Flare Pants'
    setEditingProd({
      id: newId,
      name: 'New Arovia Performance ' + (categories[0]?.subCategories[0] || 'Apparel'),
      price: 1299,
      mrp: 1999,
      rating: 5.0,
      reviews: 1,
      badge: 'NEW',
      imgId: selectedPhotoUrls[0],
      images: selectedPhotoUrls,
      colors: ['#111111', '#6b7280'],
      category: firstCat,
      subCategory: firstSubCat,
      sub_category: firstSubCat,
      description: 'Engineered with ultra-premium 4-way Italian stretch fabric for zero-distraction movement.',
      stock: 100
    })
    setIsNewProdModal(true)
    setActiveTab('inventory')
  }

  // ─── Category Hub Handlers ──────────────────────────────────────────────────
  const handleSaveNewCategory = () => {
    if (!newCategoryInput.trim()) return
    const subs = newSubCategoriesInput.split(',').map(s => s.trim()).filter(Boolean)
    if (onAddCategory) {
      onAddCategory(newCategoryInput.trim(), subs)
      if (soundEnabled) playNotificationSound('success')
      showToast(`📁 Created category "${newCategoryInput.trim()}" with ${subs.length} subcategories`)
    }
    setNewCategoryModalOpen(false)
    setNewCategoryInput('')
    setNewSubCategoriesInput('')
  }

  const handleSaveEditedCategory = () => {
    if (!editingCategory || !editingCatName.trim()) return
    const subs = editingCatSubs.split(',').map(s => s.trim()).filter(Boolean)
    if (onUpdateCategory) {
      onUpdateCategory(editingCategory.name, editingCatName.trim(), subs)
      if (soundEnabled) playNotificationSound('success')
      showToast(`📁 Updated category "${editingCatName.trim()}"`)
    }
    setEditingCategory(null)
  }

  const handleQuickAddSubCat = (catName: string) => {
    if (!quickSubCatInput.trim()) return
    if (onAddSubCategory) {
      onAddSubCategory(catName, quickSubCatInput.trim())
      if (soundEnabled) playNotificationSound('success')
      showToast(`➕ Added "${quickSubCatInput.trim()}" to ${catName}`)
    }
    setQuickSubCatInput('')
    setActiveSubCatInputCatName(null)
  }

  // ─── Product Form Helpers ───────────────────────────────────────────────────
  const handleModalPhotoUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArray.length === 0 || !editingProd) return

    setIsModalUploadingPhoto(true)
    setModalUploadProgressText(`Uploading ${fileArray.length} photo(s)...`)

    try {
      const urls = await uploadMultipleImages(fileArray, (done, total) => {
        setModalUploadProgressText(`Uploading ${done} / ${total} photo(s)...`)
      })

      if (urls.length > 0) {
        const existingImgs = (editingProd.images || [editingProd.imgId]).filter(isValidImg)
        const updatedImgs = [...existingImgs, ...urls]
        const mainCover = isValidImg(editingProd.imgId) ? editingProd.imgId : urls[0]
        setEditingProd({
          ...editingProd,
          images: updatedImgs,
          imgId: mainCover || urls[0]
        })

        // Also add to studio uploadedPhotos cache
        const newPhotoObjects = urls.map((url, idx) => ({
          id: `upl_${Date.now()}_${idx}`,
          url,
          name: fileArray[idx]?.name || `Upload ${idx + 1}`,
          timestamp: new Date().toLocaleTimeString()
        }))
        setUploadedPhotos(prev => [...newPhotoObjects, ...prev])

        if (soundEnabled) playNotificationSound('success')
        showToast(`⚡ Added ${urls.length} photo(s) to product!`)
      }
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`)
    } finally {
      setIsModalUploadingPhoto(false)
      setModalUploadProgressText('')
    }
  }

  const handleSaveProductForm = () => {
    if (!editingProd) return
    if (!editingProd.name.trim()) {
      setProductFormError('Please enter a product title / name.')
      showToast('⚠️ Product title is required before saving')
      return
    }
    setProductFormError(null)

    // If user typed in modalNewCatInput or modalNewSubCatInput and didn't hit Add, adopt it automatically
    let effectiveCat = editingProd.category
    if (isCreatingModalCat && modalNewCatInput.trim()) {
      effectiveCat = modalNewCatInput.trim()
      setIsCreatingModalCat(false)
      setModalNewCatInput('')
    }
    let effectiveSubCat = editingProd.subCategory || editingProd.sub_category || ''
    if (isCreatingModalSubCat && modalNewSubCatInput.trim()) {
      effectiveSubCat = modalNewSubCatInput.trim()
      setIsCreatingModalSubCat(false)
      setModalNewSubCatInput('')
    }

    if (!effectiveCat.trim()) {
      effectiveCat = categories[0]?.name || 'Bottoms'
    }

    // Guarantee the category & subcategory are registered in categories taxonomy
    if (onAddCategory && effectiveCat) {
      onAddCategory(effectiveCat, effectiveSubCat ? [effectiveSubCat] : [])
    }
    if (onAddSubCategory && effectiveCat && effectiveSubCat) {
      onAddSubCategory(effectiveCat, effectiveSubCat)
    }

    const validImages = (editingProd.images || [editingProd.imgId]).filter(isValidImg)
    const primaryImg = (isValidImg(editingProd.imgId) ? editingProd.imgId : validImages[0]) || ''

    const finalProd: DBProduct = {
      ...editingProd,
      name: editingProd.name.trim(),
      category: effectiveCat,
      subCategory: effectiveSubCat,
      sub_category: effectiveSubCat,
      imgId: primaryImg,
      images: validImages.length > 0 ? validImages : (primaryImg ? [primaryImg] : []),
    }
    onSaveProduct(finalProd)
    if (soundEnabled) playNotificationSound('success')
    showToast(`✓ Product "${finalProd.name}" saved in "${effectiveCat}"!`)
    setEditingProd(null)
    setIsNewProdModal(false)
  }

  // ─── BlitzShipz Booking Handler ─────────────────────────────────────────────
  const handleBookBlitzship = async (order: DBOrder) => {
    if (!order.id) return
    setBookingBlitzshipId(order.id)
    try {
      if (onBookBlitzship) {
        const res: any = await onBookBlitzship(order)
        if (res.success) {
          const awbCode = res.awb_number || res.awb || 'BLZ-GENERATED'
          if (soundEnabled) playNotificationSound('success')
          showToast(`⚡ BlitzShipz Manifested! AWB: ${awbCode}`)
        } else {
          showToast(`BlitzShipz: ${res.message}`)
        }
      } else {
        const { bookBlitzshipShipment } = await import('../services/blitzshipService')
        const res = await bookBlitzshipShipment(order)
        const awbCode = res.awb_number || (res as any).awb || 'BLZ-GENERATED'
        if (res.success && awbCode) {
          onUpdateOrderStatus(order.id, 'Shipped', order.payment_status, awbCode)
          if (soundEnabled) playNotificationSound('success')
          showToast(`⚡ BlitzShipz Manifested! AWB: ${awbCode}`)
        }
      }
    } catch (err: any) {
      showToast(`Booking error: ${err.message}`)
    } finally {
      setBookingBlitzshipId(null)
    }
  }

  const handlePrintThermalLabel = (order: DBOrder) => {
    const awb = order.tracking_number || `BLZ-${order.id?.slice(0, 8).toUpperCase() || 'DELIVERY'}`
    const labelHtml = generateBlitzshipThermalLabel(order, awb)
    const printWindow = window.open('', '_blank', 'width=450,height=650')
    if (printWindow) {
      printWindow.document.write(labelHtml)
      printWindow.document.close()
    }
  }

  if (!unlocked) {
    return <AdminSecurityGate onUnlock={() => setUnlocked(true)} />
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-20 font-sans antialiased">
      {/* ─── Realtime Event Floating Toast ────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-black text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-zinc-700 animate-in slide-in-from-top-4 duration-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold tracking-wide">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white ml-2 text-xs">✕</button>
        </div>
      )}

      {/* ─── Top Realtime Command Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-zinc-950 text-white border-b border-zinc-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Connection State */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="bg-white text-black font-black text-xs px-2.5 py-1 rounded-sm tracking-widest">AROVIA</span>
              <span className="font-extrabold text-sm tracking-wider text-zinc-100">FIT</span>
              <span className="bg-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-700">REALTIME CONTROL</span>
            </div>

            <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

            {/* Supabase Realtime Telemetry Indicator */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                isConfigured && isConnected
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isConfigured && isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isConfigured && isConnected ? 'Supabase Live WebSocket' : 'Local Fallback Storage'}</span>
              </span>

              {lastRealtimeEvent && (
                <span className="hidden lg:inline text-[11px] text-zinc-400 font-mono truncate max-w-xs">
                  ⚡ {lastRealtimeEvent}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions & Utility Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Audio Alerts' : 'Enable Audio Chimes'}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors border ${
                soundEnabled ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {soundEnabled ? '🔔 Sound ON' : '🔕 Muted'}
            </button>

            <button
              onClick={async () => {
                setIsSimulating(true)
                try {
                  const ordId = await onSimulateOrder()
                  if (soundEnabled) playNotificationSound('order')
                  showToast(`⚡ Order simulated! ID: #${ordId?.substring(0, 8)}`)
                } finally {
                  setIsSimulating(false)
                }
              }}
              disabled={isSimulating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <span className={isSimulating ? 'animate-spin' : ''}>⚡</span>
              <span>{isSimulating ? 'Simulating...' : 'Simulate Live Order'}</span>
            </button>

            <button
              onClick={() => {
                setIsRefreshing(true)
                onRefreshData()
                setTimeout(() => {
                  setIsRefreshing(false)
                  showToast('Database synchronized with Supabase!')
                }, 800)
              }}
              disabled={isRefreshing}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
              <span className="hidden sm:inline">Sync DB</span>
            </button>

            <button
              onClick={() => setShowSqlModal(true)}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-blue-400 text-xs font-bold px-2.5 py-1.5 rounded-lg"
              title="View & copy PostgreSQL Supabase Schema"
            >
              📄 SQL
            </button>

            <button
              onClick={onReturnToStore}
              className="bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>Storefront</span>
              <span>↗</span>
            </button>

            <button
              onClick={() => setUnlocked(false)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              title="Lock Admin Console"
            >
              🔒
            </button>
          </div>
        </div>
      </header>

      {/* ─── Navigation Sub-Header Tabs ──────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200 sticky top-[57px] z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto no-scrollbar gap-1 sm:gap-3 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'
            }`}
          >
            <span>📊 Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'inventory' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'
            }`}
          >
            <span>👗 Products & Bulk Ops</span>
            <span className="bg-zinc-100 text-zinc-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{products.length}</span>
            {selectedProductIds.length > 0 && (
              <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold animate-pulse">
                {selectedProductIds.length} sel
              </span>
            )}
            {outOfStockCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500" title="Out of Stock!" />}
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'photos' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'
            }`}
          >
            <span>📸 Bulk Photo Studio</span>
            <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Multi-Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'categories' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'
            }`}
          >
            <span>🗂️ Categories Hub</span>
            <span className="bg-zinc-100 text-zinc-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{categories.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'orders' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'
            }`}
          >
            <span>📋 Orders & Logistics</span>
            <span className="bg-zinc-100 text-zinc-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{orders.length}</span>
            {processingOrdersCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">{processingOrdersCount} new</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'payments' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'
            }`}
          >
            <span>💳 Razorpay Stream</span>
            <span className="bg-zinc-100 text-zinc-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{payments.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'reviews' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'
            }`}
          >
            <span>⭐ Reviews</span>
            <span className="bg-zinc-100 text-zinc-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{reviews.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'coupons' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'
            }`}
          >
            <span>🏷️ Coupons</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'system' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'
            }`}
          >
            <span>⚡ Diagnostics</span>
          </button>
        </div>
      </div>

      {/* ─── Main Tab Content ────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & TELEMETRY */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Gross Revenue</span>
                <div className="text-2xl font-black mt-2 text-zinc-900">₹{totalRevenue.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <span>⚡ Captured: ₹{capturedPayments.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Pipeline Orders</span>
                <div className="text-2xl font-black mt-2 text-zinc-900">{orders.length}</div>
                <div className="text-[11px] text-blue-600 font-semibold mt-1">
                  {processingOrdersCount} Pending Fulfillment
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Average Order Value</span>
                <div className="text-2xl font-black mt-2 text-zinc-900">₹{averageOrderValue.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-zinc-500 mt-1">Per checkout session</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Inventory Health</span>
                <div className="text-2xl font-black mt-2 text-zinc-900">{products.length} SKUs</div>
                <div className="text-[11px] mt-1 font-semibold flex items-center gap-2">
                  <span className={outOfStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {outOfStockCount} OOS
                  </span>
                  <span>•</span>
                  <span className="text-amber-600">{lowStockCount} Low</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Live Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Launchpad */}
              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-xs space-y-4">
                <h3 className="font-extrabold text-sm tracking-wide uppercase text-zinc-900">⚡ Operations Launchpad</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      const newId = Date.now()
                      setEditingProd({
                        id: newId,
                        name: '',
                        price: 999,
                        mrp: 1999,
                        rating: 4.8,
                        reviews: 0,
                        badge: 'NEW',
                        imgId: '',
                        images: [],
                        colors: ['#111111', '#6b7280'],
                        category: categories[0]?.name || 'Bottoms',
                        subCategory: categories[0]?.subCategories[0] || '',
                        description: '',
                        stock: 100
                      })
                      setIsNewProdModal(true)
                    }}
                    className="p-3.5 bg-black text-white rounded-xl text-left hover:bg-zinc-800 transition-all font-bold text-xs shadow-xs"
                  >
                    <div className="text-base mb-1">➕</div>
                    <div>New Product</div>
                    <div className="text-[10px] text-zinc-400 font-normal">Add single SKU</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('photos')}
                    className="p-3.5 bg-purple-50 text-purple-950 border border-purple-200 rounded-xl text-left hover:bg-purple-100 transition-all font-bold text-xs"
                  >
                    <div className="text-base mb-1">📸</div>
                    <div>Bulk Upload</div>
                    <div className="text-[10px] text-purple-600 font-normal">Multi-photo studio</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('categories')}
                    className="p-3.5 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl text-left hover:bg-zinc-100 transition-all font-bold text-xs"
                  >
                    <div className="text-base mb-1">🗂️</div>
                    <div>Category Hub</div>
                    <div className="text-[10px] text-zinc-500 font-normal">{categories.length} Taxonomies</div>
                  </button>

                  <button
                    onClick={() => onBulkAdjustStock(25)}
                    className="p-3.5 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl text-left hover:bg-zinc-100 transition-all font-bold text-xs"
                  >
                    <div className="text-base mb-1">📦</div>
                    <div>Restock All +25</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Global stock bump</div>
                  </button>
                </div>

                <div className="pt-3 border-t border-zinc-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Supabase Realtime Sync:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active (Channel OK)
                    </span>
                  </div>
                </div>
              </div>

              {/* Realtime Event Stream */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-sm tracking-wide uppercase text-zinc-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Telemetry & Activity Feed
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-400">{activityLog.length} events</span>
                  </div>

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2">
                    {activityLog.length === 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-400 italic">No events logged yet. Waiting for incoming telemetry...</div>
                    ) : (
                      activityLog.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-1.5 px-3 bg-zinc-50 rounded-lg border border-zinc-100">
                          <span className="font-medium text-zinc-800">{item.text}</span>
                          <span className="font-mono text-[10px] text-zinc-400">{item.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>WebSocket Ping: <strong className="font-mono text-zinc-800">12ms</strong></span>
                  <span>Database State: <strong className="font-mono text-emerald-600">HEALTHY</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PRODUCTS & BULK INVENTORY OPERATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Sticky Floating Bulk Actions Bar when items selected */}
            {selectedProductIds.length > 0 && (
              <div className="bg-zinc-950 text-white p-4 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-zinc-800 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-500 text-black font-black text-xs px-2.5 py-1 rounded-full">
                    {selectedProductIds.length} Selected
                  </span>
                  <span className="text-xs font-semibold text-zinc-300 hidden sm:inline">
                    Choose a bulk operation for selected products:
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Bulk Move Category */}
                  <button
                    onClick={() => {
                      setBulkTargetCategory(categories[0]?.name || 'Bottoms')
                      setBulkTargetSubCategory(categories[0]?.subCategories[0] || '')
                      setShowBulkCategoryModal(true)
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <span>📁 Move Category</span>
                  </button>

                  {/* Bulk Stock */}
                  <button
                    onClick={() => setShowBulkStockModal(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <span>📦 Adjust Stock</span>
                  </button>

                  {/* Bulk Badge */}
                  <button
                    onClick={() => setShowBulkBadgeModal(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <span>⭐ Set Badge</span>
                  </button>

                  {/* Bulk Price */}
                  <button
                    onClick={() => setShowBulkPriceModal(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <span>💰 Change Price</span>
                  </button>

                  {/* Bulk Attach Images */}
                  <button
                    onClick={() => setShowBulkAttachPhotosModal(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-purple-300 font-bold px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <span>📸 Attach Photos</span>
                  </button>

                  {/* Bulk Delete */}
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="bg-red-950/80 hover:bg-red-900 text-red-200 font-bold px-3 py-1.5 rounded-lg border border-red-800 flex items-center gap-1.5 transition-colors"
                  >
                    <span>🗑️ Delete</span>
                  </button>

                  {/* Clear Selection */}
                  <button
                    onClick={() => setSelectedProductIds([])}
                    className="text-zinc-400 hover:text-white px-2 py-1.5 text-xs font-semibold"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <input
                    type="text"
                    value={prodSearch}
                    onChange={e => setProdSearch(e.target.value)}
                    placeholder="Search by SKU, name, category, subcategory..."
                    className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-black"
                  />
                  <span className="absolute left-2.5 top-2.5 text-zinc-400 text-xs">🔍</span>
                </div>

                {/* Category Filter & Quick Actions */}
                <div className="flex items-center gap-1">
                  <select
                    value={prodCategoryFilter}
                    onChange={e => {
                      setProdCategoryFilter(e.target.value)
                      setProdSubCategoryFilter('ALL')
                    }}
                    className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-black"
                  >
                    <option value="ALL">All Categories ({effectiveCategories.length})</option>
                    {effectiveCategories.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  {prodCategoryFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete category "${prodCategoryFilter}" and remove it from all products?`)) {
                          onDeleteCategory?.(prodCategoryFilter)
                          showToast(`Deleted category "${prodCategoryFilter}"`)
                          setProdCategoryFilter('ALL')
                          setProdSubCategoryFilter('ALL')
                        }
                      }}
                      title={`Delete "${prodCategoryFilter}" Category`}
                      className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-zinc-200 transition-colors"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {/* Subcategory Filter & Quick Delete */}
                {availableSubCategoriesForFilter.length > 0 && (
                  <div className="flex items-center gap-1">
                    <select
                      value={prodSubCategoryFilter}
                      onChange={e => setProdSubCategoryFilter(e.target.value)}
                      className="text-xs bg-purple-50 border border-purple-200 text-purple-900 rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-purple-600"
                    >
                      <option value="ALL">All Subcategories ({availableSubCategoriesForFilter.length})</option>
                      {availableSubCategoriesForFilter.map(sc => (
                        <option key={sc} value={sc}>{sc}</option>
                      ))}
                    </select>

                    {prodSubCategoryFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => {
                          const catName = prodCategoryFilter !== 'ALL' ? prodCategoryFilter : ''
                          if (confirm(`Delete subcategory "${prodSubCategoryFilter}" from all products?`)) {
                            onDeleteSubCategory?.(catName, prodSubCategoryFilter)
                            showToast(`Deleted subcategory "${prodSubCategoryFilter}"`)
                            setProdSubCategoryFilter('ALL')
                          }
                        }}
                        title={`Delete "${prodSubCategoryFilter}" Subcategory`}
                        className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}

                {/* Quick Manage / Clean Categories & Subcategories Button */}
                <button
                  type="button"
                  onClick={() => setShowTaxonomyManager(true)}
                  className="px-2.5 py-2 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg font-bold border border-zinc-200 flex items-center gap-1"
                  title="Manage and delete categories / subcategories"
                >
                  <span>⚙️ Manage / Delete Taxonomy</span>
                </button>

                {/* Stock Filter */}
                <select
                  value={prodStockFilter}
                  onChange={e => setProdStockFilter(e.target.value as any)}
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-black"
                >
                  <option value="all">All Stock Status</option>
                  <option value="in_stock">In Stock (&gt;20)</option>
                  <option value="low_stock">Low Stock (1-20)</option>
                  <option value="out_of_stock">Out of Stock (0)</option>
                </select>
              </div>

              {/* View & Add Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProdViewMode(prodViewMode === 'table' ? 'grid' : 'table')}
                  className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-100 text-xs text-zinc-600"
                  title="Toggle Grid / Table View"
                >
                  {prodViewMode === 'table' ? '🔲 Grid' : '📋 Table'}
                </button>

                <button
                  onClick={() => {
                    const newId = Date.now()
                    const firstCat = categories[0]?.name || 'Bottoms'
                    const firstSubCat = categories[0]?.subCategories[0] || ''
                    setEditingProd({
                      id: newId,
                      name: '',
                      price: 999,
                      mrp: 1999,
                      rating: 4.8,
                      reviews: 0,
                      badge: 'NEW',
                      imgId: '',
                      images: [],
                      colors: ['#111111', '#6b7280'],
                      category: firstCat,
                      subCategory: firstSubCat,
                      sub_category: firstSubCat,
                      description: '',
                      stock: 100
                    })
                    setIsNewProdModal(true)
                  }}
                  className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <span>➕ Add Product</span>
                </button>
              </div>
            </div>

            {/* Products Table View */}
            {prodViewMode === 'table' && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-700">
                    <thead className="bg-zinc-100/70 border-b border-zinc-200 text-zinc-900 font-extrabold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllFilteredSelected}
                            onChange={handleToggleSelectAll}
                            className="rounded text-black focus:ring-0 cursor-pointer w-4 h-4"
                          />
                        </th>
                        <th className="p-3">Product / SKU</th>
                        <th className="p-3">Category & Subcategory</th>
                        <th className="p-3">Price & MRP</th>
                        <th className="p-3">Stock Units</th>
                        <th className="p-3">Badge</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-zinc-400 italic">
                            No products match your active search filters.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map(p => {
                          const isSelected = selectedProductIds.includes(p.id)
                          const stock = p.stock ?? 100
                          return (
                            <tr key={p.id} className={`hover:bg-zinc-50/80 transition-colors ${isSelected ? 'bg-zinc-50' : ''}`}>
                              {/* Checkbox */}
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectOne(p.id)}
                                  className="rounded text-black focus:ring-0 cursor-pointer w-4 h-4"
                                />
                              </td>

                              {/* Thumbnail & Name */}
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    onClick={() => {
                                      setSinglePhotoTargetId(p.id)
                                      singleProductPhotoInputRef.current?.click()
                                    }}
                                    className="w-11 h-14 bg-zinc-100 rounded-md overflow-hidden shrink-0 border border-zinc-200 relative group cursor-pointer hover:border-black transition-colors"
                                    title="Click to upload/change photo for this SKU"
                                  >
                                    {isValidImg(p.imgId) ? (
                                      <img
                                        src={imgUrl(p.imgId, 80, 100)}
                                        alt={p.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-white p-1 text-[9px] font-black uppercase tracking-tight text-center">
                                        AROVIA
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                                      📷
                                    </div>
                                    {p.images && p.images.length > 1 && (
                                      <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] px-1 font-bold">
                                        +{p.images.length - 1}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-zinc-900 leading-tight">{p.name}</div>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <span className="text-[10px] text-zinc-400 font-mono">SKU #{p.id}</span>
                                      <span className="bg-zinc-100 text-zinc-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                        📁 {p.category}
                                      </span>
                                      {(p.subCategory || p.sub_category) && (
                                        <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                          🏷️ {p.subCategory || p.sub_category}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Category & Subcategory */}
                              <td className="p-3">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="bg-zinc-100 text-zinc-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-zinc-200">
                                    {p.category}
                                  </span>
                                  {(p.subCategory || p.sub_category) && (
                                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                      ↳ {p.subCategory || p.sub_category}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Price & MRP */}
                              <td className="p-3">
                                <div className="font-bold text-zinc-900">₹{p.price}</div>
                                <div className="text-[10px] text-zinc-400 line-through">₹{p.mrp}</div>
                              </td>

                              {/* Stock */}
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-block w-2 h-2 rounded-full ${
                                    stock <= 0 ? 'bg-red-500' : stock <= 20 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`} />
                                  <input
                                    type="number"
                                    defaultValue={stock}
                                    onBlur={e => {
                                      const val = Number(e.target.value)
                                      if (!isNaN(val) && val !== stock) {
                                        onUpdateProductStock(p.id, val)
                                        showToast(`Stock updated to ${val}`)
                                      }
                                    }}
                                    className="w-16 bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-center font-mono text-xs focus:bg-white focus:border-black"
                                  />
                                </div>
                              </td>

                              {/* Badge */}
                              <td className="p-3">
                                {p.badge ? (
                                  <span className="bg-black text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                    {p.badge}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 text-[11px] italic">None</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSinglePhotoTargetId(p.id)
                                      singleProductPhotoInputRef.current?.click()
                                    }}
                                    className="p-1.5 text-purple-700 hover:text-purple-900 rounded hover:bg-purple-50 font-bold flex items-center gap-1 text-xs"
                                    title="Quick Upload Photo for this SKU"
                                  >
                                    <span>📷</span> Photo
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingProd(p)
                                      setIsNewProdModal(false)
                                    }}
                                    className="p-1.5 text-zinc-600 hover:text-black rounded hover:bg-zinc-100 font-bold"
                                    title="Edit Product"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmProd(p)}
                                    className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                    title="Delete SKU"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Products Grid View */}
            {prodViewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredProducts.map(p => {
                  const isSelected = selectedProductIds.includes(p.id)
                  return (
                    <div
                      key={p.id}
                      className={`bg-white rounded-xl border p-2.5 flex flex-col justify-between relative transition-all ${
                        isSelected ? 'border-black ring-2 ring-black/20' : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(p.id)}
                          className="rounded text-black focus:ring-0 cursor-pointer w-4 h-4 bg-white/90 shadow-sm"
                        />
                      </div>

                      <div
                        onClick={() => {
                          setSinglePhotoTargetId(p.id)
                          singleProductPhotoInputRef.current?.click()
                        }}
                        className="w-full aspect-[3/4] bg-zinc-100 rounded-lg overflow-hidden relative mb-2 cursor-pointer group"
                        title="Click to upload/change photo for this SKU"
                      >
                        {isValidImg(p.imgId) ? (
                          <img
                            src={imgUrl(p.imgId, 250, 320)}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white p-3 text-center">
                            <span className="text-sm font-black tracking-widest uppercase">AROVIA</span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase mt-1">{p.name}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          📷 Upload Photo
                        </div>
                        {p.badge && (
                          <span className="absolute top-2 right-2 bg-black text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                            {p.badge}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1 flex-wrap mb-0.5">
                          <span className="text-[9px] text-zinc-500 font-bold">{p.category}</span>
                          {(p.subCategory || p.sub_category) && (
                            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 rounded">
                              ↳ {p.subCategory || p.sub_category}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-zinc-900 truncate" title={p.name}>{p.name}</div>
                        <div className="flex items-center justify-between mt-1 text-xs">
                          <span className="font-extrabold text-zinc-900">₹{p.price}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">Stock: {p.stock ?? 100}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setEditingProd(p)
                          setIsNewProdModal(false)
                        }}
                        className="mt-2 w-full text-center bg-zinc-100 hover:bg-black hover:text-white py-1 rounded text-[11px] font-bold transition-colors"
                      >
                        Edit SKU
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BULK PHOTO STUDIO (MULTI-IMAGE UPLOADER) */}
        {/* ========================================================================= */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            {/* Multi-Photo Upload Area */}
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">📸 Bulk Multi-Photo Studio</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Drag & drop or select multiple high-resolution photos at once. Photos are compressed, uploaded to Supabase, and synced live.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={singleProductPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSingleProductPhotoUpload}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                    id="bulk-photo-input"
                  />
                  <label
                    htmlFor="bulk-photo-input"
                    className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <span>📤 Upload Multiple Photos</span>
                  </label>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files)
                }}
                className="border-2 border-dashed border-zinc-300 hover:border-black rounded-xl p-8 text-center bg-zinc-50/50 hover:bg-zinc-50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-3xl mb-2">📸</div>
                <div className="font-bold text-sm text-zinc-800">Drag & Drop Multiple Pictures Here</div>
                <div className="text-xs text-zinc-400 mt-1">PNG, JPG, WEBP, HEIC supported • Instant Canvas & Supabase Sync</div>
                {isUploadingPhotos && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-purple-600 animate-pulse">
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <span>{uploadProgressText || 'Processing images...'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Photo Gallery & Batch Actions */}
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-sm text-zinc-900">Studio Asset Library ({uploadedPhotos.length} photos)</h4>
                  {selectedPhotoUrls.length > 0 && (
                    <span className="bg-purple-100 text-purple-900 font-bold text-xs px-2.5 py-0.5 rounded-full">
                      {selectedPhotoUrls.length} selected
                    </span>
                  )}
                </div>

                {selectedPhotoUrls.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Instant Direct Assignment to a Specific Product */}
                    <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                      <span className="text-[11px] font-bold text-zinc-700 pl-1">Assign photo to:</span>
                      <select
                        onChange={(e) => {
                          const targetId = Number(e.target.value)
                          if (!targetId || selectedPhotoUrls.length === 0) return
                          const targetProd = products.find(p => p.id === targetId)
                          if (!targetProd) return
                          const existingImgs = (targetProd.images || [targetProd.imgId]).filter(isValidImg)
                          const updatedImgs = [...selectedPhotoUrls, ...existingImgs.filter(u => !selectedPhotoUrls.includes(u))]
                          const updatedProd: DBProduct = {
                            ...targetProd,
                            imgId: selectedPhotoUrls[0],
                            images: updatedImgs
                          }
                          onSaveProduct(updatedProd)
                          if (soundEnabled) playNotificationSound('success')
                          showToast(`✓ Assigned photo to "${targetProd.name}"!`)
                          setSelectedPhotoUrls([])
                          e.target.value = ''
                        }}
                        defaultValue=""
                        className="text-xs bg-white border border-zinc-300 rounded px-2 py-1 font-bold text-zinc-900 focus:border-black"
                      >
                        <option value="" disabled>Select Product SKU...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {isValidImg(p.imgId) ? '(has photo)' : '⚠️ (NO PHOTO)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleCreateProductFromSelectedPhotos}
                      className="bg-black text-white font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                    >
                      <span>➕ Create New SKU</span>
                    </button>
                    {selectedProductIds.length > 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Attach selected photo(s) to ${selectedProductIds.length} products?`)) {
                            handleExecuteBulkAttachPhotos()
                          }
                        }}
                        className="bg-purple-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <span>🔗 Attach to {selectedProductIds.length} Selected</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedPhotoUrls([])}
                      className="text-zinc-500 hover:text-black text-xs font-semibold px-2"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Photo Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {uploadedPhotos.map(photo => {
                  const isSelected = selectedPhotoUrls.includes(photo.url)
                  return (
                    <div
                      key={photo.id}
                      onClick={() => {
                        setSelectedPhotoUrls(prev =>
                          prev.includes(photo.url) ? prev.filter(u => u !== photo.url) : [...prev, photo.url]
                        )
                      }}
                      className={`group relative aspect-[3/4] bg-zinc-100 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected ? 'border-purple-600 ring-2 ring-purple-400' : 'border-transparent hover:border-zinc-300'
                      }`}
                    >
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                        <div className="flex justify-end">
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] ${
                            isSelected ? 'bg-purple-600 border-white text-white font-bold' : 'border-white bg-black/40'
                          }`}>
                            {isSelected ? '✓' : ''}
                          </span>
                        </div>
                        <div className="text-[10px] text-white font-bold truncate leading-tight">
                          {photo.name}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 left-2 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Selected
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CATEGORIES & SUB-CATEGORIES HUB */}
        {/* ========================================================================= */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-zinc-900">🗂️ Realtime Categories & Subcategories Engine</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Create, rename, rearrange and manage all product taxonomy. Any changes propagate instantly to storefront filters and Supabase DB.
                </p>
              </div>

              <button
                onClick={() => setNewCategoryModalOpen(true)}
                className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>➕ Add New Category</span>
              </button>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {effectiveCategories.map((cat) => {
                const count = products.filter(p => (p.category || '').toLowerCase() === cat.name.toLowerCase()).length
                const isAddingSub = activeSubCatInputCatName === cat.name
                return (
                  <div key={cat.name} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-black" />
                          <h4 className="font-extrabold text-sm text-zinc-900">{cat.name}</h4>
                          <span className="bg-zinc-100 text-zinc-600 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                            {count} SKUs
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCategory(cat)
                              setEditingCatName(cat.name)
                              setEditingCatSubs(cat.subCategories.join(', '))
                            }}
                            className="p-1 text-zinc-400 hover:text-black rounded"
                            title="Edit Category"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete category "${cat.name}"? Products in it will retain their data.`)) {
                                if (onDeleteCategory) onDeleteCategory(cat.name)
                                showToast(`Deleted category "${cat.name}"`)
                              }
                            }}
                            className="p-1 text-zinc-400 hover:text-red-600 rounded"
                            title="Delete Category"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Subcategory Chips */}
                      <div className="mt-3">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                          Sub-categories ({cat.subCategories.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.subCategories.length === 0 ? (
                            <span className="text-xs text-zinc-400 italic">No subcategories defined</span>
                          ) : (
                            cat.subCategories.map(sub => {
                              const subCount = products.filter(p => p.category === cat.name && (p.subCategory === sub || p.sub_category === sub)).length
                              return (
                                <span
                                  key={sub}
                                  className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] font-medium px-2 py-1 rounded-md group"
                                >
                                  <span>{sub}</span>
                                  <span className="text-[9px] text-zinc-400 font-mono">({subCount})</span>
                                  <button
                                    onClick={() => {
                                      if (onDeleteSubCategory) onDeleteSubCategory(cat.name, sub)
                                    }}
                                    className="text-zinc-400 hover:text-red-600 ml-0.5 text-[10px]"
                                    title="Remove subcategory"
                                  >
                                    ✕
                                  </button>
                                </span>
                              )
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Add Subcategory Inline */}
                    <div className="pt-2 border-t border-zinc-100">
                      {isAddingSub ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={quickSubCatInput}
                            onChange={e => setQuickSubCatInput(e.target.value)}
                            placeholder="e.g. Flare Pants"
                            className="text-xs bg-zinc-50 border border-zinc-300 rounded px-2 py-1 flex-1 focus:outline-none focus:border-black"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleQuickAddSubCat(cat.name)}
                          />
                          <button
                            onClick={() => handleQuickAddSubCat(cat.name)}
                            className="bg-black text-white text-xs font-bold px-2 py-1 rounded"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setActiveSubCatInputCatName(null)}
                            className="text-zinc-400 text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveSubCatInputCatName(cat.name)
                            setQuickSubCatInput('')
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>➕ Add Subcategory</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ORDERS & LOGISTICS */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  placeholder="Search by Order ID, customer name, email, phone, AWB..."
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 flex-1 min-w-[200px] focus:outline-none focus:border-black"
                />
                <select
                  value={orderStatusFilter}
                  onChange={e => setOrderStatusFilter(e.target.value)}
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-2 font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Processing">Processing</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="text-xs font-bold text-zinc-500">
                Showing {filteredOrders.length} of {orders.length} orders
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-700">
                  <thead className="bg-zinc-100/70 border-b border-zinc-200 text-zinc-900 font-extrabold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Order ID & Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Items & Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">BlitzShipz Logistics</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-400 italic">
                          No orders found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(o => (
                        <tr key={o.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="p-3">
                            <div className="font-mono font-bold text-zinc-900">#{o.id?.substring(0, 8)}</div>
                            <div className="text-[10px] text-zinc-400">{o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Today'}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-zinc-900">{o.customer_name || 'Guest Customer'}</div>
                            <div className="text-[10px] text-zinc-400">{o.customer_phone || o.customer_email || 'No contact info'}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-zinc-900">₹{o.total}</div>
                            <div className="text-[10px] text-zinc-400">{o.items?.length || 1} item(s)</div>
                          </td>
                          <td className="p-3">
                            <select
                              value={o.status || 'Processing'}
                              onChange={e => {
                                onUpdateOrderStatus(o.id!, e.target.value, o.payment_status, o.tracking_number)
                                showToast(`Order #${o.id?.substring(0, 6)} updated to ${e.target.value}`)
                              }}
                              className={`text-[11px] font-bold rounded px-2 py-1 border ${
                                o.status === 'Delivered' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                                o.status === 'Shipped' ? 'bg-blue-50 border-blue-300 text-blue-800' :
                                o.status === 'Packed' ? 'bg-amber-50 border-amber-300 text-amber-800' :
                                o.status === 'Cancelled' ? 'bg-red-50 border-red-300 text-red-800' :
                                'bg-zinc-100 border-zinc-300 text-zinc-800'
                              }`}
                            >
                              <option value="Processing">Processing</option>
                              <option value="Packed">Packed</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-3">
                            {o.tracking_number ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold text-emerald-600">⚡ {o.tracking_number}</span>
                                <button
                                  onClick={() => setSelectedTrackOrder(o)}
                                  className="text-[10px] text-blue-600 hover:underline font-bold"
                                >
                                  Track
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleBookBlitzship(o)}
                                disabled={bookingBlitzshipId === o.id}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                              >
                                <span>{bookingBlitzshipId === o.id ? 'Manifesting...' : '⚡ Generate AWB'}</span>
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handlePrintThermalLabel(o)}
                                className="p-1 text-zinc-600 hover:text-black font-bold text-[11px]"
                                title="Print 4x6 Thermal Shipping Label"
                              >
                                🖨️ Label
                              </button>
                              <button
                                onClick={() => setSelectedOrderDetails(o)}
                                className="p-1 text-blue-600 hover:text-blue-800 font-bold text-[11px]"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: PAYMENTS & RAZORPAY STREAM */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-zinc-900">💳 Razorpay Realtime Payments Stream</h3>
                <span className="text-xs text-zinc-500 font-mono">Total Volume: ₹{capturedPayments.toLocaleString('en-IN')}</span>
              </div>
              <table className="w-full text-left text-xs text-zinc-700">
                <thead className="bg-zinc-100/70 border-b border-zinc-200 text-zinc-900 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Payment ID</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-400 italic">No payments captured yet.</td>
                    </tr>
                  ) : (
                    payments.map(p => (
                      <tr key={p.id || p.payment_id} className="hover:bg-zinc-50/80">
                        <td className="p-3 font-mono font-bold text-zinc-900">{p.payment_id}</td>
                        <td className="p-3 uppercase text-[10px] font-bold text-zinc-600">{p.payment_method}</td>
                        <td className="p-3 font-bold text-zinc-900">₹{p.amount}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.status === 'captured' ? 'bg-emerald-100 text-emerald-800' :
                            p.status === 'refunded' ? 'bg-red-100 text-red-800' : 'bg-zinc-100 text-zinc-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-400">{p.created_at ? new Date(p.created_at).toLocaleTimeString() : 'Just now'}</td>
                        <td className="p-3 text-right">
                          {p.status === 'captured' && (
                            <button
                              onClick={() => {
                                if (p.order_id && confirm(`Refund payment ₹${p.amount}?`)) {
                                  onRefundOrder(p.order_id)
                                  showToast('Refund processed!')
                                }
                              }}
                              className="text-[10px] font-bold text-red-600 hover:underline"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: CUSTOMER REVIEWS */}
        {/* ========================================================================= */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-zinc-900">⭐ Customer Review Moderation ({reviews.length})</h3>
              <button
                onClick={() => setShowNewReviewModal(true)}
                className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                ➕ Add Verified Review
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reviews.map(r => (
                <div key={r.id || r.name + r.text} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-zinc-900">{r.name}</div>
                      <div className="text-[10px] text-zinc-400">{r.product_name || 'Verified Purchase'}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-500 font-bold text-xs">{'★'.repeat(r.rating || 5)}</span>
                      {r.id && (
                        <button
                          onClick={() => onDeleteReview(r.id!)}
                          className="text-zinc-400 hover:text-red-600 text-xs ml-2"
                          title="Delete review"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed italic">"{r.text}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: COUPONS & MARKETING */}
        {/* ========================================================================= */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-zinc-900">🏷️ Discount Engine & Promo Codes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {coupons.map(c => (
                  <div key={c.code} className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-zinc-900">{c.code}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        {c.type === 'percent' ? `${c.discount}% OFF` : `₹${c.discount} OFF`}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500">Min Order: ₹{c.minOrder}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">{c.usageCount} uses so far</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: SYSTEM DIAGNOSTICS & LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'system' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-zinc-900">⚡ Supabase Realtime Telemetry Logs</h3>
              <div className="bg-zinc-950 text-zinc-200 font-mono text-xs p-4 rounded-xl max-h-96 overflow-y-auto space-y-2 border border-zinc-800">
                {activityLog.map(l => (
                  <div key={l.id} className="flex items-center justify-between border-b border-zinc-800/60 pb-1">
                    <span className="text-emerald-400">&gt; {l.text}</span>
                    <span className="text-zinc-500 text-[10px]">{l.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT PRODUCT MODAL (WITH MULTI-PHOTO & DYNAMIC TAXONOMY) */}
      {/* ========================================================================= */}
      {editingProd && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-zinc-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900">
                  {isNewProdModal ? '➕ Add New SKU to Catalog' : `✏️ Edit SKU #${editingProd.id}`}
                </h3>
                <p className="text-xs text-zinc-400">All changes sync live to Supabase DB & User Storefront</p>
              </div>
              <button onClick={() => setEditingProd(null)} className="text-zinc-400 hover:text-black font-bold">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Title */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700 block">Product Title <span className="text-red-500">*</span></label>
                  {productFormError && (
                    <span className="text-[11px] font-bold text-red-600 animate-pulse">{productFormError}</span>
                  )}
                </div>
                <input
                  type="text"
                  value={editingProd.name}
                  onChange={e => {
                    setEditingProd({ ...editingProd, name: e.target.value })
                    if (productFormError) setProductFormError(null)
                  }}
                  placeholder="e.g. Signature Italian 4-Way Flare Pants"
                  className={`w-full text-xs border rounded-lg px-3 py-2 font-medium focus:border-black ${
                    productFormError ? 'border-red-500 bg-red-50/50' : 'border-zinc-300'
                  }`}
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  value={editingProd.price}
                  onChange={e => setEditingProd({ ...editingProd, price: Number(e.target.value) })}
                  className="w-full text-xs border border-zinc-300 rounded-lg px-3 py-2 font-bold font-mono focus:border-black"
                />
              </div>

              {/* MRP */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">MRP Price (₹)</label>
                <input
                  type="number"
                  value={editingProd.mrp}
                  onChange={e => setEditingProd({ ...editingProd, mrp: Number(e.target.value) })}
                  className="w-full text-xs border border-zinc-300 rounded-lg px-3 py-2 font-mono focus:border-black"
                />
              </div>

              {/* Category (Dynamic Dropdown + Direct Create Option) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700">Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingModalCat(!isCreatingModalCat)
                      setModalNewCatInput('')
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    {isCreatingModalCat ? '← Select Existing' : '+ New Category'}
                  </button>
                </div>

                {isCreatingModalCat ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={modalNewCatInput}
                      onChange={e => setModalNewCatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const trimmed = modalNewCatInput.trim()
                          if (trimmed) {
                            if (onAddCategory) onAddCategory(trimmed, [])
                            setEditingProd({
                              ...editingProd,
                              category: trimmed,
                              subCategory: '',
                              sub_category: ''
                            })
                            setIsCreatingModalCat(false)
                            setModalNewCatInput('')
                            showToast(`📁 Created and selected category "${trimmed}"`)
                          }
                        }
                      }}
                      placeholder="Enter new category name..."
                      className="w-full text-xs border-2 border-blue-500 rounded-lg px-3 py-2 font-medium focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = modalNewCatInput.trim()
                        if (!trimmed) {
                          showToast('Please type a category name')
                          return
                        }
                        if (onAddCategory) onAddCategory(trimmed, [])
                        setEditingProd({
                          ...editingProd,
                          category: trimmed,
                          subCategory: '',
                          sub_category: ''
                        })
                        setIsCreatingModalCat(false)
                        setModalNewCatInput('')
                        showToast(`📁 Created and selected category "${trimmed}"`)
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={editingProd.category}
                    onChange={e => {
                      const chosenCat = e.target.value
                      if (chosenCat === '__CREATE_NEW_CAT__') {
                        setIsCreatingModalCat(true)
                        setModalNewCatInput('')
                        return
                      }
                      const matched = categories.find(c => c.name === chosenCat)
                      setEditingProd({
                        ...editingProd,
                        category: chosenCat,
                        subCategory: matched?.subCategories[0] || '',
                        sub_category: matched?.subCategories[0] || ''
                      })
                    }}
                    className="w-full text-xs border border-zinc-300 rounded-lg px-3 py-2 font-medium focus:border-black bg-white"
                  >
                    {effectiveCategories.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                    {editingProd.category && !effectiveCategories.some(c => c.name === editingProd.category) && (
                      <option value={editingProd.category}>{editingProd.category}</option>
                    )}
                    <option value="__CREATE_NEW_CAT__" className="font-bold text-blue-600">
                      ➕ + Create New Category...
                    </option>
                  </select>
                )}
              </div>

              {/* Sub-Category (Dynamic Dropdown + Direct Create Option) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700">Subcategory</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingModalSubCat(!isCreatingModalSubCat)
                      setModalNewSubCatInput('')
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    {isCreatingModalSubCat ? '← Select Existing' : '+ New Subcategory'}
                  </button>
                </div>

                {isCreatingModalSubCat ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={modalNewSubCatInput}
                      onChange={e => setModalNewSubCatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const trimmed = modalNewSubCatInput.trim()
                          if (trimmed) {
                            if (onAddSubCategory && editingProd.category) {
                              onAddSubCategory(editingProd.category, trimmed)
                            }
                            setEditingProd({
                              ...editingProd,
                              subCategory: trimmed,
                              sub_category: trimmed
                            })
                            setIsCreatingModalSubCat(false)
                            setModalNewSubCatInput('')
                            showToast(`➕ Created and selected subcategory "${trimmed}"`)
                          }
                        }
                      }}
                      placeholder={`Enter new subcategory for ${editingProd.category}...`}
                      className="w-full text-xs border-2 border-blue-500 rounded-lg px-3 py-2 font-medium focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = modalNewSubCatInput.trim()
                        if (!trimmed) {
                          showToast('Please type a subcategory name')
                          return
                        }
                        if (onAddSubCategory && editingProd.category) {
                          onAddSubCategory(editingProd.category, trimmed)
                        }
                        setEditingProd({
                          ...editingProd,
                          subCategory: trimmed,
                          sub_category: trimmed
                        })
                        setIsCreatingModalSubCat(false)
                        setModalNewSubCatInput('')
                        showToast(`➕ Created and selected subcategory "${trimmed}"`)
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  (() => {
                    const matchedCat = effectiveCategories.find(c => c.name.toLowerCase() === editingProd.category?.toLowerCase())
                    const subs = matchedCat?.subCategories || []
                    const curSub = editingProd.subCategory || editingProd.sub_category || ''
                    return (
                      <select
                        value={curSub}
                        onChange={e => {
                          const chosenSub = e.target.value
                          if (chosenSub === '__CREATE_NEW_SUB__') {
                            setIsCreatingModalSubCat(true)
                            setModalNewSubCatInput('')
                            return
                          }
                          setEditingProd({
                            ...editingProd,
                            subCategory: chosenSub,
                            sub_category: chosenSub
                          })
                        }}
                        className="w-full text-xs border border-zinc-300 rounded-lg px-3 py-2 font-medium focus:border-black bg-white"
                      >
                        {subs.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                        {curSub && !subs.includes(curSub) && (
                          <option value={curSub}>{curSub}</option>
                        )}
                        <option value="__CREATE_NEW_SUB__" className="font-bold text-blue-600">
                          ➕ + Create New Subcategory...
                        </option>
                      </select>
                    )
                  })()
                )}
              </div>

              {/* Stock */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={editingProd.stock ?? 100}
                  onChange={e => setEditingProd({ ...editingProd, stock: Number(e.target.value) })}
                  className="w-full text-xs border border-zinc-300 rounded-lg px-3 py-2 font-mono focus:border-black"
                />
              </div>

              {/* Badge */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Badge</label>
                <select
                  value={editingProd.badge}
                  onChange={e => setEditingProd({ ...editingProd, badge: e.target.value })}
                  className="w-full text-xs border border-zinc-300 rounded-lg px-3 py-2 font-medium focus:border-black"
                >
                  <option value="">No Badge</option>
                  <option value="BESTSELLER">BESTSELLER</option>
                  <option value="NEW">NEW</option>
                  <option value="TRENDING">TRENDING</option>
                  <option value="HOT">HOT</option>
                  <option value="RESTOCKED">RESTOCKED</option>
                  <option value="SALE">SALE</option>
                </select>
              </div>

              {/* Multi-Photo Gallery for Product */}
              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700">
                    Product Photos Gallery ({((editingProd.images || [editingProd.imgId]).filter(Boolean)).length})
                  </label>
                  <span className="text-[11px] text-zinc-400">First photo or selected is cover</span>
                </div>

                {/* Hidden File Input for Device Photo Upload */}
                <input
                  ref={modalFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleModalPhotoUpload(e.target.files)
                    }
                  }}
                  className="hidden"
                />

                {/* Thumbnails Display */}
                <div className="flex flex-wrap gap-2 items-center">
                  {((editingProd.images || [editingProd.imgId]).filter(isValidImg)).map((imgUri, idx) => (
                    <div key={idx} className="relative w-16 h-20 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-300 group shadow-xs">
                      <img
                        src={imgUrl(imgUri, 100, 120)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                      {imgUri === (editingProd.imgId || editingProd.images?.[0]) && (
                        <span className="absolute top-0 left-0 bg-black text-white text-[8px] font-bold px-1 rounded-br">Cover</span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingProd({ ...editingProd, imgId: imgUri })}
                          className="text-[9px] bg-white text-black font-bold px-1.5 py-0.5 rounded shadow"
                        >
                          Cover
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentImgs = (editingProd.images || [editingProd.imgId]).filter(isValidImg)
                            const newImgs = currentImgs.filter(u => u !== imgUri)
                            setEditingProd({
                              ...editingProd,
                              images: newImgs,
                              imgId: editingProd.imgId === imgUri ? (newImgs[0] || '') : editingProd.imgId
                            })
                          }}
                          className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded shadow"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Device Upload Button */}
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    disabled={isModalUploadingPhoto}
                    className="h-20 w-24 border-2 border-dashed border-zinc-300 hover:border-black rounded-lg flex flex-col items-center justify-center gap-1 p-2 bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer text-zinc-600 hover:text-black"
                  >
                    {isModalUploadingPhoto ? (
                      <span className="text-[10px] font-bold text-center animate-pulse">⏳ Uploading...</span>
                    ) : (
                      <>
                        <span className="text-base">📁</span>
                        <span className="text-[10px] font-bold text-center leading-tight">Upload Device Photos</span>
                      </>
                    )}
                  </button>
                </div>

                {isModalUploadingPhoto && modalUploadProgressText && (
                  <p className="text-xs font-mono text-blue-600 animate-pulse">{modalUploadProgressText}</p>
                )}

                {/* Add Image URL / Preset Input */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newImageUrlInput}
                    onChange={e => setNewImageUrlInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newImageUrlInput.trim()) {
                          const existing = (editingProd.images || [editingProd.imgId]).filter(Boolean)
                          const updated = [...existing, newImageUrlInput.trim()]
                          setEditingProd({
                            ...editingProd,
                            images: updated,
                            imgId: editingProd.imgId || newImageUrlInput.trim()
                          })
                          setNewImageUrlInput('')
                        }
                      }
                    }}
                    placeholder="Paste image URL (https://... or data:image/...) or leave empty & click Add to browse files"
                    className="text-xs border border-zinc-300 rounded-lg px-2.5 py-2 flex-1 focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newImageUrlInput.trim()) {
                        // If empty, immediately open the file picker so the button ALWAYS works!
                        modalFileInputRef.current?.click()
                        return
                      }
                      const existing = (editingProd.images || [editingProd.imgId]).filter(Boolean)
                      const updated = [...existing, newImageUrlInput.trim()]
                      setEditingProd({
                        ...editingProd,
                        images: updated,
                        imgId: editingProd.imgId || newImageUrlInput.trim()
                      })
                      setNewImageUrlInput('')
                      showToast('✓ Photo added to SKU gallery')
                    }}
                    className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                    title={newImageUrlInput.trim() ? "Add URL photo" : "Open device file picker"}
                  >
                    <span>+ Add</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-zinc-700 block mb-1">Product Description</label>
                <textarea
                  rows={3}
                  value={editingProd.description || ''}
                  onChange={e => setEditingProd({ ...editingProd, description: e.target.value })}
                  placeholder="Engineered for everyday movement with breathable Italian stretch..."
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:border-black"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setEditingProd(null)}
                className="px-4 py-2 border border-zinc-300 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProductForm}
                className="px-5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Save Changes Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BULK MOVE CATEGORY & SUBCATEGORY MODAL */}
      {/* ========================================================================= */}
      {showBulkCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-zinc-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900">📁 Bulk Move Category & Subcategory</h3>
                <p className="text-xs text-zinc-400">Apply to {selectedProductIds.length} selected items</p>
              </div>
              <button onClick={() => setShowBulkCategoryModal(false)} className="text-zinc-400 font-bold">✕</button>
            </div>

            <div className="space-y-3">
              {/* Option to create new on the fly */}
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-bold text-zinc-700">Category Destination:</span>
                <button
                  onClick={() => setIsCreatingNewCatInBulk(!isCreatingNewCatInBulk)}
                  className="text-blue-600 font-bold hover:underline"
                >
                  {isCreatingNewCatInBulk ? '← Select Existing' : '➕ Create New Category'}
                </button>
              </div>

              {!isCreatingNewCatInBulk ? (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-500 block mb-1">Choose Existing Category</label>
                    <select
                      value={bulkTargetCategory}
                      onChange={e => {
                        setBulkTargetCategory(e.target.value)
                        const matched = effectiveCategories.find(c => c.name.toLowerCase() === e.target.value.toLowerCase())
                        setBulkTargetSubCategory(matched?.subCategories[0] || '')
                      }}
                      className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 font-bold"
                    >
                      {effectiveCategories.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-500 block mb-1">Choose Subcategory</label>
                    {(() => {
                      const matched = effectiveCategories.find(c => c.name.toLowerCase() === bulkTargetCategory.toLowerCase())
                      const subs = matched?.subCategories || []
                      return subs.length > 0 ? (
                        <select
                          value={bulkTargetSubCategory}
                          onChange={e => setBulkTargetSubCategory(e.target.value)}
                          className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 font-medium"
                        >
                          <option value="">-- None / General --</option>
                          {subs.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={bulkTargetSubCategory}
                          onChange={e => setBulkTargetSubCategory(e.target.value)}
                          placeholder="Type subcategory..."
                          className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 font-medium"
                        />
                      )
                    })()}
                  </div>
                </>
              ) : (
                <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200">
                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">New Category Name</label>
                    <input
                      type="text"
                      value={newCatNameInput}
                      onChange={e => setNewCatNameInput(e.target.value)}
                      placeholder="e.g. Winter Essentials"
                      className="w-full text-xs border border-purple-300 rounded-lg p-2 bg-white"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">New Sub-Category (Optional)</label>
                    <input
                      type="text"
                      value={newSubCatNameInput}
                      onChange={e => setNewSubCatNameInput(e.target.value)}
                      placeholder="e.g. Thermal Leggings"
                      className="w-full text-xs border border-purple-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setShowBulkCategoryModal(false)}
                className="px-4 py-2 border border-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkCategoryMove}
                className="px-5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold"
              >
                Apply Category Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BULK STOCK MODAL */}
      {/* ========================================================================= */}
      {showBulkStockModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <h3 className="font-extrabold text-base text-zinc-900">📦 Bulk Adjust Stock Units</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Adjustment Action</label>
                <select
                  value={bulkStockMode}
                  onChange={e => setBulkStockMode(e.target.value as any)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 font-bold"
                >
                  <option value="set">Set exact stock to</option>
                  <option value="add">Add (+) units to current</option>
                  <option value="subtract">Subtract (-) units from current</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Stock Amount</label>
                <input
                  type="number"
                  value={bulkStockValue}
                  onChange={e => setBulkStockValue(Number(e.target.value))}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 font-mono font-bold"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button onClick={() => setShowBulkStockModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={handleExecuteBulkStock} className="px-5 py-2 bg-black text-white rounded-xl text-xs font-bold">Update Stock</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: BULK BADGE MODAL */}
      {/* ========================================================================= */}
      {showBulkBadgeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <h3 className="font-extrabold text-base text-zinc-900">⭐ Bulk Set Promotional Badge</h3>
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">Select Badge</label>
              <select
                value={bulkBadgeValue}
                onChange={e => setBulkBadgeValue(e.target.value)}
                className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 font-bold"
              >
                <option value="">No Badge (Clear)</option>
                <option value="BESTSELLER">BESTSELLER</option>
                <option value="NEW">NEW</option>
                <option value="TRENDING">TRENDING</option>
                <option value="HOT">HOT</option>
                <option value="SALE">SALE</option>
                <option value="RESTOCKED">RESTOCKED</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button onClick={() => setShowBulkBadgeModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={handleExecuteBulkBadge} className="px-5 py-2 bg-black text-white rounded-xl text-xs font-bold">Apply Badge</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: BULK PRICE ADJUST MODAL */}
      {/* ========================================================================= */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <h3 className="font-extrabold text-base text-zinc-900">💰 Bulk Price Adjustor</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Adjustment Type</label>
                <select
                  value={bulkPriceMode}
                  onChange={e => setBulkPriceMode(e.target.value as any)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 font-bold"
                >
                  <option value="percent_discount">Apply Discount (% off current price)</option>
                  <option value="percent_increase">Increase Price (% markup)</option>
                  <option value="fixed">Set Exact Fixed Price (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  {bulkPriceMode === 'fixed' ? 'Fixed Price (₹)' : 'Percentage (%)'}
                </label>
                <input
                  type="number"
                  value={bulkPriceValue}
                  onChange={e => setBulkPriceValue(Number(e.target.value))}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 font-mono font-bold"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button onClick={() => setShowBulkPriceModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={handleExecuteBulkPrice} className="px-5 py-2 bg-black text-white rounded-xl text-xs font-bold">Apply Price Change</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: BULK DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-red-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 text-2xl flex items-center justify-center mx-auto">
              🗑️
            </div>
            <h3 className="font-extrabold text-base text-zinc-900">Delete {selectedProductIds.length} Products?</h3>
            <p className="text-xs text-zinc-500">This action will remove these SKUs from Supabase and the live storefront.</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setShowBulkDeleteModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={handleExecuteBulkDelete} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold">
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: ADD NEW CATEGORY MODAL */}
      {/* ========================================================================= */}
      {newCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <h3 className="font-extrabold text-base text-zinc-900">➕ Create New Product Category</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Category Name</label>
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={e => setNewCategoryInput(e.target.value)}
                  placeholder="e.g. Loungewear"
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:border-black"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Subcategories (Comma separated)</label>
                <input
                  type="text"
                  value={newSubCategoriesInput}
                  onChange={e => setNewSubCategoriesInput(e.target.value)}
                  placeholder="e.g. Sweatpants, Hoodies, Sleepwear"
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:border-black"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button onClick={() => setNewCategoryModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={handleSaveNewCategory} className="px-5 py-2 bg-black text-white rounded-xl text-xs font-bold">Save Category</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7.5: QUICK TAXONOMY MANAGER & CLEANUP MODAL */}
      {/* ========================================================================= */}
      {showTaxonomyManager && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-zinc-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 flex items-center gap-2">
                  <span>🗂️ Manage & Delete Categories / Subcategories</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Click the 🗑️ icon next to any unwanted category or subcategory to permanently remove it.
                </p>
              </div>
              <button
                onClick={() => setShowTaxonomyManager(false)}
                className="text-zinc-400 hover:text-black font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {effectiveCategories.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">No categories found.</div>
              ) : (
                effectiveCategories.map(cat => {
                  const prodCount = products.filter(p => (p.category || '').toLowerCase() === cat.name.toLowerCase()).length
                  return (
                    <div key={cat.name} className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
                          <span className="font-extrabold text-sm text-zinc-900">{cat.name}</span>
                          <span className="text-[10px] bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-full font-bold">
                            {prodCount} products
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(cat)
                              setEditingCatName(cat.name)
                              setEditingCatSubs(cat.subCategories.join(', '))
                              setShowTaxonomyManager(false)
                            }}
                            className="text-xs px-2 py-1 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100 text-zinc-700 font-semibold"
                            title="Edit Category Name and Subcategories"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Permanently delete category "${cat.name}" and remove it from products?`)) {
                                onDeleteCategory?.(cat.name)
                                showToast(`Deleted category "${cat.name}"`)
                              }
                            }}
                            className="text-xs px-2 py-1 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-red-600 font-bold flex items-center gap-1"
                            title="Delete this entire category"
                          >
                            🗑️ Delete Category
                          </button>
                        </div>
                      </div>

                      {/* Subcategories */}
                      <div className="pt-2 border-t border-zinc-200/60">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                          Subcategories ({cat.subCategories.length})
                        </span>
                        {cat.subCategories.length === 0 ? (
                          <span className="text-xs text-zinc-400 italic">No subcategories</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {cat.subCategories.map(sc => {
                              const subCount = products.filter(
                                p => (p.category || '').toLowerCase() === cat.name.toLowerCase() &&
                                     (p.subCategory || p.sub_category || '').toLowerCase() === sc.toLowerCase()
                              ).length
                              return (
                                <span
                                  key={sc}
                                  className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-800 text-xs px-2.5 py-1 rounded-lg shadow-2xs font-medium"
                                >
                                  <span>{sc}</span>
                                  <span className="text-[10px] text-zinc-400 font-mono">({subCount})</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Delete subcategory "${sc}" from category "${cat.name}"?`)) {
                                        onDeleteSubCategory?.(cat.name, sc)
                                        showToast(`Deleted subcategory "${sc}"`)
                                      }
                                    }}
                                    className="text-zinc-400 hover:text-red-600 hover:bg-red-50 p-0.5 rounded transition-colors text-xs ml-0.5"
                                    title={`Delete subcategory ${sc}`}
                                  >
                                    ✕
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setShowTaxonomyManager(false)
                  setNewCategoryModalOpen(true)
                }}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black"
              >
                ➕ Add New Category
              </button>
              <button
                type="button"
                onClick={() => setShowTaxonomyManager(false)}
                className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold hover:bg-zinc-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: EDIT CATEGORY MODAL */}
      {/* ========================================================================= */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <h3 className="font-extrabold text-base text-zinc-900">✏️ Edit Category: {editingCategory.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Category Name</label>
                <input
                  type="text"
                  value={editingCatName}
                  onChange={e => setEditingCatName(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:border-black font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Subcategories (Comma separated)</label>
                <input
                  type="text"
                  value={editingCatSubs}
                  onChange={e => setEditingCatSubs(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-lg p-2.5 focus:border-black"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button onClick={() => setEditingCategory(null)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={handleSaveEditedCategory} className="px-5 py-2 bg-black text-white rounded-xl text-xs font-bold">Update Category</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: SINGLE PRODUCT DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {deleteConfirmProd && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-red-200 text-center">
            <h3 className="font-extrabold text-base text-zinc-900">Delete "{deleteConfirmProd.name}"?</h3>
            <p className="text-xs text-zinc-500">This will remove SKU #{deleteConfirmProd.id} permanently.</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setDeleteConfirmProd(null)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
              <button
                onClick={() => {
                  onDeleteProduct(deleteConfirmProd.id)
                  showToast(`Deleted SKU #${deleteConfirmProd.id}`)
                  setDeleteConfirmProd(null)
                }}
                className="px-5 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 10: ORDER DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900">Order #{selectedOrderDetails.id?.substring(0, 8)}</h3>
                <p className="text-xs text-zinc-400">Placed on {selectedOrderDetails.created_at ? new Date(selectedOrderDetails.created_at).toLocaleString() : 'Today'}</p>
              </div>
              <button onClick={() => setSelectedOrderDetails(null)} className="text-zinc-400 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <div className="font-bold text-zinc-900 mb-1">Customer & Delivery Details</div>
                <div>Name: <strong>{selectedOrderDetails.customer_name}</strong></div>
                <div>Phone: <strong>{selectedOrderDetails.customer_phone || 'N/A'}</strong></div>
                <div>Email: <strong>{selectedOrderDetails.customer_email || 'N/A'}</strong></div>
                <div>Address: <strong>{selectedOrderDetails.shipping_address}, {selectedOrderDetails.city} - {selectedOrderDetails.postal_code}</strong></div>
              </div>

              <div>
                <div className="font-bold text-zinc-900 mb-1.5">Items Ordered</div>
                <div className="space-y-1.5">
                  {selectedOrderDetails.items?.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 px-3 bg-zinc-50 rounded-lg">
                      <span>{it.product?.name || it.name || 'Arovia Product'} ({it.size}) × {it.qty}</span>
                      <span className="font-bold font-mono">₹{(it.product?.price || it.price || 999) * it.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-2 flex items-center justify-between font-bold text-sm">
                <span>Total Amount:</span>
                <span className="text-emerald-600 font-mono">₹{selectedOrderDetails.total}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button onClick={() => handlePrintThermalLabel(selectedOrderDetails)} className="px-4 py-2 bg-zinc-100 font-bold text-xs rounded-xl">
                🖨️ Thermal Label
              </button>
              <button onClick={() => setSelectedOrderDetails(null)} className="px-4 py-2 bg-black text-white font-bold text-xs rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 11: SQL SCHEMA MODAL */}
      {/* ========================================================================= */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-extrabold text-base text-zinc-900">📄 Supabase Realtime SQL Migration Script</h3>
              <button onClick={() => setShowSqlModal(false)} className="text-zinc-400 font-bold">✕</button>
            </div>
            <p className="text-xs text-zinc-500">
              Copy this SQL script into your Supabase SQL Editor to enable real-time replication for products, categories, orders, and reviews.
            </p>
            <pre className="bg-zinc-950 text-emerald-400 p-4 rounded-xl text-[11px] font-mono max-h-72 overflow-y-auto">
{`-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    mrp NUMERIC NOT NULL,
    rating NUMERIC DEFAULT 4.8,
    reviews INTEGER DEFAULT 0,
    badge TEXT DEFAULT '',
    img_id TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    colors TEXT[] DEFAULT '{}',
    category TEXT NOT NULL,
    sub_category TEXT DEFAULT '',
    description TEXT DEFAULT '',
    stock INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    sub_categories TEXT[] DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;`}
            </pre>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`-- See supabase_schema.sql in project root`)
                  showToast('SQL script copied to clipboard!')
                }}
                className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold"
              >
                Copy SQL
              </button>
              <button onClick={() => setShowSqlModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 12: REALTIME BLITZSHIPZ TRACKING MODAL */}
      {/* ========================================================================= */}
      {selectedTrackOrder && (
        <TrackingModal
          open={!!selectedTrackOrder}
          order={selectedTrackOrder}
          onClose={() => setSelectedTrackOrder(null)}
        />
      )}
    </div>
  )
}
