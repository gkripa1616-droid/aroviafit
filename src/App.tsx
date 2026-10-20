import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useRealtimeBackend } from './hooks/useRealtimeBackend'
import { DBProduct, DBReview, DBOrder, DBPayment, DBCategory } from './services/supabaseBackend'
import { LIVE_PRODUCTS } from './services/catalogData'

const AdminPanel = lazy(() => import('./components/AdminPanel'))
const SizeGuideModal = lazy(() => import('./components/SizeGuideModal'))
const TrackingModal = lazy(() => import('./components/TrackingModal'))
const InfoModal = lazy(() => import('./components/InfoModal'))
const AdminAuthModal = lazy(() => import('./components/AdminAuthModal'))
import type { InfoModalType } from './components/InfoModal'

// ─── Types ──────────────────────────────────────────────────────────────────
type Page = 'home' | 'pdp' | 'collection' | 'cart' | 'admin'

interface Product {
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

interface CartItem {
  product: Product
  size: string
  color: string
  qty: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const isValidImg = (id: string | undefined | null): boolean => {
  if (!id || typeof id !== 'string') return false
  if (id.startsWith('data:') && id.length < 200) return false
  return true
}

const img = (id: string, _w = 600, _h = 800) => {
  if (!isValidImg(id)) return ''
  return id
}

// ─── Data State (Persistent & Synchronized Catalog) ──────────────────────────
const ALL_PRODUCTS: Product[] = LIVE_PRODUCTS

const REVIEWS: DBReview[] = [
  { name: 'Priya S.', text: 'Absolutely love the fit and comfort. These leggings are worth every rupee! Have ordered 3 pairs already.', rating: 5, product_name: 'Ultimate Leggings' },
  { name: 'Ananya M.', text: 'The quality is outstanding. I wear these to the gym and for everyday errands. Perfect versatility.', rating: 5, product_name: 'AirMelt Flare Pants' },
  { name: 'Rhea K.', text: 'Best sports bra I have ever owned. No bounce, great support, ultra soft. Highly recommend!', rating: 5, product_name: 'Power Up Sports Bra' },
  { name: 'Kavitha R.', text: 'The flare pants are so flattering! I got so many compliments at work. Love the fabric.', rating: 5, product_name: 'Ultimate Flare Pants' },
  { name: 'Sneha T.', text: 'Ordered 3 pairs of Ultimate Straight Pants. They wash so beautifully and stay in shape!', rating: 5, product_name: 'Ultimate Straight Pants' },
  { name: 'Meera V.', text: 'Arovia Fit is my go-to for workwear. The fabric feels premium and lasts forever. Worth every rupee.', rating: 5, product_name: 'Cloud Korean Pants' },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const CATEGORIES_TABS = ['Bestsellers', 'New', 'Travel', 'Bottoms', 'Innerwear', 'Swimwear', 'Tops']

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ text }: { text: string }) {
  if (!text) return null
  const cls: Record<string, string> = {
    NEW: 'bg-black text-white',
    RESTOCKED: 'bg-emerald-600 text-white',
    BESTSELLER: 'bg-amber-500 text-white',
    'NEW COLOURS': 'bg-violet-600 text-white',
  }
  return (
    <span className={`absolute top-2 left-2 z-10 text-[9px] font-bold tracking-[0.15em] px-2 py-0.5 ${cls[text] ?? 'bg-black text-white'}`}>
      {text}
    </span>
  )
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating, sm }: { rating: number; sm?: boolean }) {
  return (
    <span className={`text-amber-400 ${sm ? 'text-xs' : 'text-sm'}`}>
      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
    </span>
  )
}

// ─── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({
  p,
  onAdd,
  onBuyNow,
  onView,
  isWishlisted,
  onToggleWishlist
}: {
  p: Product
  onAdd: (p: Product) => void
  onBuyNow?: (p: Product) => void
  onView: (p: Product) => void
  isWishlisted?: boolean
  onToggleWishlist?: (id: number) => void
}) {
  const [localWishlist, setLocalWishlist] = useState(false)
  const wish = isWishlisted !== undefined ? isWishlisted : localWishlist

  return (
    <div className="group">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 cursor-pointer" onClick={() => onView(p)}>
        {(() => {
          const displayImg = isValidImg(p.imgId) ? p.imgId : (p.images?.find(isValidImg) || '')
          if (displayImg) {
            return (
              <img
                src={img(displayImg)}
                alt={p.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )
          }
          return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white p-4 text-center">
              <span className="text-lg font-black tracking-widest uppercase">AROVIA</span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">{p.name || p.category || 'ACTIVEWEAR'}</span>
            </div>
          )
        })()}
        <Badge text={p.badge} />
        <button
          onClick={e => {
            e.stopPropagation()
            if (onToggleWishlist) {
              onToggleWishlist(p.id)
            } else {
              setLocalWishlist(v => !v)
            }
          }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 transition-transform hover:scale-110 shadow-xs z-10"
          aria-label="Wishlist"
        >
          <span className={`text-lg leading-none transition-colors ${wish ? 'text-red-500' : 'text-gray-300'}`}>
            {wish ? '♥' : '♡'}
          </span>
        </button>
        <div className="absolute inset-x-0 bottom-0 translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300 flex z-10">
          <button
            onClick={e => { e.stopPropagation(); onAdd(p) }}
            className="flex-1 bg-black text-white text-[9px] sm:text-[10px] font-bold tracking-[0.15em] py-3 sm:py-3.5 hover:bg-gray-800 transition-colors border-r border-gray-800"
          >
            ADD TO BAG
          </button>
          {onBuyNow && (
            <button
              onClick={e => { e.stopPropagation(); onBuyNow(p) }}
              className="flex-1 bg-[#0c2340] text-white text-[9px] sm:text-[10px] font-bold tracking-[0.15em] py-3 sm:py-3.5 hover:bg-[#07192e] transition-colors"
            >
              ⚡ BUY NOW
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-1 cursor-pointer" onClick={() => onView(p)}>
        {/* Category & Subcategory Header Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {p.category && (
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-700 bg-zinc-100 border border-zinc-200/80 px-2 py-0.5 rounded shadow-2xs">
              📁 {p.category}
            </span>
          )}
          {(p.subCategory || p.sub_category) && (
            <span className="text-[9px] font-black uppercase tracking-wider text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded shadow-2xs">
              ↳ {p.subCategory || p.sub_category}
            </span>
          )}
        </div>
        <p className="text-sm font-bold leading-snug text-zinc-900 group-hover:text-black transition-colors pt-0.5">
          {p.name}
        </p>
        <div className="flex items-center gap-1.5">
          <Stars rating={p.rating} sm />
          <span className="text-[11px] text-gray-500">{p.rating} ({p.reviews.toLocaleString()})</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-sm">₹{p.price.toLocaleString()}</span>
          <span className="text-xs text-gray-400 line-through">₹{p.mrp.toLocaleString()}</span>
          <span className="text-[11px] text-green-700 font-medium">{Math.round((p.mrp - p.price) / p.mrp * 100)}% OFF</span>
        </div>
        <p className="text-[11px] text-green-700">Best Price ₹{Math.round(p.price * 0.92).toLocaleString()} with AROVIA150</p>
        <div className="flex items-center gap-1.5 pt-0.5">
          {p.colors.slice(0, 3).map((c, i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-full border border-gray-200 inline-block" style={{ background: c }} />
          ))}
          {p.colors.length > 3 && (
            <span className="text-[10px] text-gray-400">+{p.colors.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Search Overlay ───────────────────────────────────────────────────────────
function SearchOverlay({ open, onClose, products, onView, onSearchSubmit }: {
  open: boolean
  onClose: () => void
  products: Product[]
  onView: (p: Product) => void
  onSearchSubmit: (q: string) => void
}) {
  const [q, setQ] = useState('')

  if (!open) return null

  const results = q.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.category.toLowerCase().includes(q.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(q.toLowerCase()))
      )
    : []

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && q.trim()) {
      onSearchSubmit(q.trim())
      onClose()
    }
  }

  const popularSearches = ['Flare Pants', 'Leggings', 'Sports Bra', 'BareButter', 'Travel', 'Swimwear']

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-start backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white p-6 shadow-xl max-w-3xl w-full mx-auto mt-16 rounded-b-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center border-b border-gray-200 pb-4">
          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search activewear, leggings, flared pants, tops..."
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full text-base focus:outline-none placeholder-gray-400"
          />
          {q && (
            <button onClick={() => setQ('')} className="text-xs text-gray-400 hover:text-black mr-2">Clear</button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-black ml-2 font-bold text-lg">✕</button>
        </div>

        {/* Quick Tag Suggestions */}
        {!q && (
          <div className="py-6">
            <p className="text-xs font-bold text-gray-400 tracking-wider mb-3">POPULAR SEARCHES</p>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map(term => (
                <button
                  key={term}
                  onClick={() => setQ(term)}
                  className="text-xs bg-gray-100 hover:bg-black hover:text-white px-3 py-1.5 rounded-full transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {q && (
          <div className="overflow-y-auto flex-1 mt-4 space-y-3 divide-y divide-gray-100">
            {results.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                No products found matching "{q}". Try searching for "Pants", "Bra", or "Leggings".
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-xs text-gray-500 font-medium">Found {results.length} results</span>
                  <button
                    onClick={() => { onSearchSubmit(q); onClose() }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    View All in Collection →
                  </button>
                </div>
                {results.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { onView(p); onClose() }}
                    className="flex items-center gap-4 pt-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <img src={img(p.imgId, 80, 100)} alt={p.name} className="w-12 h-16 object-cover rounded-xs" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.category} • <span className="text-amber-500">★ {p.rating}</span> ({p.reviews})</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">₹{p.price.toLocaleString()}</p>
                      <span className="text-[10px] text-green-700 font-semibold">{Math.round((p.mrp - p.price) / p.mrp * 100)}% OFF</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Mega Menu ────────────────────────────────────────────────────────────────
function MegaMenu({
  open,
  categories,
  products,
  onCategorySelect
}: {
  open: boolean
  categories?: DBCategory[]
  products?: Product[]
  onCategorySelect: (cat: string) => void
}) {
  if (!open) return null

  const categoryNames = categories && categories.length > 0
    ? categories.map(c => c.name)
    : ['Bottoms', 'Tops', 'Innerwear', 'Swimwear', 'Travel']

  const bottomsImg = products?.find(p => p.category?.toLowerCase() === 'bottoms' && isValidImg(p.imgId))?.imgId
    || products?.find(p => isValidImg(p.imgId))?.imgId || ''
  const topsImg = products?.find(p => (p.category?.toLowerCase() === 'tops' || p.category?.toLowerCase() === 'innerwear') && isValidImg(p.imgId))?.imgId
    || products?.filter(p => isValidImg(p.imgId))?.[1]?.imgId || ''

  return (
    <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl z-40 py-10 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-4 gap-8">
        <div className="col-span-2">
          <p className="text-[10px] font-bold tracking-[0.25em] text-gray-400 mb-4">CATEGORIES & SUBCATEGORIES</p>
          <div className="grid grid-cols-2 gap-6">
            {(categories && categories.length > 0 ? categories : [
              { name: 'Bottoms', subCategories: ['Flare Pants', 'Leggings', 'Biker Shorts'] },
              { name: 'Tops', subCategories: ['Crop Tops', 'Tanks', 'Jackets'] }
            ]).map(cat => (
              <div key={cat.name} className="space-y-1.5">
                <button
                  onClick={() => onCategorySelect(cat.name)}
                  className="font-bold text-sm text-zinc-900 hover:text-black flex items-center gap-1 group text-left"
                >
                  <span>{cat.name}</span>
                  <span className="text-xs text-zinc-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
                {cat.subCategories && cat.subCategories.length > 0 && (
                  <ul className="pl-2 space-y-1 border-l-2 border-zinc-100">
                    {cat.subCategories.map(sub => (
                      <li key={sub}>
                        <button
                          onClick={() => onCategorySelect(sub)}
                          className="text-xs text-zinc-500 hover:text-purple-700 hover:font-bold transition-colors text-left"
                        >
                          ↳ {sub}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.25em] text-gray-400 mb-4">FEATURED COLLECTIONS</p>
          <ul className="space-y-2.5 text-sm font-medium">
            {['Bestsellers', 'New Arrivals', 'AirMelt Series', 'BareButter Collection', 'Work-To-Wine'].map(f => (
              <li
                key={f}
                onClick={() => onCategorySelect(f === 'New Arrivals' ? 'New' : f)}
                className="hover:text-gray-500 cursor-pointer transition-colors"
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden group cursor-pointer" onClick={() => onCategorySelect('Bottoms')}>
            {bottomsImg ? (
              <img src={img(bottomsImg, 400, 300)} alt="Bottoms" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center p-6 text-center">
                <span className="text-2xl font-black text-white/20 tracking-widest">BOTTOMS</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
              <p className="text-xs font-bold tracking-widest uppercase">BOTTOMS COLLECTION</p>
              <p className="text-[10px] opacity-80 mt-0.5">Explore 4-way stretch activewear</p>
            </div>
          </div>
          <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden group cursor-pointer" onClick={() => onCategorySelect('Tops')}>
            {topsImg ? (
              <img src={img(topsImg, 400, 300)} alt="Tops" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center p-6 text-center">
                <span className="text-2xl font-black text-white/20 tracking-widest">TOPS & ESSENTIALS</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
              <p className="text-xs font-bold tracking-widest uppercase">INNERWEAR & TOPS</p>
              <p className="text-[10px] opacity-80 mt-0.5">Butter-soft performance essentials</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Wishlist Drawer ──────────────────────────────────────────────────────────

// ─── Wishlist Drawer ──────────────────────────────────────────────────────────
function WishlistDrawer({
  open,
  onClose,
  wishlistProducts,
  onRemoveWishlist,
  onAddToCart,
  onViewProduct
}: {
  open: boolean
  onClose: () => void
  wishlistProducts: Product[]
  onRemoveWishlist: (id: number) => void
  onAddToCart: (p: Product, size: string) => void
  onViewProduct: (p: Product) => void
}) {
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({})

  if (!open) return null

  const handleSizeChange = (pId: number, size: string) => {
    setSelectedSizes(prev => ({ ...prev, [pId]: size }))
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-500 text-lg">♥</span>
              <h2 className="text-base font-bold tracking-wider">MY WISHLIST ({wishlistProducts.length})</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-black text-xl font-bold">✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {wishlistProducts.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto text-2xl">
                  ♥
                </div>
                <h3 className="font-bold text-gray-900">Your wishlist is empty</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Save your favourite items here so you can easily review and buy them later.
                </p>
                <button
                  onClick={onClose}
                  className="bg-black text-white text-xs font-bold px-6 py-3 tracking-wider hover:bg-gray-800 transition-colors"
                >
                  START SHOPPING
                </button>
              </div>
            ) : (
              wishlistProducts.map(p => {
                const chosenSize = selectedSizes[p.id] || 'M'
                return (
                  <div key={p.id} className="flex gap-4 border-b border-gray-100 pb-5">
                    <img
                      src={img(p.imgId, 120, 160)}
                      alt={p.name}
                      onClick={() => { onViewProduct(p); onClose() }}
                      className="w-20 h-26 object-cover bg-gray-100 cursor-pointer rounded-xs"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4
                            onClick={() => { onViewProduct(p); onClose() }}
                            className="text-xs font-bold cursor-pointer hover:text-gray-600 line-clamp-1"
                          >
                            {p.name}
                          </h4>
                          <button
                            onClick={() => onRemoveWishlist(p.id)}
                            className="text-gray-400 hover:text-red-500 text-xs ml-2"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{p.category}</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="font-bold text-xs">₹{p.price.toLocaleString()}</span>
                          <span className="text-[10px] text-gray-400 line-through">₹{p.mrp.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Size Selector & Action */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 font-medium">Size:</span>
                          <div className="flex gap-1">
                            {SIZES.slice(0, 4).map(sz => (
                              <button
                                key={sz}
                                onClick={() => handleSizeChange(p.id, sz)}
                                className={`text-[10px] px-1.5 py-0.5 border ${
                                  chosenSize === sz ? 'border-black bg-black text-white font-bold' : 'border-gray-200 text-gray-600'
                                }`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onAddToCart(p, chosenSize)
                            onRemoveWishlist(p.id)
                          }}
                          className="w-full bg-black text-white text-[10px] font-bold tracking-wider py-2 hover:bg-gray-800 transition-colors"
                        >
                          MOVE TO BAG
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {wishlistProducts.length > 0 && (
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => {
                  wishlistProducts.forEach(p => {
                    const sz = selectedSizes[p.id] || 'M'
                    onAddToCart(p, sz)
                    onRemoveWishlist(p.id)
                  })
                }}
                className="w-full bg-black text-white text-xs font-bold py-3.5 tracking-wider hover:bg-gray-800 transition-colors"
              >
                MOVE ALL TO BAG
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function Navigation({
  cartCount,
  wishlistCount,
  onCartOpen,
  onWishlistOpen,
  onSearchOpen,
  onPageChange,
  onCategorySelect,
  categories,
  products,
  isConnected,
  isConfigured,
  lastRealtimeEvent,
  onTrackOpen
}: {
  cartCount: number
  wishlistCount: number
  onCartOpen: () => void
  onWishlistOpen: () => void
  onSearchOpen: () => void
  onPageChange: (p: Page) => void
  onCategorySelect: (cat: string) => void
  categories?: DBCategory[]
  products?: Product[]
  isConnected?: boolean
  isConfigured?: boolean
  lastRealtimeEvent?: string
  onTrackOpen?: () => void
}) {
  const [megaOpen, setMegaOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const navCategories = categories && categories.length > 0
    ? categories.map(c => c.name)
    : ['Bottoms', 'Tops', 'Innerwear', 'Swimwear', 'Travel']

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className={`fixed top-0 left-0 right-0 z-30 transition-shadow duration-300 ${scrolled ? 'shadow-sm' : ''}`}>
      {/* Top Promo Bar */}
      <div className="bg-black text-white py-1.5 px-4 text-center text-[11px] flex items-center justify-between">
        <div className="hidden sm:block text-[10px] text-gray-400">FREE SHIPPING ON ORDERS OVER ₹999</div>
        <p className="tracking-wide mx-auto">
          ⚡ EXTRA ₹150 OFF ON PURCHASE OF 2 FAVES ⚡ | USE CODE: <span className="font-bold border border-white/40 px-2 py-0.5 ml-1">AROVIA150</span>
        </p>
        <div className="hidden sm:flex items-center gap-2 text-[10px]">
          {isConfigured && (
            <span className={`inline-flex items-center gap-1 ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`} title={lastRealtimeEvent || 'Realtime status'}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isConnected ? 'LIVE SYNC' : 'CONNECTING'}
            </span>
          )}
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="bg-white border-b border-gray-100 relative" onMouseLeave={() => setMegaOpen(false)}>
        <div className="max-w-screen-xl mx-auto px-4 md:px-6">
          <div className="flex items-center h-14">
            {/* Left Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-6 flex-1">
              <button
                onMouseEnter={() => setMegaOpen(true)}
                onClick={() => setMegaOpen(v => !v)}
                className="text-sm font-medium flex items-center gap-1 hover:text-gray-500 transition-colors"
              >
                Categories <span className="text-[10px]">▾</span>
              </button>
              <button onClick={() => onCategorySelect('ALL')} className="text-sm hover:text-gray-500 transition-colors">Shop All</button>
              <button onClick={() => onCategorySelect('Bestsellers')} className="text-sm hover:text-gray-500 transition-colors">Bestsellers</button>
              <button onClick={() => onCategorySelect('New')} className="text-sm hover:text-gray-500 transition-colors">New</button>
              <button onClick={() => onCategorySelect('Travel')} className="text-sm hover:text-gray-500 transition-colors">Travel</button>
            </nav>

            {/* Mobile menu trigger */}
            <button className="lg:hidden text-gray-600 hover:text-black transition-colors mr-3" onClick={() => setMobileOpen(v => !v)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>

            {/* Center Brand Logo */}
            <div className="flex-1 lg:flex-none flex justify-center lg:justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2">
              <button onClick={() => onPageChange('home')} className="flex items-center gap-2 group py-1" aria-label="Arovia Fit Home">
                <img
                  src="/arovia-logo.png"
                  alt="Arovia Fit"
                  className="h-11 md:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </button>
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <button
                onClick={onTrackOpen}
                className="hidden md:flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-black px-2.5 py-1 rounded-full border border-zinc-200 hover:border-black transition-colors"
                title="Track your shipment in realtime with BlitzShipz"
              >
                <span className="text-emerald-600">⚡</span> Track Order
              </button>
              <button onClick={onSearchOpen} className="p-2 text-gray-600 hover:text-black transition-colors" aria-label="Search">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </button>
              <button onClick={() => onPageChange('admin')} className="hidden sm:block p-2 text-gray-600 hover:text-black transition-colors" aria-label="Admin Portal" title="Admin & Backend Control">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button onClick={onWishlistOpen} className="p-2 text-gray-600 hover:text-black transition-colors relative" aria-label="Wishlist">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>
              <button onClick={onCartOpen} className="p-2 text-gray-600 hover:text-black transition-colors relative" aria-label="Shopping Bag">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <MegaMenu open={megaOpen} categories={categories} products={products} onCategorySelect={(c) => { onCategorySelect(c); setMegaOpen(false) }} />
      </div>

      {/* Mobile Drawer Nav */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-6 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <p className="text-xs font-bold text-gray-400 tracking-wider">SHOP BY CATEGORY</p>
          {navCategories.map(c => (
            <button
              key={c}
              onClick={() => { onCategorySelect(c); setMobileOpen(false) }}
              className="block w-full text-left text-sm font-medium py-1 text-gray-800"
            >
              {c}
            </button>
          ))}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            {onTrackOpen && (
              <button
                onClick={() => { onTrackOpen(); setMobileOpen(false) }}
                className="w-full text-center bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold py-2 rounded-xs flex items-center justify-center gap-1.5"
              >
                <span>⚡</span> Live Track Order (BlitzShipz)
              </button>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { onWishlistOpen(); setMobileOpen(false) }}
                className="flex-1 text-center bg-gray-100 text-xs font-bold py-2 rounded-xs"
              >
                ♥ Wishlist ({wishlistCount})
              </button>
              <button
                onClick={() => { onPageChange('admin'); setMobileOpen(false) }}
                className="flex-1 text-center bg-black text-white text-xs font-bold py-2 rounded-xs"
              >
                ⚙ Admin Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────
function CartDrawer({ open, onClose, cart, onRemove, onQtyChange, onCheckout }: {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  onRemove: (id: number, size: string) => void
  onQtyChange: (id: number, size: string, qty: number) => void
  onCheckout: () => void
}) {
  if (!open) return null

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const freeShipThreshold = 999
  const progress = Math.min(100, (subtotal / freeShipThreshold) * 100)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-wider">SHOPPING BAG ({cart.reduce((a, b) => a + b.qty, 0)})</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-black text-xl font-bold">✕</button>
          </div>

          {/* Free Shipping & Gift Progress */}
          <div className="bg-gray-50 px-6 py-3.5 border-b border-gray-100">
            <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
              <span>
                {subtotal >= 1999 ? (
                  <span className="text-emerald-700 font-black">🎉 UNLOCKED: Free Shipping + Free Luxury Gift!</span>
                ) : subtotal >= 999 ? (
                  <span className="text-emerald-700">✓ Free Delivery Unlocked! Add ₹{(1999 - subtotal).toLocaleString()} for Free Gift</span>
                ) : (
                  <span>Add <strong className="text-black">₹{(999 - subtotal).toLocaleString()}</strong> for <strong>FREE Express Shipping</strong></span>
                )}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">{Math.round(Math.min(100, (subtotal / 1999) * 100))}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden relative">
              <div
                className="bg-gradient-to-r from-gray-900 via-black to-emerald-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, (subtotal / 1999) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
              <span>₹0</span>
              <span className={subtotal >= 999 ? 'text-emerald-700 font-black' : ''}>₹999 Free Ship</span>
              <span className={subtotal >= 1999 ? 'text-emerald-700 font-black' : ''}>₹1,999 Free Gift</span>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm">
                Your bag is currently empty.
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={`${item.product.id}-${item.size}-${idx}`} className="flex gap-4 border-b border-gray-100 pb-5">
                  <img src={img(item.product.imgId, 100, 140)} alt={item.product.name} className="w-16 h-22 object-cover bg-gray-100 rounded-xs" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold leading-tight">{item.product.name}</h4>
                        <button onClick={() => onRemove(item.product.id, item.size)} className="text-gray-400 hover:text-black text-xs ml-2">✕</button>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">Size: {item.size} • Color: <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-300 align-middle ml-1" style={{ backgroundColor: item.color }} /></p>
                      <p className="font-bold text-xs mt-1">₹{item.product.price.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-gray-200">
                        <button onClick={() => onQtyChange(item.product.id, item.size, item.qty - 1)} className="px-2 py-0.5 text-xs hover:bg-gray-100">-</button>
                        <span className="px-2 text-xs font-medium">{item.qty}</span>
                        <button onClick={() => onQtyChange(item.product.id, item.size, item.qty + 1)} className="px-2 py-0.5 text-xs hover:bg-gray-100">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-gray-100 space-y-4">
              <div className="flex justify-between text-sm font-bold">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-gray-400">Shipping, taxes, and discounts calculated at checkout.</p>
              <button
                onClick={() => { onClose(); onCheckout() }}
                className="w-full bg-black text-white text-xs font-bold tracking-[0.15em] py-4 hover:bg-gray-800 transition-colors"
              >
                PROCEED TO CHECKOUT
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Razorpay Payment Modal ──────────────────────────────────────────────────
function RazorpayModal({
  open,
  onClose,
  amount,
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  onPaymentSuccess
}: {
  open: boolean
  onClose: () => void
  amount: number
  orderId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  onPaymentSuccess: (method: string) => void
}) {
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking' | 'cod'>('upi')
  const [vpa, setVpa] = useState('customer@upi')
  const [cardNumber, setCardNumber] = useState('4532 8910 2341 9901')
  const [cardExpiry, setCardExpiry] = useState('08/29')
  const [cardCvv, setCardCvv] = useState('892')
  const [selectedBank, setSelectedBank] = useState('HDFC')
  const [step, setStep] = useState<'select' | 'processing' | 'success'>('select')

  if (!open) return null

  const handlePay = async () => {
    setStep('processing')
    setTimeout(() => {
      setStep('success')
      setTimeout(() => {
        onPaymentSuccess(method)
      }, 1200)
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        {/* Razorpay Brand Header */}
        <div className="bg-[#0c2340] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">₹</div>
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-blue-200">Arovia Fit Checkout</p>
              <p className="text-sm font-semibold">Order #{orderId.substring(0, 8)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-blue-200">AMOUNT TO PAY</p>
            <p className="text-lg font-black text-emerald-400">₹{amount.toLocaleString()}</p>
          </div>
        </div>

        {step === 'select' && (
          <div className="p-6 space-y-5">
            <div className="flex border-b border-gray-100 pb-3 text-xs gap-4 font-semibold">
              <button
                onClick={() => setMethod('upi')}
                className={`pb-1 transition-colors ${method === 'upi' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
              >
                UPI / QR
              </button>
              <button
                onClick={() => setMethod('card')}
                className={`pb-1 transition-colors ${method === 'card' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
              >
                Cards
              </button>
              <button
                onClick={() => setMethod('netbanking')}
                className={`pb-1 transition-colors ${method === 'netbanking' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
              >
                Netbanking
              </button>
              <button
                onClick={() => setMethod('cod')}
                className={`pb-1 transition-colors ${method === 'cod' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
              >
                Cash on Delivery
              </button>
            </div>

            {method === 'upi' && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-center">
                  <div className="w-32 h-32 bg-white border border-gray-200 mx-auto flex items-center justify-center p-2 rounded-md shadow-xs">
                    <div className="w-full h-full bg-repeating-conic from-gray-900 to-gray-900 via-transparent flex flex-col items-center justify-center text-center">
                      <span className="text-2xl">📱</span>
                      <span className="text-[9px] font-bold text-gray-600 mt-1">Scan with Any UPI App</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">GPay • PhonePe • Paytm • BHIM</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Or Enter UPI ID / VPA</label>
                  <input
                    type="text"
                    value={vpa}
                    onChange={e => setVpa(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
                    placeholder="name@okaxis"
                  />
                </div>
              </div>
            )}

            {method === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">CVV</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === 'netbanking' && (
              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-600 block">Select Your Bank</label>
                <div className="grid grid-cols-2 gap-2">
                  {['HDFC', 'ICICI', 'SBI', 'Axis Bank', 'Kotak', 'Others'].map(bank => (
                    <button
                      key={bank}
                      onClick={() => setSelectedBank(bank)}
                      className={`text-xs p-2.5 rounded border text-left font-medium transition-colors ${
                        selectedBank === bank ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {method === 'cod' && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1">
                <p className="font-bold">Cash on Delivery (COD)</p>
                <p>Pay cash when the order is delivered to your doorstep. ₹0 additional fee.</p>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handlePay}
                className="w-full bg-[#0c2340] hover:bg-[#07192e] text-white text-xs font-bold tracking-wider py-3.5 rounded transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>PAY ₹{amount.toLocaleString()}</span>
                <span>🔒</span>
              </button>
              <button
                onClick={onClose}
                className="w-full text-center text-xs text-gray-400 hover:text-black mt-3"
              >
                Cancel and return to store
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-10 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h4 className="font-bold text-sm">Processing Payment...</h4>
            <p className="text-xs text-gray-400">Communicating with Razorpay gateway & Supabase DB.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="p-10 text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mx-auto">
              ✓
            </div>
            <h4 className="font-bold text-base text-green-700">Payment Successful!</h4>
            <p className="text-xs text-gray-500">Redirecting to your order confirmation...</p>
          </div>
        )}

        <div className="bg-gray-50 px-6 py-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
          <span>Secured by Razorpay • 256-bit SSL</span>
          <span>Arovia Fit Direct Checkout</span>
        </div>
      </div>
    </div>
  )
}

// ─── Order Invoice Receipt ────────────────────────────────────────────────────
function OrderInvoiceReceipt({
  order,
  onContinueShopping,
  onTrackOrder
}: {
  order: DBOrder
  onContinueShopping: () => void
  onTrackOrder?: (order: DBOrder) => void
}) {
  return (
    <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-gray-200 shadow-sm rounded-lg">
      <div className="flex justify-between items-start border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <img src="/arovia-logo.png" alt="Arovia Fit" className="h-9 w-auto object-contain" />
          </div>
          <p className="text-[11px] text-gray-400">Direct-To-Consumer Activewear India</p>
        </div>
        <div className="text-right">
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
            {order.payment_status || 'PAID'}
          </span>
          <p className="text-xs font-bold mt-1">Order #{order.id?.substring(0, 8)}</p>
          <p className="text-[10px] text-gray-400">{new Date(order.created_at || Date.now()).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="py-6 border-b border-gray-100 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="font-bold text-gray-400 text-[10px] tracking-wider uppercase mb-1">SHIPPING ADDRESS</p>
          <p className="font-semibold text-gray-900">{order.customer_name}</p>
          <p className="text-gray-600">{order.shipping_address}</p>
          {order.city && <p className="text-gray-600">{order.city}, {order.state} - {order.postal_code}</p>}
          {order.customer_phone && <p className="text-gray-500 mt-1">Phone: {order.customer_phone}</p>}
        </div>
        <div>
          <p className="font-bold text-gray-400 text-[10px] tracking-wider uppercase mb-1">ORDER & TRACKING</p>
          <p className="font-semibold text-gray-900">Status: <span className="text-blue-600">{order.status || 'Processing'}</span></p>
          <p className="text-gray-500">Payment ID: <span className="font-mono text-[10px]">{order.payment_id || 'pay_live'}</span></p>
          <p className="text-gray-500">
            Tracking #: <span className="font-mono font-bold text-zinc-900 text-[10px]">{order.tracking_number || 'BLZ-ARV9821'}</span>
          </p>
          <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">⚡ BlitzShipz Realtime Logistics</p>
        </div>
      </div>

      {/* Live Stepper */}
      <div className="py-6 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-3">DELIVERY TIMELINE</p>
        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
          <div className="space-y-1">
            <div className="w-5 h-5 rounded-full bg-black text-white mx-auto flex items-center justify-center font-bold">✓</div>
            <p className="font-bold text-gray-900">Confirmed</p>
          </div>
          <div className="space-y-1">
            <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center font-bold ${
              order.status === 'Shipped' || order.status === 'In Transit' || order.status === 'Delivered'
                ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {order.status === 'Shipped' || order.status === 'In Transit' || order.status === 'Delivered' ? '✓' : '2'}
            </div>
            <p className="font-medium text-gray-600">Shipped</p>
          </div>
          <div className="space-y-1">
            <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center font-bold ${
              order.status === 'In Transit' || order.status === 'Delivered'
                ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {order.status === 'In Transit' || order.status === 'Delivered' ? '✓' : '3'}
            </div>
            <p className="font-medium text-gray-600">In Transit</p>
          </div>
          <div className="space-y-1">
            <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center font-bold ${
              order.status === 'Delivered' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {order.status === 'Delivered' ? '✓' : '4'}
            </div>
            <p className="font-medium text-gray-600">Delivered</p>
          </div>
        </div>
      </div>

      <div className="py-6 border-b border-gray-100 space-y-3">
        <p className="font-bold text-gray-400 text-[10px] tracking-wider uppercase">ORDERED ITEMS</p>
        {(order.items || []).map((item: any, i: number) => {
          const prod = item.product || item
          return (
            <div key={i} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-3">
                <span className="font-medium">{prod.name || 'Product'}</span>
                <span className="text-gray-400">({item.size || 'M'}) × {item.qty || 1}</span>
              </div>
              <span className="font-bold">₹{((prod.price || 0) * (item.qty || 1)).toLocaleString()}</span>
            </div>
          )
        })}
      </div>

      <div className="pt-6 space-y-1.5 text-xs">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>₹{order.subtotal?.toLocaleString()}</span>
        </div>
        {order.discount ? (
          <div className="flex justify-between text-green-700">
            <span>Discount</span>
            <span>-₹{order.discount?.toLocaleString()}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-gray-500">
          <span>Shipping</span>
          <span>{order.shipping ? `₹${order.shipping}` : 'FREE'}</span>
        </div>
        <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-2 mt-2">
          <span>Total Paid</span>
          <span className="text-black">₹{order.total?.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
        {onTrackOrder && (
          <button
            onClick={() => onTrackOrder(order)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <span>⚡</span> LIVE TRACK SHIPMENT
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="flex-1 border border-gray-300 text-xs font-bold py-3 px-4 hover:bg-gray-50 rounded"
        >
          🖨 PRINT INVOICE
        </button>
        <button
          onClick={onContinueShopping}
          className="flex-1 bg-black text-white text-xs font-bold py-3 px-4 hover:bg-gray-800 rounded"
        >
          CONTINUE SHOPPING
        </button>
      </div>
    </div>
  )
}

// ─── Admin Panel is now located in src/components/AdminPanel.tsx ────────────────


// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({
  products,
  categories,
  reviews,
  onAdd,
  onBuyNow,
  onView,
  wishlistIds,
  onToggleWishlist,
  onCategorySelect,
  onAddReview
}: {
  products: Product[]
  categories?: DBCategory[]
  reviews: DBReview[]
  onAdd: (p: Product) => void
  onBuyNow: (p: Product) => void
  onView: (p: Product) => void
  wishlistIds: number[]
  onToggleWishlist: (id: number) => void
  onCategorySelect: (cat: string) => void
  onAddReview: (prodName: string, name: string, text: string, rating: number, prodId?: number) => void
}) {
  const homeCategoryTabs = useMemo(() => {
    const dyn = (categories || []).map(c => c.name).filter(Boolean)
    const set = new Set(['ALL', 'Bestsellers', 'New', ...dyn])
    // Also add categories from loaded products
    products.forEach(p => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [categories, products])

  const [activeTab, setActiveTab] = useState('ALL')
  const [slide, setSlide] = useState(0)

  // Review submission inline form state
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [revName, setRevName] = useState('')
  const [revProd, setRevProd] = useState('Ultimate Leggings')
  const [revText, setRevText] = useState('')
  const [revRating, setRevRating] = useState(5)
  const [submittedMessage, setSubmittedMessage] = useState('')

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!revName.trim() || !revText.trim()) return
    const matched = products.find(p => p.name === revProd)
    onAddReview(revProd, revName.trim(), revText.trim(), revRating, matched?.id)
    setSubmittedMessage('Thank you! Your verified customer review is published.')
    setRevName('')
    setRevText('')
    setTimeout(() => {
      setShowReviewForm(false)
      setSubmittedMessage('')
    }, 2000)
  }

  const filtered = products.filter(p => {
    const tabUpper = activeTab.toUpperCase()
    const badgeUpper = (p.badge || '').toUpperCase()
    const prodCat = (p.category || '').toLowerCase()
    const prodSubCat = (p.subCategory || p.sub_category || '').toLowerCase()
    const tabLower = activeTab.toLowerCase()

    if (tabUpper === 'ALL') return true
    if (tabUpper === 'BESTSELLERS') {
      return badgeUpper.includes('BESTSELLER') || badgeUpper === 'BESTSELLER' || p.rating >= 4.7
    }
    if (tabUpper === 'NEW' || tabUpper === 'NEW ARRIVALS') {
      return badgeUpper.includes('NEW') || badgeUpper === 'NEW' || badgeUpper === 'NEW COLOURS' || badgeUpper === 'NEW ARRIVAL'
    }
    return (
      prodCat === tabLower ||
      prodSubCat === tabLower ||
      prodCat.includes(tabLower) ||
      tabLower.includes(prodCat)
    )
  })

  // If a specific filter returns 0 products, show all products so the screen is never blank
  const displayProducts = filtered.length > 0 ? filtered : products

  const heroSlides = useMemo(() => {
    const prodsWithImgs = products.filter(p => p.imgId)
    if (prodsWithImgs.length > 0) {
      return prodsWithImgs.slice(0, 3).map((p, idx) => ({
        imgId: p.imgId,
        label: p.badge ? p.badge.toUpperCase() : (idx === 0 ? 'AROVIA FIT MOVE' : 'EVERYDAY ELEVATED'),
        heading: p.name,
        sub: p.description || 'Performance activewear engineered with 4-way Italian stretch fabric.'
      }))
    }
    return [
      {
        imgId: '',
        label: 'AROVIA FIT MOVE',
        heading: 'Move Without\nLimits',
        sub: 'Performance activewear engineered with 4-way Italian stretch fabric.'
      }
    ]
  }, [products])

  return (
    <div>
      {/* Hero Carousel */}
      <div className="relative h-[85vh] sm:h-[90vh] bg-black text-white overflow-hidden">
        {heroSlides.map((s, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ${slide === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {s.imgId ? (
              <img src={img(s.imgId, 1600, 1000)} alt={s.heading} className="w-full h-full object-cover object-center scale-105 animate-in zoom-in duration-10000" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 max-w-screen-xl mx-auto px-6 pb-16 md:pb-24">
              <p className="text-xs font-bold tracking-[0.3em] text-white/90 mb-3">{s.label}</p>
              <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-[1.05] whitespace-pre-line mb-4">
                {s.heading}
              </h1>
              <p className="text-sm md:text-base text-white/80 max-w-md mb-8">
                {s.sub}
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => onCategorySelect('ALL')}
                  className="bg-white text-black text-xs font-bold tracking-[0.15em] px-8 py-4 hover:bg-gray-200 transition-colors shadow-lg"
                >
                  SHOP NOW
                </button>
                <button
                  onClick={() => onCategorySelect('Bestsellers')}
                  className="bg-transparent border border-white text-white text-xs font-bold tracking-[0.15em] px-8 py-4 hover:bg-white/10 transition-colors"
                >
                  EXPLORE BESTSELLERS
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel indicators */}
        <div className="absolute bottom-6 right-6 z-20 flex gap-2">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`w-8 h-1 rounded-full transition-all ${slide === i ? 'bg-white w-12' : 'bg-white/40'}`}
            />
          ))}
        </div>
      </div>

      {/* Value Proposition Strip */}
      <div className="border-b border-gray-200 bg-gray-50 py-5">
        <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs font-bold text-gray-900">4-WAY ITALIAN STRETCH</p>
            <p className="text-[11px] text-gray-500">Maximum freedom of movement</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">SQUAT-PROOF FABRIC</p>
            <p className="text-[11px] text-gray-500">100% opacity guaranteed</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">FREE RETURNS & EXCHANGES</p>
            <p className="text-[11px] text-gray-500">7-day hassle-free doorstep pickup</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">SAME DAY DISPATCH</p>
            <p className="text-[11px] text-gray-500">Express delivery across India</p>
          </div>
        </div>
      </div>

      {/* Curated Category Grid Section */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold tracking-[0.25em] text-gray-400 mb-1">DISCOVER THE COLLECTIONS</p>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight">Engineered For Everyday Life</h2>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 md:gap-4 overflow-x-auto pb-4 mb-8">
          {homeCategoryTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-bold tracking-wider px-4 py-2 border transition-colors whitespace-nowrap ${
                activeTab === tab ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-600 hover:border-black'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {displayProducts.map(p => (
            <ProductCard
              key={p.id}
              p={p}
              onAdd={onAdd}
              onBuyNow={onBuyNow}
              onView={onView}
              isWishlisted={wishlistIds.includes(p.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => onCategorySelect(activeTab === 'Bestsellers' ? 'ALL' : activeTab)}
            className="border-2 border-black text-black text-xs font-bold tracking-[0.15em] px-10 py-4 hover:bg-black hover:text-white transition-colors"
          >
            VIEW ALL {activeTab.toUpperCase()} ({products.length})
          </button>
        </div>
      </div>

      {/* Editorial Split Banner */}
      {(() => {
        const featuredEditorial = products.find(p => p.badge?.toUpperCase() === 'BESTSELLER' && p.imgId) || products.find(p => p.imgId)
        return (
          <div className="bg-gray-100 py-16">
            <div className="max-w-screen-xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="relative aspect-[4/5] bg-zinc-950 overflow-hidden">
                {featuredEditorial?.imgId ? (
                  <img src={img(featuredEditorial.imgId, 700, 900)} alt={featuredEditorial.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center p-6 text-center">
                    <span className="text-3xl font-black text-white/20 tracking-widest">AROVIA FIT</span>
                  </div>
                )}
              </div>
              <div className="space-y-6 max-w-lg">
                <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">SIGNATURE SERIES</span>
                <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  {featuredEditorial ? featuredEditorial.name : "Work-To-Wine: The Modern Woman's Uniform"}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {featuredEditorial?.description || "Crafted from high-performance knit with structural darts and an ultra-flattering drape. Designed for all-day comfort and effortless movement."}
                </p>
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => onCategorySelect(featuredEditorial?.category || 'Bottoms')}
                    className="bg-black text-white text-xs font-bold tracking-[0.15em] px-8 py-3.5 hover:bg-gray-800 transition-colors"
                  >
                    EXPLORE COLLECTION
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Customer Reviews & Live Rating Section */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 text-lg">★★★★★</span>
              <span className="font-bold text-sm">4.9 / 5 Rating</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight">Loved By Over 50,000+ Women</h2>
          </div>
          <button
            onClick={() => setShowReviewForm(v => !v)}
            className="border border-black text-black text-xs font-bold tracking-wider px-6 py-3 hover:bg-black hover:text-white transition-colors"
          >
            {showReviewForm ? 'Close Form' : '✍ Write a Review'}
          </button>
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-10 max-w-2xl mx-auto animate-in fade-in duration-200">
            <h3 className="font-bold text-sm mb-4">Submit Verified Customer Review</h3>
            {submittedMessage ? (
              <p className="text-emerald-700 font-bold text-xs p-3 bg-emerald-50 border border-emerald-200 rounded">{submittedMessage}</p>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold block mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Radhika M."
                      value={revName}
                      onChange={e => setRevName(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Product</label>
                    <select
                      value={revProd}
                      onChange={e => setRevProd(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
                    >
                      {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Rating</label>
                  <div className="flex gap-2">
                    {[5, 4, 3, 2, 1].map(r => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRevRating(r)}
                        className={`px-3 py-1.5 border rounded text-xs font-bold ${
                          revRating === r ? 'bg-amber-400 text-black border-amber-400' : 'bg-white border-gray-300'
                        }`}
                      >
                        {r} ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Your Review</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Tell us about the fit, fabric quality, and comfort..."
                    value={revText}
                    onChange={e => setRevText(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-black text-white font-bold px-6 py-2.5 rounded hover:bg-gray-800 transition-colors"
                >
                  Publish Review
                </button>
              </form>
            )}
          </div>
        )}

        {/* Reviews Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.slice(0, 6).map((r, i) => (
            <div key={i} className="bg-white border border-gray-100 p-6 rounded-lg shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Stars rating={r.rating} />
                  <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 font-bold rounded">VERIFIED BUYER</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed italic">"{r.text}"</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-[11px]">
                <span className="font-bold text-gray-900">{r.name}</span>
                <span className="text-gray-400">{r.product_name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instagram Community Feed */}
      {(() => {
        const communityPhotos = products.flatMap(p => p.images || [p.imgId]).filter(Boolean).slice(0, 6)
        if (communityPhotos.length === 0) return null
        return (
          <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-12">
            <div className="text-center mb-8">
              <p className="text-[10px] font-bold tracking-[0.25em] text-gray-400">@AROVIAFIT ON INSTAGRAM</p>
              <h3 className="text-xl font-black mt-1">Join The Community</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {communityPhotos.map((pid, idx) => (
                <div key={idx} className="relative aspect-square overflow-hidden group bg-gray-100 cursor-pointer">
                  <img src={img(pid, 300, 300)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                    ♥ arovia
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Product Detail Page (PDP) ────────────────────────────────────────────────
function PDPPage({
  product,
  products,
  reviews,
  onAdd,
  onBuyNow,
  onView,
  wishlistIds,
  onToggleWishlist,
  onAddReview
}: {
  product: Product
  products: Product[]
  reviews: DBReview[]
  onAdd: (p: Product, size: string, color: string) => void
  onBuyNow: (p: Product, size: string, color: string) => void
  onView: (p: Product) => void
  wishlistIds: number[]
  onToggleWishlist: (id: number) => void
  onAddReview: (prodName: string, name: string, text: string, rating: number, prodId?: number) => void
}) {
  const [selectedSize, setSelectedSize] = useState('M')
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? '#111')
  const [activeImageId, setActiveImageId] = useState(() => {
    return isValidImg(product.imgId) ? product.imgId : (product.images?.find(isValidImg) || '')
  })
  const [pincode, setPincode] = useState('')
  const [deliveryMsg, setDeliveryMsg] = useState('')
  const [openAccordion, setOpenAccordion] = useState<'fabric' | 'fit' | 'shipping' | null>('fabric')
  const [showSizeGuide, setShowSizeGuide] = useState(false)

  // Inline PDP review modal
  const [showRevModal, setShowRevModal] = useState(false)
  const [revName, setRevName] = useState('')
  const [revText, setRevText] = useState('')
  const [revRating, setRevRating] = useState(5)
  const [revSubmitted, setRevSubmitted] = useState(false)

  const galleryImages = useMemo(() => {
    const list = product.images && product.images.length > 0 ? product.images : [product.imgId]
    return list.filter(isValidImg)
  }, [product])

  const productReviews = reviews.filter(r => r.product_id === product.id || r.product_name === product.name)
  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4)
  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100)

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(pincode.trim())) {
      setDeliveryMsg('❌ Please enter a valid 6-digit Indian PIN code.')
      return
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 3)
    const dayName = days[targetDate.getDay()]
    const dateStr = targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    setDeliveryMsg(`✓ Free Express Delivery to ${pincode} by ${dayName}, ${dateStr}!`)
  }

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!revName.trim() || !revText.trim()) return
    onAddReview(product.name, revName.trim(), revText.trim(), revRating, product.id)
    setRevSubmitted(true)
    setTimeout(() => {
      setShowRevModal(false)
      setRevSubmitted(false)
      setRevName('')
      setRevText('')
    }, 1500)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
        {/* Left: Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] bg-zinc-950 overflow-hidden">
            {activeImageId ? (
              <img src={img(activeImageId, 800, 1066)} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex flex-col items-center justify-center p-8 text-center">
                <span className="text-3xl font-black text-white/30 tracking-widest uppercase">AROVIA</span>
                <span className="text-xs text-zinc-500 uppercase tracking-widest mt-2">{product.name}</span>
              </div>
            )}
            <Badge text={product.badge} />
          </div>
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {galleryImages.map((photoId, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImageId(photoId)}
                  className={`aspect-[3/4] bg-gray-100 cursor-pointer overflow-hidden border-2 transition-all ${
                    activeImageId === photoId ? 'border-black' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img(photoId, 200, 260)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="space-y-6">
          <div>
            {/* Category & Subcategory Header Breadcrumb */}
            <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider">
              <span className="text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                📁 {product.category}
              </span>
              {(product.subCategory || product.sub_category) && (
                <>
                  <span className="text-zinc-400">›</span>
                  <span className="text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                    🏷️ {product.subCategory || product.sub_category}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Stars rating={product.rating} />
              <span className="text-xs text-gray-500 font-medium">({productReviews.length || product.reviews} reviews)</span>
              <span className="text-xs text-gray-300">•</span>
              <span className="text-xs text-emerald-700 font-semibold">In Stock ({product.stock ?? 100} available)</span>
            </div>
          </div>

          <div className="border-y border-gray-100 py-4 flex items-baseline gap-3">
            <span className="text-2xl font-black">₹{product.price.toLocaleString()}</span>
            <span className="text-sm text-gray-400 line-through">₹{product.mrp.toLocaleString()}</span>
            <span className="text-xs text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">{discount}% OFF</span>
          </div>

          {/* Color Selector */}
          <div>
            <p className="text-xs font-bold mb-2">COLOR: <span className="font-normal text-gray-500">{selectedColor}</span></p>
            <div className="flex gap-2">
              {product.colors.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedColor(c)}
                  style={{ background: c }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${selectedColor === c ? 'border-black scale-110' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold">SELECT SIZE</p>
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="text-[11px] text-gray-600 underline font-semibold flex items-center gap-1 hover:text-black transition-colors"
              >
                <span>📏</span>
                <span>Size Guide</span>
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`py-3 text-xs font-bold border transition-colors ${
                    selectedSize === s ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-800 hover:border-black'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => onAdd(product, selectedSize, selectedColor)}
              className="w-full bg-black text-white text-xs font-bold tracking-[0.15em] py-4 hover:bg-gray-800 transition-colors shadow-sm"
            >
              ADD TO BAG
            </button>
            <button
              onClick={() => onBuyNow(product, selectedSize, selectedColor)}
              className="w-full bg-[#0c2340] text-white text-xs font-bold tracking-[0.15em] py-4 hover:bg-[#07192e] transition-colors shadow-sm"
            >
              ⚡ BUY NOW WITH 1-CLICK
            </button>
            <button
              onClick={() => onToggleWishlist(product.id)}
              className="w-full border border-gray-300 text-xs font-bold py-3 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className={wishlistIds.includes(product.id) ? 'text-red-500' : 'text-gray-400'}>♥</span>
              <span>{wishlistIds.includes(product.id) ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
            </button>
          </div>

          {/* Pincode Estimator */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-2">
            <p className="text-xs font-bold">DELIVERY & ESTIMATED ARRIVAL</p>
            <form onSubmit={handlePincodeCheck} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit Indian PIN code"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                className="text-xs border border-gray-300 rounded px-3 py-2 flex-1 bg-white focus:outline-none"
              />
              <button type="submit" className="bg-black text-white text-xs font-bold px-4 py-2 rounded">
                Check
              </button>
            </form>
            {deliveryMsg && (
              <p className={`text-xs font-medium ${deliveryMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>
                {deliveryMsg}
              </p>
            )}
          </div>

          {/* Product Details Accordion */}
          <div className="border-t border-gray-200 pt-4 divide-y divide-gray-100 text-xs">
            <div className="py-3">
              <button
                onClick={() => setOpenAccordion(openAccordion === 'fabric' ? null : 'fabric')}
                className="w-full flex justify-between font-bold text-left"
              >
                <span>FABRIC & MATERIAL SPECIFICATIONS</span>
                <span>{openAccordion === 'fabric' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'fabric' && (
                <p className="mt-2 text-gray-600 leading-relaxed">
                  {product.description || 'Crafted with 80% Micro-Poly and 20% Elastane. 4-way mechanical stretch, anti-odor silver ion finish, and quick moisture evacuation.'}
                </p>
              )}
            </div>
            <div className="py-3">
              <button
                onClick={() => setOpenAccordion(openAccordion === 'fit' ? null : 'fit')}
                className="w-full flex justify-between font-bold text-left"
              >
                <span>FIT & SIZING RECOMMENDATIONS</span>
                <span>{openAccordion === 'fit' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'fit' && (
                <p className="mt-2 text-gray-600 leading-relaxed">
                  True to size. Model is 5\'8" and wearing size S. For a compression athletic fit, choose your exact size. For a relaxed lounge feel, consider sizing up.
                </p>
              )}
            </div>
            <div className="py-3">
              <button
                onClick={() => setOpenAccordion(openAccordion === 'shipping' ? null : 'shipping')}
                className="w-full flex justify-between font-bold text-left"
              >
                <span>FREE SHIPPING & 7-DAY DOORSTEP RETURNS</span>
                <span>{openAccordion === 'shipping' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'shipping' && (
                <p className="mt-2 text-gray-600 leading-relaxed">
                  Free express shipping on prepaid orders over ₹999. Easy 7-day doorstep return and exchange with no questions asked.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verified Reviews for this SKU */}
      <div className="mt-20 border-t border-gray-200 pt-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-black">Customer Reviews for {product.name}</h3>
            <p className="text-xs text-gray-500 mt-1">Verified buyer feedback & ratings</p>
          </div>
          <button
            onClick={() => setShowRevModal(true)}
            className="bg-black text-white text-xs font-bold px-4 py-2.5 rounded hover:bg-gray-800"
          >
            + Write a Review
          </button>
        </div>

        {productReviews.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg text-xs text-gray-500">
            No customer reviews submitted yet for this product. Be the first to review!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productReviews.map((r, i) => (
              <div key={i} className="bg-white border border-gray-200 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-1.5">
                  <Stars rating={r.rating} />
                  <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 font-bold rounded">VERIFIED PURCHASE</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">"{r.text}"</p>
                <p className="text-[11px] font-bold text-gray-900 mt-3">{r.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal on PDP */}
      {showRevModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <h4 className="font-bold text-sm">Review {product.name}</h4>
              <button onClick={() => setShowRevModal(false)} className="text-gray-400 font-bold">✕</button>
            </div>
            {revSubmitted ? (
              <div className="text-center py-8 text-green-700 font-bold text-xs">
                ✓ Thank you! Your review has been saved.
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={revName}
                    onChange={e => setRevName(e.target.value)}
                    placeholder="e.g. Shalini P."
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Star Rating</label>
                  <div className="flex gap-2">
                    {[5, 4, 3, 2, 1].map(r => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRevRating(r)}
                        className={`px-3 py-1.5 border rounded text-xs font-bold ${
                          revRating === r ? 'bg-amber-400 text-black border-amber-400' : 'bg-white border-gray-300'
                        }`}
                      >
                        {r} ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Feedback</label>
                  <textarea
                    rows={3}
                    required
                    value={revText}
                    onChange={e => setRevText(e.target.value)}
                    placeholder="How does it fit? Is the fabric comfortable?"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-black text-white font-bold py-3 rounded hover:bg-gray-800"
                >
                  Submit Review
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-20 border-t border-gray-200 pt-12">
          <h3 className="text-xl font-black mb-6">Complete The Look</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map(p => (
              <ProductCard
                key={p.id}
                p={p}
                onAdd={prod => onAdd(prod, 'M', prod.colors[0] || '#111')}
                onBuyNow={prod => onBuyNow(prod, 'M', prod.colors[0] || '#111')}
                onView={onView}
                isWishlisted={wishlistIds.includes(p.id)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </div>
      )}

      {/* Interactive Size Guide Modal */}
      <Suspense fallback={null}>
        <SizeGuideModal
          open={showSizeGuide}
          onClose={() => setShowSizeGuide(false)}
          category={product.category}
        />
      </Suspense>

      {/* Sticky Mobile Add to Bag Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 sm:hidden shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src={img(activeImageId, 60, 80)} alt="" className="w-9 h-12 object-cover rounded bg-gray-100 shrink-0" />
          <div className="truncate">
            <p className="text-xs font-bold truncate text-gray-900">{product.name}</p>
            <p className="text-xs font-black text-black">₹{product.price.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={selectedSize}
            onChange={e => setSelectedSize(e.target.value)}
            className="text-xs font-bold border border-gray-300 rounded-lg px-2 py-2.5 bg-white focus:outline-none"
          >
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => onAdd(product, selectedSize, selectedColor)}
            className="bg-black text-white text-[10px] font-bold tracking-wider px-3.5 py-2.5 rounded-lg shadow-sm hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            ADD TO BAG
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Collection Page ─────────────────────────────────────────────────────────
function CollectionPage({
  products,
  categories: dynamicCategories,
  initialCategory,
  searchQuery,
  onAdd,
  onBuyNow,
  onView,
  wishlistIds,
  onToggleWishlist
}: {
  products: Product[]
  categories?: DBCategory[]
  initialCategory?: string
  searchQuery?: string
  onAdd: (p: Product) => void
  onBuyNow?: (p: Product) => void
  onView: (p: Product) => void
  wishlistIds?: number[]
  onToggleWishlist?: (id: number) => void
}) {
  const [selectedCat, setSelectedCat] = useState(initialCategory || 'ALL')
  const [selectedSubCat, setSelectedSubCat] = useState('ALL')
  const [sort, setSort] = useState('featured')

  useEffect(() => {
    setSelectedCat(initialCategory || 'ALL')
    setSelectedSubCat('ALL')
  }, [initialCategory])

  const categoryTabs = useMemo(() => {
    const dyn = (dynamicCategories || []).map(c => c.name).filter(Boolean)
    const set = new Set(['ALL', 'Bestsellers', 'New', ...dyn])
    // Also include any categories present in products
    products.forEach(p => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [dynamicCategories, products])

  // Subcategories available for active category
  const availableSubCategories = useMemo(() => {
    if (selectedCat === 'ALL' || selectedCat === 'Bestsellers' || selectedCat === 'New') {
      const allSubs = new Set<string>()
      products.forEach(p => {
        const s = p.subCategory || p.sub_category
        if (s) allSubs.add(s)
      })
      return Array.from(allSubs)
    }
    const matched = dynamicCategories?.find(c => c.name.toLowerCase() === selectedCat.toLowerCase())
    if (matched && matched.subCategories.length > 0) return matched.subCategories
    const prodsSubs = new Set<string>()
    products.filter(p => p.category?.toLowerCase() === selectedCat.toLowerCase()).forEach(p => {
      const s = p.subCategory || p.sub_category
      if (s) prodsSubs.add(s)
    })
    return Array.from(prodsSubs)
  }, [selectedCat, dynamicCategories, products])

  // Filter products by Category, Subcategory and Search Query
  const filteredList = useMemo(() => {
    const catUpper = selectedCat.trim().toUpperCase()
    const selCatLower = selectedCat.trim().toLowerCase()
    const selSubCatUpper = selectedSubCat.trim().toUpperCase()
    const selSubCatLower = selectedSubCat.trim().toLowerCase()
    const q = (searchQuery || '').trim().toLowerCase()

    return products.filter(p => {
      let matchCat = true
      const badgeUpper = (p.badge || '').trim().toUpperCase()
      const prodCatLower = (p.category || '').trim().toLowerCase()
      const prodSubCatLower = (p.subCategory || p.sub_category || '').trim().toLowerCase()

      if (catUpper === 'BESTSELLERS') {
        matchCat = badgeUpper.includes('BESTSELLER') || p.rating >= 4.7
      } else if (catUpper === 'NEW' || catUpper === 'NEW ARRIVALS') {
        matchCat = badgeUpper.includes('NEW') || badgeUpper === 'NEW' || badgeUpper === 'NEW COLOURS' || badgeUpper === 'NEW ARRIVAL'
      } else if (catUpper !== 'ALL') {
        // Matches if product's category matches, or if product's subcategory equals selected category
        matchCat =
          prodCatLower === selCatLower ||
          prodSubCatLower === selCatLower ||
          prodCatLower.includes(selCatLower) ||
          selCatLower.includes(prodCatLower)
      }

      let matchSub = true
      if (selSubCatUpper !== 'ALL') {
        // Check exact match, or if subcategory contains it, or if product subcategory equals selected category
        matchSub =
          prodSubCatLower === selSubCatLower ||
          prodSubCatLower.includes(selSubCatLower) ||
          selSubCatLower.includes(prodSubCatLower)
      }

      let matchSearch = true
      if (q) {
        matchSearch =
          (p.name || '').toLowerCase().includes(q) ||
          prodCatLower.includes(q) ||
          prodSubCatLower.includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      }

      return matchCat && matchSub && matchSearch
    })
  }, [products, selectedCat, selectedSubCat, searchQuery])

  // Fallback: If subcategory is selected but yields 0 results, fall back to all items for that category
  let list = filteredList
  if (list.length === 0 && selectedSubCat.trim().toUpperCase() !== 'ALL') {
    const selCatLower = selectedCat.trim().toLowerCase()
    const catUpper = selectedCat.trim().toUpperCase()
    const categoryOnlyList = products.filter(p => {
      const prodCatLower = (p.category || '').trim().toLowerCase()
      const prodSubCatLower = (p.subCategory || p.sub_category || '').trim().toLowerCase()
      if (catUpper === 'ALL') return true
      if (catUpper === 'BESTSELLERS') return (p.badge || '').toUpperCase().includes('BESTSELLER') || p.rating >= 4.7
      if (catUpper === 'NEW' || catUpper === 'NEW ARRIVALS') return (p.badge || '').toUpperCase().includes('NEW')
      return (
        prodCatLower === selCatLower ||
        prodSubCatLower === selCatLower ||
        prodCatLower.includes(selCatLower) ||
        selCatLower.includes(prodCatLower)
      )
    })
    if (categoryOnlyList.length > 0) {
      list = categoryOnlyList
    }
  }

  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-8">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
          <span>STORE</span>
          <span>›</span>
          <span className="text-black">{selectedCat}</span>
          {selectedSubCat !== 'ALL' && (
            <>
              <span>›</span>
              <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {selectedSubCat}
              </span>
            </>
          )}
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-2">
          {searchQuery
            ? `Search Results for "${searchQuery}"`
            : selectedSubCat !== 'ALL'
            ? `${selectedSubCat} (${selectedCat})`
            : selectedCat === 'ALL'
            ? 'All Activewear & Essentials'
            : `${selectedCat} Collection`}
        </h1>
        <p className="text-xs text-gray-500">
          Showing {list.length} performance pieces engineered for all-day comfort.
        </p>
      </div>

      {/* Main Categories Row */}
      <div className="flex items-center justify-between border-y border-gray-100 py-3.5 mb-3 gap-4 overflow-x-auto">
        <div className="flex gap-2">
          {categoryTabs.map(c => (
            <button
              key={c}
              onClick={() => {
                setSelectedCat(c)
                setSelectedSubCat('ALL')
              }}
              className={`text-xs font-bold tracking-wider px-4 py-2 border transition-colors whitespace-nowrap ${
                selectedCat.toUpperCase() === c.toUpperCase() ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-600 hover:border-black'
              }`}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>

        <select value={sort} onChange={e => setSort(e.target.value)} className="text-xs font-bold border border-gray-200 px-3 py-2 focus:outline-none">
          <option value="featured">SORT BY: FEATURED</option>
          <option value="price-asc">PRICE: LOW TO HIGH</option>
          <option value="price-desc">PRICE: HIGH TO LOW</option>
          <option value="rating">TOP RATED</option>
        </select>
      </div>

      {/* Subcategories Row (When available) */}
      {availableSubCategories.length > 0 && (
        <div className="flex items-center gap-2 mb-8 overflow-x-auto py-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
            Subcategories:
          </span>
          <button
            onClick={() => setSelectedSubCat('ALL')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
              selectedSubCat === 'ALL'
                ? 'bg-purple-700 text-white border-purple-700 font-bold'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            All Subcategories
          </button>
          {availableSubCategories.map(sc => (
            <button
              key={sc}
              onClick={() => setSelectedSubCat(sc)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap flex items-center gap-1 ${
                selectedSubCat === sc
                  ? 'bg-purple-700 text-white border-purple-700 font-bold shadow-xs'
                  : 'bg-purple-50/70 border-purple-200/80 text-purple-900 hover:bg-purple-100'
              }`}
            >
              <span>↳</span>
              <span>{sc}</span>
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          No items found for category "{selectedCat}". Try switching category filters above.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {list.map(p => (
            <ProductCard
              key={p.id}
              p={p}
              onAdd={onAdd}
              onBuyNow={onBuyNow}
              onView={onView}
              isWishlisted={wishlistIds?.includes(p.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Cart Page (Razorpay Payment Flow) ──────────────────────────────────────
function CartPage({
  cart,
  onRemove,
  onQtyChange,
  onPlaceOrder,
  onProcessPayment,
  onContinueShopping,
  onTrackOrder
}: {
  cart: CartItem[]
  onRemove: (id: number, size: string) => void
  onQtyChange: (id: number, size: string, qty: number) => void
  onPlaceOrder: (
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
  ) => Promise<string>
  onProcessPayment: (orderId: string, method: string, amount: number) => Promise<string>
  onContinueShopping: () => void
  onTrackOrder?: (order: DBOrder) => void
}) {
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const shipping = subtotal > 999 ? 0 : 99
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)

  // Customer Checkout Details
  const [custName, setCustName] = useState('Ananya Sharma')
  const [custEmail, setCustEmail] = useState('ananya@example.com')
  const [custPhone, setCustPhone] = useState('9876543210')
  const [custAddress, setCustAddress] = useState('Flat 402, Sunshine Heights, Bandra West')
  const [custCity, setCustCity] = useState('Mumbai')
  const [custState, setCustState] = useState('Maharashtra')
  const [custPincode, setCustPincode] = useState('400050')
  const [formError, setFormError] = useState('')

  const [razorpayOpen, setRazorpayOpen] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState<string>('')
  const [confirmedPaymentId, setConfirmedPaymentId] = useState<string>('')
  const [orderComplete, setOrderComplete] = useState(false)

  const discount = couponApplied ? Math.round(subtotal * 0.08) : 0
  const total = subtotal - discount + shipping

  const handleStartCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!custName.trim() || !custEmail.trim() || !custAddress.trim() || !custPincode.trim()) {
      setFormError('Please fill in all mandatory delivery address fields.')
      return
    }
    if (!/^\d{10}$/.test(custPhone.trim())) {
      setFormError('Please enter a valid 10-digit mobile number.')
      return
    }
    setFormError('')

    const orderId = await onPlaceOrder(
      cart,
      subtotal,
      discount,
      shipping,
      total,
      custName,
      custEmail,
      custAddress,
      custPhone,
      custPincode,
      custCity,
      custState
    )
    setPendingOrderId(orderId)
    setRazorpayOpen(true)
  }

  const handlePaymentSuccess = async (method: string) => {
    const payId = await onProcessPayment(pendingOrderId, method, total)
    setConfirmedPaymentId(payId)
    setRazorpayOpen(false)
    setOrderComplete(true)
  }

  if (orderComplete) {
    const mockOrder: DBOrder = {
      id: pendingOrderId,
      session_id: 'session',
      items: cart,
      subtotal,
      discount,
      shipping,
      total,
      status: 'Processing',
      payment_status: 'Paid',
      payment_id: confirmedPaymentId,
      tracking_number: 'TRK-' + Math.floor(100000 + Math.random() * 900000),
      customer_name: custName,
      customer_email: custEmail,
      customer_phone: custPhone,
      shipping_address: custAddress,
      city: custCity,
      state: custState,
      postal_code: custPincode,
      created_at: new Date().toISOString()
    }
    return (
      <OrderInvoiceReceipt
        order={mockOrder}
        onContinueShopping={onContinueShopping}
        onTrackOrder={onTrackOrder}
      />
    )
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto my-24 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-2xl mb-4">
          🛍
        </div>
        <h2 className="text-xl font-bold mb-2">Your Bag is Empty</h2>
        <p className="text-xs text-gray-500 mb-6">Looks like you haven't added any items to your bag yet.</p>
        <button
          onClick={onContinueShopping}
          className="bg-black text-white text-xs font-bold tracking-[0.15em] px-8 py-3.5 hover:bg-gray-800 transition-colors"
        >
          EXPLORE NEW ARRIVALS
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-10">
      <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-8">Checkout & Shopping Bag</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Items + Delivery Address Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Cart items */}
          <div className="border border-gray-200 rounded-lg p-6 divide-y divide-gray-100 bg-white">
            <h3 className="font-bold text-sm mb-4">Your Items ({cart.reduce((a, b) => a + b.qty, 0)})</h3>
            {cart.map((item, idx) => (
              <div key={`${item.product.id}-${item.size}-${idx}`} className="py-4 flex gap-4">
                <img src={img(item.product.imgId, 100, 140)} alt="" className="w-16 h-22 object-cover bg-gray-100 rounded-xs" />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between">
                      <h4 className="font-bold text-sm">{item.product.name}</h4>
                      <button onClick={() => onRemove(item.product.id, item.size)} className="text-gray-400 hover:text-black text-xs">✕</button>
                    </div>
                    <p className="text-xs text-gray-500">Size: <span className="font-semibold text-black">{item.size}</span></p>
                    <p className="text-xs font-black mt-1">₹{item.product.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border border-gray-200">
                      <button onClick={() => onQtyChange(item.product.id, item.size, item.qty - 1)} className="px-2 py-0.5 text-xs hover:bg-gray-100">-</button>
                      <span className="px-2 text-xs font-medium">{item.qty}</span>
                      <button onClick={() => onQtyChange(item.product.id, item.size, item.qty + 1)} className="px-2 py-0.5 text-xs hover:bg-gray-100">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Details Form */}
          <form id="checkout-form" onSubmit={handleStartCheckout} className="border border-gray-200 rounded-lg p-6 bg-white space-y-4">
            <h3 className="font-bold text-sm border-b border-gray-100 pb-3">Delivery & Shipping Address</h3>
            
            {formError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200 font-medium">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={custEmail}
                  onChange={e => setCustEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Mobile Phone (10 digits) *</label>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">PIN Code (6 digits) *</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={custPincode}
                  onChange={e => setCustPincode(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold block mb-1">Street Address / House No. *</label>
              <input
                type="text"
                required
                value={custAddress}
                onChange={e => setCustAddress(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">City</label>
                <input
                  type="text"
                  value={custCity}
                  onChange={e => setCustCity(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">State</label>
                <input
                  type="text"
                  value={custState}
                  onChange={e => setCustState(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Right: Order Summary */}
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-6 bg-white space-y-4">
            <h3 className="font-bold text-sm border-b border-gray-100 pb-3">Order Summary</h3>

            {/* Coupon input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Discount Code (AROVIA150)"
                value={coupon}
                onChange={e => setCoupon(e.target.value.toUpperCase())}
                className="text-xs border border-gray-300 rounded px-3 py-2 flex-1 font-mono uppercase"
              />
              <button
                type="button"
                onClick={() => {
                  if (coupon === 'AROVIA150' || coupon === 'SAVE10') {
                    setCouponApplied(true)
                  }
                }}
                className="bg-gray-100 text-black text-xs font-bold px-3 py-2 rounded hover:bg-black hover:text-white"
              >
                Apply
              </button>
            </div>
            {couponApplied && (
              <p className="text-[11px] text-green-700 font-semibold">✓ Promo code applied: 8% off order!</p>
            )}

            <div className="space-y-2 text-xs pt-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Coupon Discount</span>
                  <span>-₹{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className="text-green-700 font-bold">FREE</span> : `₹${shipping}`}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-3 text-black">
                <span>Total Amount</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              className="w-full bg-[#0c2340] hover:bg-[#07192e] text-white text-xs font-bold tracking-[0.15em] py-4 rounded transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <span>PAY VIA RAZORPAY</span>
              <span>🔒</span>
            </button>

            <div className="text-[10px] text-gray-400 text-center space-y-1 pt-2">
              <p>🔒 256-Bit Bank-Grade Encryption</p>
              <p>UPI • Credit/Debit Cards • Netbanking • COD</p>
            </div>
          </div>
        </div>
      </div>

      <RazorpayModal
        open={razorpayOpen}
        onClose={() => setRazorpayOpen(false)}
        amount={total}
        orderId={pendingOrderId}
        customerName={custName}
        customerEmail={custEmail}
        customerPhone={custPhone}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({
  onPageChange,
  onCategorySelect,
  onOpenInfo,
  onOpenSizeGuide,
  onRequestAdmin,
  onShowToast
}: {
  onPageChange: (p: Page) => void
  onCategorySelect?: (c: string) => void
  onOpenInfo?: (type: InfoModalType) => void
  onOpenSizeGuide?: () => void
  onRequestAdmin?: () => void
  onShowToast?: (msg: string) => void
}) {
  const [email, setEmail] = useState('')

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      onShowToast?.('Please enter a valid email address.')
      return
    }
    try {
      const subs = JSON.parse(localStorage.getItem('arovia_subscribers') || '[]')
      if (!subs.includes(email)) {
        subs.push(email)
        localStorage.setItem('arovia_subscribers', JSON.stringify(subs))
      }
    } catch (err) {}
    setEmail('')
    onShowToast?.('🎉 Subscribed! Use code WELCOME10 for 10% off your order.')
  }

  return (
    <footer className="bg-black text-white pt-16 pb-12 border-t border-gray-900 mt-20">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 mb-10 border-b border-gray-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-1.5 shadow-sm">
              <img src="/arovia-logo.png" alt="Arovia Fit" className="h-10 w-auto object-contain" />
            </div>
            <div>
              <p className="text-sm font-black tracking-widest text-white">AROVIA FIT</p>
              <p className="text-[10px] tracking-widest text-gray-400 uppercase">Comfort Meets Style</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 max-w-sm">Premium 4-way stretch activewear engineered in India for ultimate comfort, movement & style.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-400 mb-4">SHOP</p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><button onClick={() => onCategorySelect ? onCategorySelect('Bottoms') : onPageChange('collection')} className="hover:text-white transition-colors text-left">All Bottoms</button></li>
              <li><button onClick={() => onCategorySelect ? onCategorySelect('Sports Bras') : onPageChange('collection')} className="hover:text-white transition-colors text-left">Sports Bras</button></li>
              <li><button onClick={() => onCategorySelect ? onCategorySelect('Tops') : onPageChange('collection')} className="hover:text-white transition-colors text-left">Crop Tops</button></li>
              <li><button onClick={() => onCategorySelect ? onCategorySelect('Travel') : onPageChange('collection')} className="hover:text-white transition-colors text-left">Travel Collection</button></li>
              <li><button onClick={() => onCategorySelect ? onCategorySelect('Swimwear') : onPageChange('collection')} className="hover:text-white transition-colors text-left">Swimwear</button></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-400 mb-4">CUSTOMER CARE</p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><button onClick={() => onOpenInfo?.('returns')} className="hover:text-white transition-colors text-left">Returns & Exchange</button></li>
              <li><button onClick={() => onOpenInfo?.('shipping')} className="hover:text-white transition-colors text-left">Shipping Policy</button></li>
              <li><button onClick={() => onOpenSizeGuide ? onOpenSizeGuide() : onOpenInfo?.('fabric')} className="hover:text-white transition-colors text-left">Size Guide</button></li>
              <li><button onClick={() => onOpenInfo?.('contact')} className="hover:text-white transition-colors text-left">Contact Support</button></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-400 mb-4">ABOUT AROVIA FIT</p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><button onClick={() => onOpenInfo?.('story')} className="hover:text-white transition-colors text-left">Our Story</button></li>
              <li><button onClick={() => onOpenInfo?.('fabric')} className="hover:text-white transition-colors text-left">Fabric Innovation</button></li>
              <li><button onClick={() => onOpenInfo?.('sustainability')} className="hover:text-white transition-colors text-left">Sustainability</button></li>
              <li><button onClick={() => onRequestAdmin ? onRequestAdmin() : onPageChange('admin')} className="text-blue-400 hover:text-blue-300 text-left font-semibold">Admin Control Portal</button></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-400 mb-4">NEWSLETTER</p>
            <p className="text-xs text-gray-400 mb-3">Sign up for early access to drops and exclusive offers.</p>
            <form onSubmit={handleSubscribe} className="flex">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-gray-900 text-xs px-3 py-2.5 rounded-l w-full focus:outline-none border border-gray-800 text-white placeholder-gray-500"
                required
              />
              <button type="submit" className="bg-white text-black text-xs font-bold px-4 rounded-r hover:bg-gray-200 transition-colors">JOIN</button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <p>© 2026 AROVIA FIT INDIA PVT. LTD. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-4">
            <button onClick={() => onOpenInfo?.('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
            <button onClick={() => onOpenInfo?.('terms')} className="hover:text-white transition-colors">Terms of Service</button>
            <button onClick={() => onOpenInfo?.('refund')} className="hover:text-white transition-colors">Refund Policy</button>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Main Application Shell ──────────────────────────────────────────────────
export default function App() {
  const getInitialPage = (): Page => {
    if (typeof window === 'undefined') return 'home'
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
    const path = window.location.pathname.replace(/^\//, '').toLowerCase()
    const params = new URLSearchParams(window.location.search)
    const p = params.get('page')?.toLowerCase()

    if (hash === 'admin' || path === 'admin' || p === 'admin') {
      const isAuthed = sessionStorage.getItem('arovia_admin_auth') === 'true'
      if (isAuthed) return 'admin'
      return 'home'
    }
    if (hash === 'cart' || path === 'cart' || p === 'cart') return 'cart'
    if (hash === 'collection' || path === 'collection' || p === 'collection') return 'collection'
    if (hash === 'pdp' || path === 'pdp' || p === 'pdp') return 'pdp'
    return 'home'
  }

  const [page, setPage] = useState<Page>(getInitialPage)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('')
  const [cartOpen, setCartOpen] = useState(false)
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [trackModalOpen, setTrackModalOpen] = useState(false)
  const [trackInitialOrder, setTrackInitialOrder] = useState<DBOrder | undefined>(undefined)
  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState(false)
  const [infoModalType, setInfoModalType] = useState<InfoModalType | null>(null)
  const [globalSizeGuideOpen, setGlobalSizeGuideOpen] = useState(false)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => {
      setToastMsg(null)
    }, 3000)
  }

  const handleOpenTracker = (order?: DBOrder) => {
    setTrackInitialOrder(order)
    setTrackModalOpen(true)
  }

  // Realtime Supabase Backend Hook
  const {
    products: dbProducts,
    categories,
    reviews: dbReviews,
    cartItems: dbCartItems,
    wishlistIds,
    orders,
    payments,
    activityLog,
    isConnected,
    isConfigured,
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
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    deleteSubCategory,
    refreshData,
    bookOrderWithBlitzship,
    simulateRealtimeOrder
  } = useRealtimeBackend(ALL_PRODUCTS, REVIEWS)

  const productsList: Product[] = useMemo(() => {
    return dbProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      mrp: p.mrp,
      rating: p.rating,
      reviews: p.reviews,
      badge: p.badge,
      imgId: p.imgId,
      images: p.images || [p.imgId],
      colors: p.colors,
      category: p.category,
      subCategory: p.subCategory || p.sub_category || '',
      sub_category: p.subCategory || p.sub_category || '',
      description: p.description,
      stock: p.stock
    }))
  }, [dbProducts])

  const cart: CartItem[] = useMemo(() => {
    return dbCartItems.map(item => {
      const p = productsList.find(prod => Number(prod.id) === Number(item.productId)) || {
        id: item.productId,
        name: 'Activewear Product',
        price: 999,
        mrp: 1999,
        rating: 4.8,
        reviews: 100,
        badge: '',
        imgId: '',
        colors: [item.color || '#111'],
        category: 'Bottoms',
        stock: 100
      }
      return {
        product: p,
        size: item.size,
        color: item.color,
        qty: item.qty
      }
    })
  }, [dbCartItems, productsList])

  const wishlistProducts = useMemo(() => {
    return productsList.filter(p => wishlistIds.includes(p.id))
  }, [productsList, wishlistIds])

  const handleAddToCart = (p: Product, size = 'M', color = p.colors[0] || '#111') => {
    const existing = cart.find(i => Number(i.product.id) === Number(p.id) && i.size === size)
    const newQty = existing ? existing.qty + 1 : 1
    syncCartItem(p.id, size, color, newQty)
    showToast(`Added "${p.name}" (${size}) to your bag`)
    setCartOpen(true)
  }

  // ─── URL Deep Linking & History Navigation ──────────────────────────────────
  useEffect(() => {
    const parseUrl = () => {
      if (typeof window === 'undefined') return
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
      const path = window.location.pathname.replace(/^\//, '').toLowerCase()
      const params = new URLSearchParams(window.location.search)
      const p = (params.get('page') || '').toLowerCase()
      const prodId = params.get('id')
      const cat = params.get('category')
      const q = params.get('q')

      const isAdmin = hash === 'admin' || path === 'admin' || p === 'admin'
      if (isAdmin) {
        const isAuthed = sessionStorage.getItem('arovia_admin_auth') === 'true'
        if (isAuthed) {
          setPage('admin')
        } else {
          setPage('home')
          setAdminAuthModalOpen(true)
        }
      } else if (hash === 'cart' || path === 'cart' || p === 'cart') {
        setPage('cart')
      } else if (hash === 'collection' || path === 'collection' || p === 'collection') {
        setPage('collection')
      } else if (hash === 'pdp' || path === 'pdp' || p === 'pdp') {
        setPage('pdp')
      } else {
        setPage('home')
      }

      if (prodId && productsList.length > 0) {
        const found = productsList.find(pr => Number(pr.id) === Number(prodId))
        if (found) {
          setSelectedProduct(found)
          setPage('pdp')
        }
      }
      if (cat) {
        setSelectedCategory(decodeURIComponent(cat))
      } else {
        setSelectedCategory('ALL')
      }
      if (q) {
        setActiveSearchQuery(decodeURIComponent(q))
      } else {
        setActiveSearchQuery('')
      }
    }

    parseUrl()
    window.addEventListener('popstate', parseUrl)
    window.addEventListener('hashchange', parseUrl)
    return () => {
      window.removeEventListener('popstate', parseUrl)
      window.removeEventListener('hashchange', parseUrl)
    }
  }, [productsList])

  const navigateTo = (targetPage: Page, opts?: { productId?: number; category?: string; search?: string }) => {
    if (targetPage === 'admin') {
      const isAuthed = typeof window !== 'undefined' && sessionStorage.getItem('arovia_admin_auth') === 'true'
      if (!isAuthed) {
        setAdminAuthModalOpen(true)
        return
      }
    }
    setPage(targetPage)
    if (opts?.productId !== undefined) {
      const prod = productsList.find(p => p.id === opts.productId)
      if (prod) setSelectedProduct(prod)
    }
    if (opts?.category !== undefined) {
      setSelectedCategory(opts.category)
    } else {
      setSelectedCategory('ALL')
    }
    if (opts?.search !== undefined) {
      setActiveSearchQuery(opts.search)
    } else {
      setActiveSearchQuery('')
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams()
      if (targetPage !== 'home' && targetPage !== 'admin') params.set('page', targetPage)
      if (opts?.productId) params.set('id', String(opts.productId))
      if (opts?.category && opts.category !== 'ALL') params.set('category', opts.category)
      if (opts?.search) params.set('q', opts.search)
      const targetHash = targetPage === 'admin' ? '#admin' : ''
      const queryString = params.toString() ? `?${params.toString()}` : ''
      const newUrl = (window.location.pathname || '/') + queryString + targetHash
      window.history.pushState({ page: targetPage, ...opts }, '', newUrl)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBuyNow = (p: Product, size = 'M', color = p.colors[0] || '#111') => {
    const existing = cart.find(i => Number(i.product.id) === Number(p.id) && i.size === size)
    if (!existing) {
      syncCartItem(p.id, size, color, 1)
    }
    navigateTo('cart')
  }

  const handleCategorySelect = (category: string) => {
    navigateTo('collection', { category, search: '' })
  }

  const handleSearchSubmit = (query: string) => {
    navigateTo('collection', { category: 'ALL', search: query })
  }

  const handleViewProduct = (p: Product) => {
    navigateTo('pdp', { productId: p.id })
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans antialiased">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white text-xs font-bold px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Navigation */}
      {page !== 'admin' && (
      <Navigation
        cartCount={cart.reduce((a, b) => a + b.qty, 0)}
        wishlistCount={wishlistIds.length}
        categories={categories}
        onCartOpen={() => setCartOpen(true)}
        onWishlistOpen={() => setWishlistOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
        onPageChange={navigateTo}
        onCategorySelect={handleCategorySelect}
        isConnected={isConnected}
        isConfigured={isConfigured}
        lastRealtimeEvent={lastRealtimeEvent}
        onTrackOpen={() => handleOpenTracker()}
      />
      )}

      {/* Floating 1-Click Sync/Export to GitHub Button for instant real catalog capture */}
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={async () => {
            // Read directly from IndexedDB to capture full 100% resolution photos
            let prodsToExport = dbProducts
            try {
              if (window.indexedDB) {
                const db: IDBDatabase = await new Promise((resolve, reject) => {
                  const req = window.indexedDB.open('arovia_fit_idb', 1)
                  req.onsuccess = () => resolve(req.result)
                  req.onerror = () => reject(req.error)
                })
                const idbProds: any[] = await new Promise((resolve, reject) => {
                  const tx = db.transaction('products', 'readonly')
                  const store = tx.objectStore('products')
                  const req = store.getAll()
                  req.onsuccess = () => resolve(req.result || [])
                  req.onerror = () => reject(req.error)
                })
                if (idbProds && idbProds.length > 0) {
                  prodsToExport = idbProds
                }
              }
            } catch (err) {
              console.warn('IDB export fallback to dbProducts:', err)
            }

            const dataToExport = {
              products: prodsToExport,
              categories: categories
            }
            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'live_catalog.json'
            a.click()
            URL.revokeObjectURL(url)
            showToast('📥 Full resolution live_catalog.json downloaded!')
          }}
          className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-2xl border border-white/20 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
          title="Download the full resolution real local products and categories"
        >
          <span>🚀 1-Click Sync Real Data</span>
        </button>
      </div>

      {/* Main View Container */}
      <main className={page === 'admin' ? 'flex-1' : 'flex-1 pt-24'}>
        {page === 'home' && (
          <HomePage
            products={productsList}
            categories={categories}
            reviews={dbReviews}
            onAdd={handleAddToCart}
            onBuyNow={handleBuyNow}
            onView={handleViewProduct}
            wishlistIds={wishlistIds}
            onToggleWishlist={id => {
              const isWish = wishlistIds.includes(id)
              toggleWishlist(id, !isWish)
              showToast(!isWish ? 'Saved to Wishlist' : 'Removed from Wishlist')
            }}
            onCategorySelect={handleCategorySelect}
            onAddReview={addReview}
          />
        )}

        {page === 'collection' && (
          <CollectionPage
            products={productsList}
            categories={categories}
            initialCategory={selectedCategory}
            searchQuery={activeSearchQuery}
            onAdd={handleAddToCart}
            onBuyNow={handleBuyNow}
            onView={handleViewProduct}
            wishlistIds={wishlistIds}
            onToggleWishlist={id => {
              const isWish = wishlistIds.includes(id)
              toggleWishlist(id, !isWish)
            }}
          />
        )}

        {page === 'pdp' && selectedProduct && (
          <PDPPage
            product={selectedProduct}
            products={productsList}
            reviews={dbReviews}
            onAdd={handleAddToCart}
            onBuyNow={handleBuyNow}
            onView={handleViewProduct}
            wishlistIds={wishlistIds}
            onToggleWishlist={id => {
              const isWish = wishlistIds.includes(id)
              toggleWishlist(id, !isWish)
            }}
            onAddReview={addReview}
          />
        )}

        {page === 'cart' && (
          <CartPage
            cart={cart}
            onRemove={(id, size) => syncCartItem(id, size, '', 0)}
            onQtyChange={(id, size, qty) => {
              const item = cart.find(i => i.product.id === id && i.size === size)
              if (item) syncCartItem(id, size, item.color, qty)
            }}
            onPlaceOrder={placeOrder}
            onProcessPayment={processRazorpayPayment}
            onContinueShopping={() => { setPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            onTrackOrder={handleOpenTracker}
          />
        )}

        {page === 'admin' && (
          <Suspense fallback={
            <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-zinc-200 border-t-black rounded-full animate-spin" />
              <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Loading Admin Telemetry...</p>
            </div>
          }>
            <AdminPanel
              products={dbProducts}
              categories={categories}
              orders={orders}
              payments={payments}
              reviews={dbReviews}
              activityLog={activityLog}
              isConnected={isConnected}
              isConfigured={isConfigured}
              lastRealtimeEvent={lastRealtimeEvent}
              onSaveProduct={saveProduct}
              onDeleteProduct={deleteProduct}
              onUpdateProductStock={updateProductStock}
              onBulkAdjustStock={bulkAdjustStock}
              onUpdateOrderStatus={updateOrderStatus}
              onDeleteOrder={deleteOrder}
              onRefundOrder={refundOrder}
              onAddReview={addReview}
              onDeleteReview={deleteReview}
              onBulkImport={() => bulkSaveProducts(ALL_PRODUCTS)}
              onRefreshData={refreshData}
              onSimulateOrder={simulateRealtimeOrder}
              onReturnToStore={() => navigateTo('home')}
              onBookBlitzship={bookOrderWithBlitzship}
              onBulkUpdateCategory={bulkUpdateCategory}
              onBulkUpdateStock={bulkUpdateStock}
              onBulkUpdateBadge={bulkUpdateBadge}
              onBulkUpdatePrice={bulkUpdatePrice}
              onBulkDeleteProducts={bulkDeleteProducts}
              onBulkAttachImages={bulkAttachImages}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
              onAddSubCategory={addSubCategory}
              onDeleteSubCategory={deleteSubCategory}
            />
          </Suspense>
        )}
      </main>

      {/* Drawers and Overlays */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onRemove={(id, size) => syncCartItem(id, size, '', 0)}
        onQtyChange={(id, size, qty) => {
          const item = cart.find(i => i.product.id === id && i.size === size)
          if (item) syncCartItem(id, size, item.color, qty)
        }}
        onCheckout={() => {
          setCartOpen(false)
          setPage('cart')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />

      <WishlistDrawer
        open={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        wishlistProducts={wishlistProducts}
        onRemoveWishlist={id => toggleWishlist(id, false)}
        onAddToCart={(p, sz) => handleAddToCart(p, sz)}
        onViewProduct={handleViewProduct}
      />

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={productsList}
        onView={handleViewProduct}
        onSearchSubmit={handleSearchSubmit}
      />

      {page !== 'admin' && (
        <Footer
          onPageChange={navigateTo}
          onCategorySelect={handleCategorySelect}
          onOpenInfo={t => setInfoModalType(t)}
          onOpenSizeGuide={() => setGlobalSizeGuideOpen(true)}
          onRequestAdmin={() => {
            const isAuthed = typeof window !== 'undefined' && sessionStorage.getItem('arovia_admin_auth') === 'true'
            if (isAuthed) {
              navigateTo('admin')
            } else {
              setAdminAuthModalOpen(true)
            }
          }}
          onShowToast={showToast}
        />
      )}

      {/* Footer Interactive Info Modal */}
      {infoModalType && (
        <Suspense fallback={null}>
          <InfoModal
            type={infoModalType}
            onClose={() => setInfoModalType(null)}
          />
        </Suspense>
      )}

      {/* Admin Password Authentication Modal */}
      {adminAuthModalOpen && (
        <Suspense fallback={null}>
          <AdminAuthModal
            open={adminAuthModalOpen}
            onSuccess={() => {
              setAdminAuthModalOpen(false)
              setPage('admin')
              if (typeof window !== 'undefined') {
                window.location.hash = '#admin'
              }
              showToast('Admin Portal Unlocked')
            }}
            onCancel={() => {
              setAdminAuthModalOpen(false)
              if (page === 'admin') navigateTo('home')
            }}
          />
        </Suspense>
      )}

      {/* Global Size Guide Modal */}
      {globalSizeGuideOpen && (
        <Suspense fallback={null}>
          <SizeGuideModal
            open={globalSizeGuideOpen}
            onClose={() => setGlobalSizeGuideOpen(false)}
            category="Bottoms"
          />
        </Suspense>
      )}

      {/* Live BlitzShipz Realtime Tracking Modal */}
      {trackModalOpen && (
        <Suspense fallback={null}>
          <TrackingModal
            open={trackModalOpen}
            order={trackInitialOrder}
            onClose={() => {
              setTrackModalOpen(false)
              setTrackInitialOrder(undefined)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
