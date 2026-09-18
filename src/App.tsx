import { useState, useEffect } from 'react'
import { useRealtimeBackend } from './hooks/useRealtimeBackend'
import { DBProduct, DBReview, DBOrder, DBPayment } from './services/supabaseBackend'

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
const img = (id: string, w = 600, h = 800) =>
  !id ? 'https://images.unsplash.com/photo-1600696491085-19dbbeb4f8c1?w=600&h=800&fit=crop' :
  (id.startsWith('http') || id.startsWith('data:')) ? id :
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format`

// ─── Data Fallbacks ──────────────────────────────────────────────────────────
const ALL_PRODUCTS: Product[] = [
  { id: 1, name: 'Ultimate Flare Pants', price: 999, mrp: 1999, rating: 4.8, reviews: 608, badge: 'BESTSELLER', imgId: 'photo-1600696491085-19dbbeb4f8c1', colors: ['#111', '#6b7280', '#7c3aed'], category: 'Bottoms', description: 'Our best-selling flare pants crafted from ultra-soft 4-way stretch fabric. Flattering high-rise waist, wide leg opening, and moisture-wicking finish.', stock: 150 },
  { id: 2, name: 'Ultimate Straight Pants', price: 999, mrp: 1999, rating: 4.8, reviews: 842, badge: 'BESTSELLER', imgId: 'photo-1617372591382-4ecd2bf8bbc3', colors: ['#111', '#9ca3af', '#b45309'], category: 'Bottoms', description: 'Effortlessly versatile straight-leg pants that transition from the studio to the streets. Buttery smooth fabric with 4-way stretch.', stock: 120 },
  { id: 3, name: 'Work-To-Wine Wide Dart Pants', price: 1699, mrp: 1899, rating: 4.8, reviews: 312, badge: 'NEW', imgId: 'photo-1597586309225-a5db6dd03b3c', colors: ['#111', '#d97706'], category: 'Bottoms', description: 'Designed for the woman who does it all. Wide-leg silhouette with dart detailing for a structured yet comfortable fit.', stock: 80 },
  { id: 4, name: 'Cloud Korean Pants', price: 1999, mrp: 2499, rating: 4.8, reviews: 203, badge: 'NEW', imgId: 'photo-1597586309204-ab40c927296d', colors: ['#111', '#6b7280', '#0ea5e9'], category: 'Bottoms', description: 'Inspired by Korean street style. Relaxed silhouette, ultra-light fabric, elastic waist with drawstring for the perfect fit every time.', stock: 95 },
  { id: 5, name: 'Ultimate Leggings', price: 1199, mrp: 2299, rating: 4.9, reviews: 1205, badge: 'BESTSELLER', imgId: 'photo-1565118520546-8f6a088d6894', colors: ['#111', '#374151', '#7c3aed', '#0ea5e9'], category: 'Bottoms', description: 'The legging that started it all. Squat-proof, non-see-through, buttery soft fabric that moves with you all day.', stock: 300 },
  { id: 6, name: 'Power Up Sports Bra', price: 799, mrp: 1299, rating: 4.7, reviews: 445, badge: 'RESTOCKED', imgId: 'photo-1597586740347-a5a9d9a93e85', colors: ['#c53030', '#111', '#6b7280'], category: 'Innerwear', description: 'Medium-to-high support sports bra with removable cups, cross-back design, and wide underband for all-day comfort.', stock: 200 },
  { id: 7, name: 'Built-In Bra Crop Top', price: 899, mrp: 1499, rating: 4.8, reviews: 367, badge: 'NEW', imgId: 'photo-1579473755852-abe535c52ff0', colors: ['#f5f5f4', '#111'], category: 'Tops', description: 'Two-in-one crop top with built-in shelf bra. Light support, relaxed fit, and breathable fabric perfect for low-intensity workouts.', stock: 110 },
  { id: 8, name: 'V-Neck Racerback Top', price: 699, mrp: 1199, rating: 4.7, reviews: 289, badge: 'NEW COLOURS', imgId: 'photo-1552196527-90dc99d938bc', colors: ['#111', '#b45309', '#0ea5e9', '#7c3aed'], category: 'Tops', description: 'Classic racerback design with V-neckline. Quick-dry, odor-resistant, and available in an expanded colour palette.', stock: 140 },
  { id: 9, name: 'AirMelt Flare Pants', price: 1599, mrp: 2199, rating: 4.9, reviews: 534, badge: 'BESTSELLER', imgId: 'photo-1597586740716-27ca9e73029a', colors: ['#111', '#3b82f6'], category: 'Travel', description: 'Lightweight, packable flare pants perfect for travel. Wrinkle-resistant, quick-dry, and surprisingly comfortable on long flights.', stock: 175 },
  { id: 10, name: 'BareButter Straight Pants', price: 1799, mrp: 2499, rating: 4.8, reviews: 412, badge: 'NEW', imgId: 'photo-1597460927195-a6c823cc0d0e', colors: ['#111', '#3b82f6', '#6b7280'], category: 'Travel', description: 'Butter-soft straight pants designed for the modern traveller. Adjustable waistband and hidden pockets for your essentials.', stock: 130 },
  { id: 11, name: 'Absolute Invisible Bra', price: 699, mrp: 1199, rating: 4.9, reviews: 892, badge: 'BESTSELLER', imgId: 'photo-1579473755852-abe535c52ff0', colors: ['#f5f5f4', '#111', '#fcd34d'], category: 'Innerwear', description: 'Seamless, invisible bra with no-show construction under any outfit. Gentle support with full coverage moulded cups.', stock: 210 },
  { id: 12, name: 'Ultimate Comfort Sports Bra', price: 799, mrp: 1399, rating: 4.8, reviews: 623, badge: 'BESTSELLER', imgId: 'photo-1597586309225-a5db6dd03b3c', colors: ['#111', '#c53030', '#0ea5e9'], category: 'Innerwear', description: 'Our most popular sports bra. Light to medium support, padded cups, and wide straps that won\'t dig in.', stock: 190 },
  { id: 13, name: 'Cloud Baby Tee', price: 599, mrp: 999, rating: 4.6, reviews: 156, badge: 'NEW', imgId: 'photo-1597586740347-a5a9d9a93e85', colors: ['#f5f5f4', '#fcd34d', '#c53030'], category: 'Tops', description: 'Relaxed baby tee cut from cloud-soft jersey. Cropped silhouette, raw hem, and effortless fit for everyday wear.', stock: 85 },
  { id: 14, name: 'Swim Dress Racerback', price: 1999, mrp: 2799, rating: 4.8, reviews: 178, badge: 'NEW', imgId: 'photo-1617372591382-4ecd2bf8bbc3', colors: ['#111', '#0ea5e9', '#7c3aed'], category: 'Swimwear', description: 'Flattering racerback swim dress with built-in UPF 50+ protection. Chlorine-resistant fabric for long-lasting colour.', stock: 65 },
  { id: 15, name: 'One-Piece Swimsuit', price: 2199, mrp: 2999, rating: 4.7, reviews: 89, badge: 'NEW', imgId: 'photo-1597586309204-ab40c927296d', colors: ['#111', '#c53030'], category: 'Swimwear', description: 'Sculpting one-piece with tummy control panel, adjustable straps, and a sophisticated minimalist design.', stock: 50 },
  { id: 16, name: 'Full Sleeve Swim Dress', price: 2499, mrp: 3299, rating: 4.9, reviews: 67, badge: 'NEW', imgId: 'photo-1565118520546-8f6a088d6894', colors: ['#111', '#6b7280'], category: 'Swimwear', description: 'Elegant full-sleeve swim dress with UPF 50+ protection. Perfect for conservative swimmers and beach walks alike.', stock: 45 },
  { id: 17, name: 'BareButter Pullover', price: 1299, mrp: 1999, rating: 4.8, reviews: 234, badge: 'NEW', imgId: 'photo-1552196527-90dc99d938bc', colors: ['#f5f5f4', '#111', '#d97706'], category: 'Travel', description: 'Ultra-soft pullover perfect for layering on travels. Lightweight, packable, and wrinkle-free for the modern nomad.', stock: 90 },
  { id: 18, name: 'RibSupreme Flare Pants', price: 1499, mrp: 2199, rating: 4.7, reviews: 189, badge: 'RESTOCKED', imgId: 'photo-1600696491085-19dbbeb4f8c1', colors: ['#111', '#6b7280', '#7c3aed'], category: 'Travel', description: 'Ribbed flare pants with a premium hand-feel. 4-way stretch, high-waist, and side pockets for practicality.', stock: 115 },
]

const HERO_SLIDES = [
  { imgId: 'photo-1572251328767-e59f06f13ba1', label: 'AROVIA FIT MOVE', heading: 'Move Without\nLimits', sub: 'Performance wear designed for everyday movement.' },
  { imgId: 'photo-1662532577856-e8ee8b138a8b', label: 'EVERYDAY. ELEVATED.', heading: "Looks Like Style.\nFeels Like Freedom.", sub: 'From morning workouts to coffee runs.' },
  { imgId: 'photo-1638265499174-62c2cb29137a', label: 'NEW SEASON', heading: 'New Season.\nNew Energy.', sub: 'Discover the latest collection.' },
]

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

const INSTA_PHOTOS = [
  'photo-1572251328767-e59f06f13ba1',
  'photo-1747604712855-d1f26035e4d1',
  'photo-1638265499174-62c2cb29137a',
  'photo-1662532577856-e8ee8b138a8b',
  'photo-1677213584003-f45f39e7f372',
  'photo-1540827109409-17f40944f276',
]

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
  onView,
  isWishlisted,
  onToggleWishlist
}: {
  p: Product
  onAdd: (p: Product) => void
  onView: (p: Product) => void
  isWishlisted?: boolean
  onToggleWishlist?: (id: number) => void
}) {
  const [localWishlist, setLocalWishlist] = useState(false)
  const wish = isWishlisted !== undefined ? isWishlisted : localWishlist

  return (
    <div className="group">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 cursor-pointer" onClick={() => onView(p)}>
        <img
          src={img(p.imgId)}
          alt={p.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
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
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 transition-transform hover:scale-110"
          aria-label="Wishlist"
        >
          <span className={`text-lg leading-none transition-colors ${wish ? 'text-red-500' : 'text-gray-300'}`}>
            {wish ? '♥' : '♡'}
          </span>
        </button>
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={e => { e.stopPropagation(); onAdd(p) }}
            className="w-full bg-black text-white text-[10px] font-bold tracking-[0.2em] py-3.5 hover:bg-gray-900 transition-colors"
          >
            ADD TO BAG
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-1 cursor-pointer" onClick={() => onView(p)}>
        <p className="text-sm font-semibold leading-snug">{p.name}</p>
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
function SearchOverlay({ open, onClose, products, onView }: {
  open: boolean; onClose: () => void; products: Product[]; onView: (p: Product) => void
}) {
  const [q, setQ] = useState('')
  if (!open) return null

  const results = q.trim()
    ? products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase()))
    : []

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center pt-16 px-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search leggings, flare pants, tops, sports bras..."
            className="w-full text-base focus:outline-none placeholder-gray-400"
          />
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-black">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!q.trim() ? (
            <div>
              <p className="text-xs font-bold tracking-wider text-gray-400 mb-3">POPULAR SEARCHES</p>
              <div className="flex flex-wrap gap-2">
                {['Flare Pants', 'Leggings', 'Sports Bra', 'Swimwear', 'Korean Pants'].map(s => (
                  <button key={s} onClick={() => setQ(s)} className="text-xs border border-gray-200 px-3 py-1.5 hover:border-black transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No products matching "{q}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {results.map(p => (
                <div key={p.id} onClick={() => { onView(p); onClose() }} className="flex gap-3 cursor-pointer group p-2 hover:bg-gray-50">
                  <img src={img(p.imgId, 100, 133)} alt={p.name} className="w-16 h-20 object-cover bg-gray-100 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold group-hover:underline line-clamp-2">{p.name}</p>
                    <p className="text-xs font-bold mt-1">₹{p.price.toLocaleString()}</p>
                    <span className="text-[10px] text-gray-400">{p.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Mega Menu ────────────────────────────────────────────────────────────────
function MegaMenu({ open, onPageChange }: { open: boolean; onPageChange: (p: Page) => void }) {
  if (!open) return null

  return (
    <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl z-40 py-10 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-4 gap-8">
        <div>
          <p className="text-[10px] font-bold tracking-[0.25em] text-gray-400 mb-4">SHOP BY CATEGORY</p>
          <ul className="space-y-2.5 text-sm font-medium">
            {['Bottoms', 'Tops', 'Innerwear', 'Swimwear', 'Travel'].map(c => (
              <li key={c} onClick={() => onPageChange('collection')} className="hover:text-gray-500 cursor-pointer transition-colors">{c}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.25em] text-gray-400 mb-4">FEATURED</p>
          <ul className="space-y-2.5 text-sm font-medium">
            {['Bestsellers', 'New Arrivals', 'AirMelt Series', 'BareButter Collection', 'Work-To-Wine'].map(f => (
              <li key={f} onClick={() => onPageChange('collection')} className="hover:text-gray-500 cursor-pointer transition-colors">{f}</li>
            ))}
          </ul>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden group cursor-pointer" onClick={() => onPageChange('collection')}>
            <img src={img('photo-1600696491085-19dbbeb4f8c1', 400, 300)} alt="Bottoms" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 text-white">
              <p className="text-xs font-bold tracking-widest">BESTSELLING BOTTOMS</p>
              <p className="text-[10px] opacity-80 mt-0.5">Explore 4-way stretch pants</p>
            </div>
          </div>
          <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden group cursor-pointer" onClick={() => onPageChange('collection')}>
            <img src={img('photo-1597586740347-a5a9d9a93e85', 400, 300)} alt="Tops" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 text-white">
              <p className="text-xs font-bold tracking-widest">INNERWEAR & TOPS</p>
              <p className="text-[10px] opacity-80 mt-0.5">Butter-soft active essentials</p>
            </div>
          </div>
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
  onSearchOpen,
  onPageChange,
  isConnected,
  isConfigured,
  lastRealtimeEvent
}: {
  cartCount: number
  wishlistCount: number
  onCartOpen: () => void
  onSearchOpen: () => void
  onPageChange: (p: Page) => void
  isConnected?: boolean
  isConfigured?: boolean
  lastRealtimeEvent?: string
}) {
  const [megaOpen, setMegaOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className={`fixed top-0 left-0 right-0 z-30 transition-shadow duration-300 ${scrolled ? 'shadow-sm' : ''}`}>
      {/* Promo Bar */}
      <div className="bg-black text-white py-1.5 px-4 flex flex-col sm:flex-row items-center justify-between text-[11px]">
        <div className="flex-1 text-center sm:text-left">
          <p className="tracking-wide">
            ⚡ EXTRA ₹150 OFF ON PURCHASE OF 2 FAVES ⚡ | USE CODE: <span className="font-bold border border-white/40 px-2 py-0.5 ml-1">AROVIA150</span>
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 sm:mt-0 text-[10px]">
          {isConfigured ? (
            <span className={`px-2 py-0.5 rounded font-bold transition-all ${isConnected ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-amber-950 text-amber-400 border border-amber-700'}`}>
              {isConnected ? '🟢 Supabase Realtime Live' : '🟡 Connecting Realtime...'}
            </span>
          ) : (
            <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-medium border border-gray-700">
              ⚡ Realtime Ready (.env)
            </span>
          )}
          <button
            onClick={() => onPageChange('admin')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-0.5 rounded transition-colors tracking-wider ml-1"
          >
            ADMIN PANEL ⚡
          </button>
        </div>
      </div>

      {/* Main Nav */}
      <div className="bg-white border-b border-gray-100 relative" onMouseLeave={() => setMegaOpen(false)}>
        <div className="max-w-screen-xl mx-auto px-4 md:px-6">
          <div className="flex items-center h-14">
            {/* Left */}
            <nav className="hidden lg:flex items-center gap-6 flex-1">
              <button
                onMouseEnter={() => setMegaOpen(true)}
                className="text-sm font-medium flex items-center gap-1 hover:text-gray-500 transition-colors"
              >
                Women's <span className="text-[10px]">▾</span>
              </button>
              {['Shop All', 'Bestsellers', 'New', 'Trending'].map(l => (
                <button key={l} onClick={() => onPageChange('collection')} className="text-sm hover:text-gray-500 transition-colors">{l}</button>
              ))}
            </nav>

            {/* Mobile menu btn */}
            <button className="lg:hidden text-gray-600 hover:text-black transition-colors mr-3" onClick={() => setMobileOpen(v => !v)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>

            {/* Center: Logo */}
            <div className="flex-1 lg:flex-none flex justify-center lg:justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2">
              <button onClick={() => onPageChange('home')} className="text-2xl font-black tracking-[0.15em] flex items-center gap-1.5">
                <span className="bg-black text-white px-2 py-0.5 text-xl font-black tracking-wider">AROVIA</span>
                <span className="font-extrabold tracking-[0.2em] text-gray-900 text-xl">FIT</span>
              </button>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 ml-auto">
              <button onClick={onSearchOpen} className="p-2 text-gray-600 hover:text-black transition-colors" aria-label="Search">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </button>
              <button onClick={() => onPageChange('admin')} className="hidden sm:block p-2 text-gray-600 hover:text-black transition-colors" aria-label="Account">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                </svg>
              </button>
              <button className="p-2 text-gray-600 hover:text-black transition-colors relative" aria-label="Wishlist">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {wishlistCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center">{wishlistCount}</span>}
              </button>
              <button onClick={onCartOpen} className="p-2 text-gray-600 hover:text-black transition-colors relative" aria-label="Cart">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
                </svg>
                {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
              </button>
            </div>
          </div>
        </div>

        <MegaMenu open={megaOpen} onPageChange={onPageChange} />
      </div>

      {/* Mobile Drawer Nav */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-6 py-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 tracking-wider">CATEGORIES</p>
          {['Bottoms', 'Tops', 'Innerwear', 'Swimwear', 'Travel'].map(c => (
            <button key={c} onClick={() => { onPageChange('collection'); setMobileOpen(false) }} className="block w-full text-left text-sm font-medium py-1">
              {c}
            </button>
          ))}
          <button onClick={() => { onPageChange('admin'); setMobileOpen(false) }} className="block w-full text-left text-sm font-bold text-blue-600 py-1">
            ⚡ OPEN ADMIN PANEL
          </button>
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
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-wider">YOUR BAG ({cart.reduce((s, i) => s + i.qty, 0)})</h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-black">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Free Shipping Progress */}
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-600 mb-1.5">
              {subtotal >= freeShipThreshold
                ? '🎉 You unlocked FREE Shipping!'
                : `Add ₹${(freeShipThreshold - subtotal).toLocaleString()} more for FREE Shipping`}
            </p>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-black transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🛍</p>
                <p className="text-sm font-medium">Your bag is empty</p>
                <p className="text-xs mt-1">Explore our collections to start shopping</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={`${item.product.id}-${item.size}`} className="flex gap-4 pb-4 border-b border-gray-100">
                  <img src={img(item.product.imgId, 120, 160)} alt={item.product.name} className="w-20 h-24 object-cover bg-gray-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs leading-snug truncate">{item.product.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Size: {item.size} · Color: {item.color}</p>
                    <p className="font-bold text-xs mt-1">₹{(item.product.price * item.qty).toLocaleString()}</p>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-gray-200">
                        <button onClick={() => onQtyChange(item.product.id, item.size, Math.max(1, item.qty - 1))} className="px-2 py-0.5 text-xs text-gray-500 hover:text-black">−</button>
                        <span className="px-2 py-0.5 text-xs border-x border-gray-200 font-medium">{item.qty}</span>
                        <button onClick={() => onQtyChange(item.product.id, item.size, item.qty + 1)} className="px-2 py-0.5 text-xs text-gray-500 hover:text-black">+</button>
                      </div>
                      <button onClick={() => onRemove(item.product.id, item.size)} className="text-[11px] text-gray-400 hover:text-red-500">Remove</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-gray-100 space-y-3 bg-gray-50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-bold">₹{subtotal.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-gray-400">Taxes and shipping calculated at checkout</p>
              <button
                onClick={onCheckout}
                className="w-full bg-black text-white py-3.5 text-xs font-bold tracking-[0.2em] hover:bg-gray-900 transition-colors"
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

// ─── Razorpay Payment Gateway Modal ─────────────────────────────────────────
function RazorpayModal({
  open,
  onClose,
  amount,
  onSuccess
}: {
  open: boolean
  onClose: () => void
  amount: number
  onSuccess: (method: string) => Promise<void>
}) {
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking' | 'cod'>('upi')
  const [vpa, setVpa] = useState('arovia@upi')
  const [cardNumber, setCardNumber] = useState('4532 8910 2341 9901')
  const [cardExpiry, setCardExpiry] = useState('08/29')
  const [cardCvv, setCardCvv] = useState('892')
  const [selectedBank, setSelectedBank] = useState('HDFC')
  const [step, setStep] = useState<'select' | 'processing' | 'success'>('select')

  if (!open) return null

  const handlePay = async () => {
    setStep('processing')
    setTimeout(async () => {
      await onSuccess(method)
      setStep('success')
      setTimeout(() => {
        setStep('select')
        onClose()
      }, 1500)
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden border border-gray-100">
        {/* Razorpay Brand Header */}
        <div className="bg-[#0c2340] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-[#072654] text-blue-400 border border-blue-500/30 px-2 py-0.5 text-xs font-black rounded tracking-wider">RAZORPAY</span>
            <span className="text-xs font-medium text-blue-200">Secured Checkout</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Amount Summary */}
        <div className="bg-[#f2f4f8] px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <div>
            <p className="text-[10px] font-bold text-gray-500 tracking-wider">PAYING AROVIA FIT</p>
            <p className="text-xs text-gray-600">Order #ARV-{Math.floor(100000 + Math.random() * 900000)}</p>
          </div>
          <p className="text-xl font-black text-[#0c2340]">₹{amount.toLocaleString()}</p>
        </div>

        {/* Body Steps */}
        {step === 'select' && (
          <div className="p-6 space-y-5">
            <p className="text-xs font-bold text-gray-500 tracking-wider">SELECT PAYMENT METHOD</p>

            {/* Methods Tabs */}
            <div className="grid grid-cols-4 gap-2 border-b border-gray-200 pb-4">
              {[
                { id: 'upi', label: 'UPI' },
                { id: 'card', label: 'Cards' },
                { id: 'netbanking', label: 'Net Banking' },
                { id: 'cod', label: 'COD' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id as any)}
                  className={`py-2 text-xs font-bold rounded transition-colors ${method === m.id ? 'bg-[#0c2340] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Method Details */}
            {method === 'upi' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700">Instant UPI Payment</p>
                <div className="grid grid-cols-4 gap-2">
                  {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map(u => (
                    <button key={u} onClick={() => setVpa(`${u.toLowerCase()}@upi`)} className="border border-gray-200 py-2 text-xs font-medium hover:border-[#0c2340]">
                      {u}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">ENTER UPI ID / VPA</label>
                  <input
                    value={vpa}
                    onChange={e => setVpa(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-[#0c2340]"
                  />
                </div>
              </div>
            )}

            {method === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">CARD NUMBER</label>
                  <input
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-[#0c2340]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">EXPIRY (MM/YY)</label>
                    <input
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">CVV</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === 'netbanking' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700">Select Bank</p>
                <div className="grid grid-cols-3 gap-2">
                  {['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB'].map(b => (
                    <button
                      key={b}
                      onClick={() => setSelectedBank(b)}
                      className={`border py-2 text-xs font-bold transition-colors ${selectedBank === b ? 'border-[#0c2340] bg-[#0c2340] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {method === 'cod' && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded space-y-1">
                <p className="font-bold">💵 Cash on Delivery Selected</p>
                <p>Pay cash when your shipment arrives at your doorstep.</p>
              </div>
            )}

            <button
              onClick={handlePay}
              className="w-full bg-[#0c2340] text-white py-3.5 text-xs font-bold tracking-widest hover:bg-[#07192e] transition-colors shadow-lg"
            >
              PAY ₹{amount.toLocaleString()} NOW 🔒
            </button>

            <div className="text-center">
              <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                🔒 256-Bit Bank Level Encryption · Razorpay Realtime Verified
              </p>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#0c2340] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-bold text-sm text-[#0c2340]">Processing Realtime Payment...</p>
            <p className="text-xs text-gray-500">Contacting bank server & updating Supabase realtime channel...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto shadow-lg">
              ✓
            </div>
            <p className="font-black text-lg text-emerald-800">Payment Successful!</p>
            <p className="text-xs text-gray-600">Payment ID: <span className="font-mono font-bold">pay_{Math.random().toString(36).substring(2, 12)}</span></p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Order Invoice Receipt ───────────────────────────────────────────────────
function OrderInvoiceReceipt({
  orderId,
  paymentId,
  paymentMethod,
  cart,
  subtotal,
  discount,
  shipping,
  total,
  customerName,
  customerEmail,
  shippingAddress,
  onContinue
}: {
  orderId: string
  paymentId: string
  paymentMethod: string
  cart: CartItem[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  customerName: string
  customerEmail: string
  shippingAddress: string
  onContinue: () => void
}) {
  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="bg-white border border-gray-200 shadow-xl p-8 space-y-8" id="tax-invoice">
        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-6">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="bg-black text-white px-2 py-0.5 text-lg font-black tracking-wider">AROVIA</span>
              <span className="font-extrabold tracking-[0.2em] text-gray-900 text-lg">FIT</span>
            </div>
            <p className="text-xs text-gray-500">Arovia Fit Private Limited</p>
            <p className="text-xs text-gray-500">GSTIN: 27AAAAA0000A1Z5 · Support: support@aroviafit.com</p>
          </div>
          <div className="text-right">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded tracking-wider">REALTIME PAID</span>
            <p className="text-xs font-mono text-gray-500 mt-2">Invoice #: INV-{Math.floor(100000 + Math.random() * 900000)}</p>
            <p className="text-xs text-gray-400">{new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Transaction & Customer Details */}
        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 border border-gray-100 text-xs">
          <div>
            <p className="font-bold text-gray-400 text-[10px] tracking-wider mb-1">CUSTOMER & SHIPPING</p>
            <p className="font-bold text-gray-900">{customerName}</p>
            <p className="text-gray-600">{customerEmail}</p>
            <p className="text-gray-600 leading-snug mt-1">{shippingAddress}</p>
          </div>
          <div>
            <p className="font-bold text-gray-400 text-[10px] tracking-wider mb-1">PAYMENT & TRACKING</p>
            <p><span className="text-gray-500">Order ID:</span> <span className="font-mono font-bold text-gray-900">{orderId}</span></p>
            <p><span className="text-gray-500">Payment ID:</span> <span className="font-mono font-bold text-gray-900">{paymentId}</span></p>
            <p><span className="text-gray-500">Method:</span> <span className="font-bold uppercase text-gray-900">{paymentMethod}</span></p>
            <p><span className="text-gray-500">Tracking #:</span> <span className="font-mono text-blue-600 font-bold">TRK-{Math.floor(100000 + Math.random() * 900000)}</span></p>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold tracking-wider text-[10px]">
                <th className="py-2">ITEM DESCRIPTION</th>
                <th className="py-2">SIZE / COLOR</th>
                <th className="py-2 text-center">QTY</th>
                <th className="py-2 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cart.map((item, i) => (
                <tr key={i}>
                  <td className="py-3 font-semibold text-gray-900">{item.product.name}</td>
                  <td className="py-3 text-gray-500">{item.size} / {item.color}</td>
                  <td className="py-3 text-center text-gray-700">{item.qty}</td>
                  <td className="py-3 text-right font-bold">₹{(item.product.price * item.qty).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary */}
        <div className="border-t border-gray-200 pt-4 flex justify-end text-xs">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-gray-500"><span>Subtotal:</span><span>₹{subtotal.toLocaleString()}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-700"><span>Discount (AROVIA150):</span><span>−₹{discount.toLocaleString()}</span></div>}
            <div className="flex justify-between text-gray-500"><span>Shipping:</span><span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span></div>
            <div className="flex justify-between font-black text-sm border-t border-gray-200 pt-2 text-gray-900"><span>Total Paid:</span><span>₹{total.toLocaleString()}</span></div>
          </div>
        </div>

        {/* Invoice Footer Actions */}
        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <button onClick={() => window.print()} className="border border-black px-6 py-3 text-xs font-bold tracking-wider hover:bg-black hover:text-white transition-colors">
            🖨 PRINT TAX INVOICE
          </button>
          <button onClick={onContinue} className="flex-1 bg-black text-white px-6 py-3 text-xs font-bold tracking-wider hover:bg-gray-900 transition-colors">
            CONTINUE SHOPPING
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Realtime Admin Panel Component ──────────────────────────────────────────
function AdminPanel({
  products,
  orders,
  payments,
  activityLog,
  isConnected,
  onUpdateStatus,
  onSaveProduct,
  onBack
}: {
  products: Product[]
  orders: DBOrder[]
  payments: DBPayment[]
  activityLog: { id: string; text: string; time: string }[]
  isConnected?: boolean
  onUpdateStatus: (id: string, status: string) => void
  onSaveProduct: (p: Product) => void
  onBack: () => void
}) {
  const [tab, setTab] = useState<'orders' | 'inventory' | 'payments' | 'activity'>('orders')
  const [editingProd, setEditingProd] = useState<Product | null>(null)

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)
  const processingCount = orders.filter(o => o.status === 'Processing').length
  const shippedCount = orders.filter(o => o.status === 'Shipped').length

  const handleSaveProdSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProd) return
    onSaveProduct(editingProd)
    setEditingProd(null)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-6 mb-8 gap-4">
        <div>
          <button onClick={onBack} className="text-xs font-semibold text-gray-500 hover:text-black mb-2 flex items-center gap-1">
            ← BACK TO STORE
          </button>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            Arovia Fit Admin <span className="text-xs bg-blue-600 text-white font-bold px-2 py-0.5 rounded tracking-widest">REALTIME CONTROL</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-3 py-1 rounded font-bold ${isConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800'}`}>
            {isConnected ? '🟢 Supabase Realtime Active' : '🟡 Demo Mode (Local Sync)'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 p-5 shadow-xs">
          <p className="text-[10px] font-bold text-gray-400 tracking-wider">TOTAL REVENUE</p>
          <p className="text-2xl font-black mt-1">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-green-700 mt-1 font-medium">Realtime database synced</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 shadow-xs">
          <p className="text-[10px] font-bold text-gray-400 tracking-wider">TOTAL ORDERS</p>
          <p className="text-2xl font-black mt-1">{orders.length}</p>
          <p className="text-[10px] text-gray-500 mt-1">{processingCount} Processing · {shippedCount} Shipped</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 shadow-xs">
          <p className="text-[10px] font-bold text-gray-400 tracking-wider">ACTIVE PRODUCTS</p>
          <p className="text-2xl font-black mt-1">{products.length}</p>
          <p className="text-[10px] text-gray-500 mt-1">Inventory active in DB</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 shadow-xs">
          <p className="text-[10px] font-bold text-gray-400 tracking-wider">PAYMENTS CAPTURED</p>
          <p className="text-2xl font-black mt-1">{payments.length}</p>
          <p className="text-[10px] text-emerald-700 mt-1 font-medium">Razorpay Realtime Sync</p>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-8 overflow-x-auto">
        {[
          { id: 'orders', label: `Orders (${orders.length})` },
          { id: 'inventory', label: `Inventory (${products.length})` },
          { id: 'payments', label: `Payments (${payments.length})` },
          { id: 'activity', label: 'Realtime Activity Stream' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`py-3 px-5 text-xs font-bold tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold tracking-wider text-[10px]">
                <th className="p-4">ORDER ID & DATE</th>
                <th className="p-4">CUSTOMER</th>
                <th className="p-4">ITEMS</th>
                <th className="p-4">PAYMENT ID</th>
                <th className="p-4">TOTAL</th>
                <th className="p-4">STATUS ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">No orders in database yet. Place an order in the store to see it appear in real-time!</td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="p-4 font-mono">
                      <p className="font-bold text-gray-900">{o.id}</p>
                      <p className="text-[10px] text-gray-400">{o.created_at ? new Date(o.created_at).toLocaleString() : 'Just now'}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold">{o.customer_name}</p>
                      <p className="text-gray-500 text-[10px]">{o.customer_email}</p>
                    </td>
                    <td className="p-4 text-gray-600">
                      {o.items.map((it: any, i: number) => (
                        <p key={i}>{it.name} (x{it.qty})</p>
                      ))}
                    </td>
                    <td className="p-4">
                      <span className="font-mono bg-gray-100 px-2 py-1 text-[10px] rounded">{o.payment_id || 'pay_simulated'}</span>
                    </td>
                    <td className="p-4 font-bold text-gray-900">₹{o.total?.toLocaleString()}</td>
                    <td className="p-4">
                      <select
                        value={o.status || 'Processing'}
                        onChange={e => onUpdateStatus(o.id!, e.target.value)}
                        className="border border-gray-300 font-bold text-xs p-1.5 focus:outline-none focus:border-black"
                      >
                        <option value="Processing">Processing ⏳</option>
                        <option value="Shipped">Shipped 🚚</option>
                        <option value="Delivered">Delivered ✅</option>
                        <option value="Cancelled">Cancelled ❌</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm tracking-wider">PRODUCT CATALOG & STOCK MANAGER</h3>
            <button
              onClick={() => setEditingProd({ id: Date.now(), name: 'New Product', price: 999, mrp: 1999, rating: 4.8, reviews: 10, badge: 'NEW', imgId: 'photo-1600696491085-19dbbeb4f8c1', colors: ['#111'], category: 'Bottoms', stock: 100 })}
              className="bg-black text-white px-4 py-2 text-xs font-bold hover:bg-gray-800"
            >
              + ADD NEW PRODUCT
            </button>
          </div>

          {editingProd && (
            <form onSubmit={handleSaveProdSubmit} className="bg-white border border-gray-300 p-6 shadow-md space-y-4 max-w-2xl">
              <h4 className="font-black text-sm">EDIT PRODUCT #{editingProd.id}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Product Name</label>
                  <input value={editingProd.name} onChange={e => setEditingProd({ ...editingProd, name: e.target.value })} className="w-full border px-3 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                  <input value={editingProd.category} onChange={e => setEditingProd({ ...editingProd, category: e.target.value })} className="w-full border px-3 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Price (₹)</label>
                  <input type="number" value={editingProd.price} onChange={e => setEditingProd({ ...editingProd, price: Number(e.target.value) })} className="w-full border px-3 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">MRP (₹)</label>
                  <input type="number" value={editingProd.mrp} onChange={e => setEditingProd({ ...editingProd, mrp: Number(e.target.value) })} className="w-full border px-3 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Badge</label>
                  <input value={editingProd.badge} onChange={e => setEditingProd({ ...editingProd, badge: e.target.value })} className="w-full border px-3 py-1.5 text-xs" placeholder="BESTSELLER / NEW" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Stock Qty</label>
                  <input type="number" value={editingProd.stock ?? 100} onChange={e => setEditingProd({ ...editingProd, stock: Number(e.target.value) })} className="w-full border px-3 py-1.5 text-xs" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditingProd(null)} className="border px-4 py-2 text-xs font-bold">Cancel</button>
                <button type="submit" className="bg-black text-white px-6 py-2 text-xs font-bold">SAVE TO SUPABASE REALTIME</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 p-4 flex gap-4 items-center">
                <img src={img(p.imgId, 100, 133)} alt={p.name} className="w-16 h-20 object-cover bg-gray-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{p.category} · Badge: {p.badge || 'None'}</p>
                  <p className="font-black text-sm mt-1">₹{p.price.toLocaleString()} <span className="text-xs text-gray-400 line-through">₹{p.mrp.toLocaleString()}</span></p>
                  <p className="text-[10px] text-green-700 mt-0.5">Stock: {p.stock ?? 100} units</p>
                </div>
                <button onClick={() => setEditingProd(p)} className="border px-3 py-1.5 text-[10px] font-bold hover:bg-black hover:text-white">
                  EDIT
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {tab === 'payments' && (
        <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold tracking-wider text-[10px]">
                <th className="p-4">PAYMENT ID</th>
                <th className="p-4">METHOD</th>
                <th className="p-4">AMOUNT</th>
                <th className="p-4">STATUS</th>
                <th className="p-4">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">No payment logs yet. Real-time payments via Razorpay will be logged here automatically.</td>
                </tr>
              ) : (
                payments.map((pm, i) => (
                  <tr key={pm.id || i} className="hover:bg-gray-50">
                    <td className="p-4 font-mono font-bold text-gray-900">{pm.payment_id}</td>
                    <td className="p-4 uppercase font-bold text-gray-700">{pm.payment_method}</td>
                    <td className="p-4 font-bold text-gray-900">₹{pm.amount?.toLocaleString()}</td>
                    <td className="p-4"><span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">CAPTURED</span></td>
                    <td className="p-4 text-gray-400">{pm.created_at ? new Date(pm.created_at).toLocaleString() : 'Just now'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Log Tab */}
      {tab === 'activity' && (
        <div className="bg-gray-900 text-green-400 font-mono text-xs p-6 rounded shadow-inner space-y-2 max-h-[500px] overflow-y-auto">
          <p className="text-gray-500 border-b border-gray-800 pb-2">-- SUPABASE REALTIME WEBSOCKET EVENT STREAM --</p>
          {activityLog.length === 0 ? (
            <p className="text-gray-600">Listening for real-time WebSocket events...</p>
          ) : (
            activityLog.map(act => (
              <p key={act.id}>[{act.time}] &gt;&gt; {act.text}</p>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({
  products,
  reviews,
  onAdd,
  onView,
  onCollectionPage,
  onAddReview
}: {
  products: Product[]
  reviews: DBReview[]
  onAdd: (p: Product) => void
  onView: (p: Product) => void
  onCollectionPage: () => void
  onAddReview?: (productName: string, name: string, text: string, rating: number) => void
}) {
  const [activeTab, setActiveTab] = useState('Bestsellers')
  const [slide, setSlide] = useState(0)

  // Write a Review State
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [revName, setRevName] = useState('')
  const [revProd, setRevProd] = useState('Ultimate Leggings')
  const [revText, setRevText] = useState('')
  const [revRating, setRevRating] = useState(5)
  const [submittedMessage, setSubmittedMessage] = useState('')

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!revName.trim() || !revText.trim()) return
    if (onAddReview) {
      onAddReview(revProd, revName, revText, revRating)
    }
    setSubmittedMessage('🎉 Review submitted in real time!')
    setTimeout(() => {
      setSubmittedMessage('')
      setShowReviewForm(false)
      setRevName('')
      setRevText('')
    }, 2000)
  }

  const filtered = products.filter(p => {
    if (activeTab === 'Bestsellers') return p.badge === 'BESTSELLER'
    if (activeTab === 'New') return p.badge === 'NEW' || p.badge === 'NEW COLOURS'
    return p.category.toLowerCase() === activeTab.toLowerCase()
  })

  return (
    <div>
      {/* ── Hero Carousel ── */}
      <section className="relative aspect-[4/5] sm:aspect-[16/7] bg-gray-900 text-white overflow-hidden">
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <img src={img(s.imgId, 1600, 900)} alt={s.label} className="w-full h-full object-cover opacity-75" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-8 md:p-16 max-w-2xl">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] mb-3 text-white/80">{s.label}</p>
              <h1 className="text-3xl md:text-6xl font-black tracking-tight leading-tight whitespace-pre-line mb-4">{s.heading}</h1>
              <p className="text-xs md:text-sm text-white/80 mb-8 max-w-md leading-relaxed">{s.sub}</p>
              <button
                onClick={onCollectionPage}
                className="self-start bg-white text-black text-xs font-bold tracking-[0.2em] px-8 py-4 hover:bg-gray-100 transition-colors"
              >
                SHOP COLLECTION
              </button>
            </div>
          </div>
        ))}
        {/* Slide Dots */}
        <div className="absolute bottom-6 right-6 flex gap-2 z-10">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1 transition-all ${i === slide ? 'w-8 bg-white' : 'w-3 bg-white/40'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ── Category Highlights ── */}
      <section className="py-14 max-w-screen-xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'FLARE PANTS', sub: 'Iconic silhouettes', imgId: 'photo-1600696491085-19dbbeb4f8c1' },
            { label: 'STRAIGHT PANTS', sub: 'Studio to street', imgId: 'photo-1617372591382-4ecd2bf8bbc3' },
            { label: 'SPORTS BRAS', sub: 'High support & comfort', imgId: 'photo-1597586740347-a5a9d9a93e85' },
            { label: 'SWIMWEAR', sub: 'UPF 50+ protection', imgId: 'photo-1565118520546-8f6a088d6894' },
          ].map((cat, i) => (
            <div
              key={i}
              onClick={onCollectionPage}
              className="group relative aspect-[3/4] overflow-hidden bg-gray-100 cursor-pointer"
            >
              <img
                src={img(cat.imgId, 500, 667)}
                alt={cat.label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col justify-end p-4 text-white">
                <p className="text-[10px] tracking-[0.2em] font-bold opacity-75">{cat.sub}</p>
                <h3 className="text-base font-black tracking-wider mt-0.5">{cat.label}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Products Tab Section ── */}
      <section className="py-14 max-w-screen-xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-gray-400 mb-1">CURATED FOR YOU</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Explore Arovia Fit</h2>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-bold tracking-wider whitespace-nowrap pb-1 border-b-2 transition-colors ${
                  activeTab === tab ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {(filtered.length > 0 ? filtered : products).slice(0, 8).map(p => (
            <ProductCard key={p.id} p={p} onAdd={onAdd} onView={onView} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={onCollectionPage}
            className="border border-black text-black px-10 py-4 text-xs font-bold tracking-[0.2em] hover:bg-black hover:text-white transition-colors"
          >
            VIEW ALL PRODUCTS ({products.length})
          </button>
        </div>
      </section>

      {/* ── Editorial Banner ── */}
      <section className="bg-black py-24 px-6 text-center overflow-hidden relative">
        <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] md:text-[200px] font-black text-white/5 whitespace-nowrap leading-none select-none pointer-events-none">
          #KEEPMOVING
        </p>
        <div className="relative z-10">
          <p className="text-white/50 text-[10px] tracking-[0.4em] mb-6 font-bold">AROVIA FIT · MOVE. LIVE. REPEAT.</p>
          <h2 className="text-white text-4xl md:text-7xl font-black tracking-tight">LET'S #KEEPMOVING</h2>
          <p className="text-white/60 text-sm mt-6 max-w-md mx-auto">Join thousands of women who move, live, and repeat with Arovia Fit every single day.</p>
        </div>
      </section>

      {/* ── Brand Story ── */}
      <section className="py-16 max-w-screen-xl mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="aspect-[4/5] overflow-hidden bg-gray-100">
            <img src={img('photo-1664671423268-335f6cfdfe83', 800, 1000)} alt="Brand story" className="w-full h-full object-cover" />
          </div>
          <div className="max-w-md">
            <p className="text-[10px] font-bold tracking-[0.3em] text-gray-400 mb-5">OUR STORY</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-6">Designed for real life.</h2>
            <p className="text-gray-600 leading-relaxed text-sm mb-4">
              Arovia Fit was born from a simple idea: clothing should move with you, not against you. We believe that when you feel good in what you wear, you do more, move more, and live more fully.
            </p>
            <p className="text-gray-600 leading-relaxed text-sm mb-8">
              Every piece we design starts with real women, real routines, and real life. From morning workouts to coffee runs, boardroom meetings to weekend adventures — Arovia Fit is built for the full spectrum of you.
            </p>
            <button className="border border-black px-8 py-3.5 text-xs font-bold tracking-[0.2em] hover:bg-black hover:text-white transition-colors">
              OUR STORY
            </button>
          </div>
        </div>
      </section>

      {/* ── Reviews (Supabase Realtime Synced) ── */}
      <section className="py-14 bg-[#fafafa] overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-gray-400 font-bold mb-1">COMMUNITY LOVE</p>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Love From Our Community</h2>
            </div>
            <button
              onClick={() => setShowReviewForm(v => !v)}
              className="bg-black text-white px-5 py-2.5 text-xs font-bold tracking-wider hover:bg-gray-800 transition-colors"
            >
              {showReviewForm ? 'Close Form' : '+ Write a Review (Realtime)'}
            </button>
          </div>

          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="bg-white border border-gray-200 p-6 mb-8 max-w-xl mx-auto space-y-4 shadow-sm">
              <h3 className="font-bold text-sm tracking-wider text-gray-900">SUBMIT REALTIME REVIEW</h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  required
                  value={revName}
                  onChange={e => setRevName(e.target.value)}
                  placeholder="e.g. Ananya M."
                  className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={revProd}
                  onChange={e => setRevProd(e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-black"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rating</label>
                <select
                  value={revRating}
                  onChange={e => setRevRating(Number(e.target.value))}
                  className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-black"
                >
                  <option value={5}>5 Stars ★★★★★</option>
                  <option value={4}>4 Stars ★★★★☆</option>
                  <option value={3}>3 Stars ★★★☆☆</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Review</label>
                <textarea
                  required
                  rows={3}
                  value={revText}
                  onChange={e => setRevText(e.target.value)}
                  placeholder="Share your experience with fit, comfort, and fabric..."
                  className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-black"
                />
              </div>
              {submittedMessage && (
                <p className="text-xs text-green-700 font-bold">{submittedMessage}</p>
              )}
              <button type="submit" className="w-full bg-black text-white py-3 text-xs font-bold tracking-widest hover:bg-gray-800">
                POST REVIEW TO SUPABASE
              </button>
            </form>
          )}

          <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory">
            {reviews.map((r, i) => (
              <div key={r.id || i} className="shrink-0 w-72 md:w-80 border border-gray-200 bg-white p-6 snap-start">
                <Stars rating={r.rating} />
                <p className="text-sm text-gray-700 mt-3 mb-4 leading-relaxed">"{r.text}"</p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold">{r.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Verified Buyer · {r.product_name || 'Arovia Fit Product'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Instagram ── */}
      <section className="py-14 max-w-screen-xl mx-auto px-4 md:px-6">
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.3em] text-gray-400 font-bold mb-2">COMMUNITY</p>
          <h2 className="text-2xl font-black tracking-tight flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
            Follow @aroviafit
          </h2>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {INSTA_PHOTOS.map((id, i) => (
            <div key={i} className="aspect-square overflow-hidden bg-gray-100 cursor-pointer group">
              <img src={img(id, 400, 400)} alt={`@aroviafit post ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="py-16 border-t border-gray-100">
        <div className="max-w-lg mx-auto px-6 text-center">
          <p className="text-[10px] tracking-[0.3em] text-gray-400 font-bold mb-3">STAY IN THE LOOP</p>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">Get first dibs.</h2>
          <p className="text-sm text-gray-500 mb-8">Sign up for new launches, exclusive drops and offers.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 border border-gray-200 px-4 py-3.5 text-sm focus:outline-none focus:border-black transition-colors"
            />
            <button className="bg-black text-white px-6 py-3.5 text-[11px] font-bold tracking-[0.15em] hover:bg-gray-900 transition-colors shrink-0">
              SUBSCRIBE
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── PDP Page ─────────────────────────────────────────────────────────────────
function PDPPage({
  product,
  products,
  onAdd,
  onView,
  onBack,
  isWishlisted,
  onToggleWishlist
}: {
  product: Product
  products: Product[]
  onAdd: (p: Product, size?: string, color?: string) => void
  onView: (p: Product) => void
  onBack: () => void
  isWishlisted?: boolean
  onToggleWishlist?: (id: number) => void
}) {
  const [selectedSize, setSelectedSize] = useState('M')
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? '#111')
  const [activeImageId, setActiveImageId] = useState(product.imgId)
  const [pincode, setPincode] = useState('')
  const [deliveryMsg, setDeliveryMsg] = useState('')
  const [openAccordion, setOpenAccordion] = useState<'fabric' | 'fit' | 'shipping' | null>('fabric')

  useEffect(() => {
    window.scrollTo(0, 0)
    setActiveImageId(product.imgId)
  }, [product.id])

  const galleryImages = [
    product.imgId,
    'photo-1572251328767-e59f06f13ba1',
    'photo-1638265499174-62c2cb29137a',
    'photo-1662532577856-e8ee8b138a8b'
  ]

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4)
  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100)

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault()
    if (pincode.length >= 6) {
      setDeliveryMsg(`✓ Delivery available to ${pincode}! Standard Delivery by ${new Date(Date.now() + 3*24*60*60*1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}. Cash on Delivery available.`)
    } else {
      setDeliveryMsg('Please enter a valid 6-digit Pincode')
    }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-8 animate-in fade-in duration-300">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6 font-medium">
        <button onClick={onBack} className="hover:text-black transition-colors">Home</button>
        <span>/</span>
        <button onClick={onBack} className="hover:text-black transition-colors">{product.category}</button>
        <span>/</span>
        <span className="text-gray-900 font-semibold truncate max-w-[200px] sm:max-w-none">{product.name}</span>
      </div>

      <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Gallery Thumbnails + Main Image (7 cols) */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
          {/* Thumbnails list */}
          <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-visible shrink-0">
            {galleryImages.map((id, i) => (
              <button
                key={i}
                onClick={() => setActiveImageId(id)}
                className={`w-16 sm:w-20 aspect-[3/4] overflow-hidden border-2 transition-all shrink-0 ${
                  activeImageId === id ? 'border-black opacity-100 scale-105' : 'border-gray-200 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img(id, 200, 267)} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Main Featured Image */}
          <div className="flex-1 aspect-[3/4] bg-gray-100 overflow-hidden relative shadow-sm group">
            <img src={img(activeImageId, 900, 1200)} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <Badge text={product.badge} />
          </div>
        </div>

        {/* Product Details Sidebar (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold tracking-[0.25em] text-gray-400 uppercase">{product.category}</span>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1 mb-2 leading-tight">{product.name}</h1>
              </div>
              <button
                onClick={() => onToggleWishlist && onToggleWishlist(product.id)}
                className="w-10 h-10 border border-gray-200 flex items-center justify-center rounded-full hover:border-black transition-colors shrink-0"
              >
                <span className={`text-xl ${isWishlisted ? 'text-red-500' : 'text-gray-300'}`}>
                  {isWishlisted ? '♥' : '♡'}
                </span>
              </button>
            </div>

            {/* Ratings & Reviews */}
            <div className="flex items-center gap-2 mb-5">
              <Stars rating={product.rating} />
              <span className="text-xs text-gray-600 font-medium">{product.rating} · ({product.reviews.toLocaleString()} verified reviews)</span>
            </div>

            {/* Pricing */}
            <div className="bg-gray-50 border border-gray-200 p-4 mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black">₹{product.price.toLocaleString()}</span>
                <span className="text-base text-gray-400 line-through">₹{product.mrp.toLocaleString()}</span>
                <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">{discount}% OFF</span>
              </div>
              <p className="text-xs text-green-700 font-bold mt-1.5">
                ⚡ Special Offer: Best Price ₹{Math.round(product.price * 0.92).toLocaleString()} using coupon <span className="underline">AROVIA150</span>
              </p>
            </div>

            {/* Color Variant Picker */}
            <div className="mb-6">
              <p className="text-xs font-bold tracking-wider mb-3">COLOR: <span className="text-gray-500 font-normal uppercase">{selectedColor}</span></p>
              <div className="flex gap-3">
                {product.colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${selectedColor === c ? 'border-black scale-110 shadow-sm' : 'border-gray-200 hover:border-gray-400'}`}
                    style={{ background: c }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Size Picker */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-bold tracking-wider">SELECT SIZE</p>
                <button className="text-xs text-gray-500 underline hover:text-black">Size Guide</button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`py-3 text-xs font-bold border transition-all ${selectedSize === s ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 hover:border-black text-gray-800'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to Cart CTA */}
            <div className="space-y-3 mb-8">
              <button
                onClick={() => onAdd(product, selectedSize, selectedColor)}
                className="w-full bg-black text-white py-4 text-xs font-bold tracking-[0.2em] hover:bg-gray-900 transition-colors shadow-lg"
              >
                ADD TO BAG
              </button>
              <p className="text-[10px] text-center text-gray-400">⚡ In Stock · Free Shipping on orders above ₹999 · 7 Days Easy Returns</p>
            </div>

            {/* Delivery Pincode Checker */}
            <div className="border border-gray-200 p-4 mb-8 bg-white">
              <p className="text-xs font-bold tracking-wider mb-2">CHECK DELIVERY & COD AVAILABILITY</p>
              <form onSubmit={handlePincodeCheck} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  placeholder="Enter 6-digit Pincode (e.g. 400050)"
                  className="flex-1 border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-black"
                />
                <button type="submit" className="border border-black px-4 py-2 text-xs font-bold hover:bg-black hover:text-white transition-colors">
                  CHECK
                </button>
              </form>
              {deliveryMsg && (
                <p className={`text-xs mt-2 font-medium ${deliveryMsg.startsWith('✓') ? 'text-green-700' : 'text-red-500'}`}>
                  {deliveryMsg}
                </p>
              )}
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-3 gap-2 py-4 border-y border-gray-100 text-center text-[10px] font-bold text-gray-600">
              <div className="p-2 bg-gray-50 rounded">✨ 4-Way Stretch</div>
              <div className="p-2 bg-gray-50 rounded">🏋️ Squat Proof</div>
              <div className="p-2 bg-gray-50 rounded">💧 Quick Dry</div>
            </div>

            {/* Specifications Accordions */}
            <div className="divide-y divide-gray-200 border-b border-gray-200 pt-4">
              <div className="py-3">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'fabric' ? null : 'fabric')}
                  className="w-full flex justify-between items-center text-xs font-bold tracking-wider text-left"
                >
                  <span>FABRIC & DESCRIPTION</span>
                  <span>{openAccordion === 'fabric' ? '−' : '+'}</span>
                </button>
                {openAccordion === 'fabric' && (
                  <div className="mt-3 text-xs text-gray-600 space-y-2 leading-relaxed animate-in fade-in duration-200">
                    <p>{product.description}</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-500 pt-1">
                      <li>80% Premium Nylon, 20% Elastane</li>
                      <li>Ultra-soft buttery hand-feel</li>
                      <li>Moisture-wicking, breathable construction</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="py-3">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'fit' ? null : 'fit')}
                  className="w-full flex justify-between items-center text-xs font-bold tracking-wider text-left"
                >
                  <span>FIT & SIZING GUIDE</span>
                  <span>{openAccordion === 'fit' ? '−' : '+'}</span>
                </button>
                {openAccordion === 'fit' && (
                  <div className="mt-3 text-xs text-gray-600 space-y-1 animate-in fade-in duration-200">
                    <p>Model is 5'8" wearing size <strong>M</strong>.</p>
                    <p>Designed for a snug, second-skin fit. If between sizes, size up for a more relaxed feel.</p>
                  </div>
                )}
              </div>

              <div className="py-3">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'shipping' ? null : 'shipping')}
                  className="w-full flex justify-between items-center text-xs font-bold tracking-wider text-left"
                >
                  <span>FREE SHIPPING & RETURNS</span>
                  <span>{openAccordion === 'shipping' ? '−' : '+'}</span>
                </button>
                {openAccordion === 'shipping' && (
                  <div className="mt-3 text-xs text-gray-600 space-y-1 animate-in fade-in duration-200">
                    <p>Free standard delivery on orders over ₹999.</p>
                    <p>Hassle-free 7-day exchange and returns available across India.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20 pt-12 border-t border-gray-100">
          <h2 className="text-xl font-black tracking-tight mb-8">You Might Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map(p => (
              <ProductCard key={p.id} p={p} onAdd={p => onAdd(p)} onView={onView} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Collection Page ─────────────────────────────────────────────────────────
function CollectionPage({
  products,
  onAdd,
  onView,
  wishlistIds,
  onToggleWishlist
}: {
  products: Product[]
  onAdd: (p: Product) => void
  onView: (p: Product) => void
  wishlistIds?: number[]
  onToggleWishlist?: (id: number) => void
}) {
  const [selectedCat, setSelectedCat] = useState('ALL')
  const [sort, setSort] = useState('featured')

  const categories = ['ALL', 'Bottoms', 'Innerwear', 'Tops', 'Swimwear', 'Travel']

  let list = selectedCat === 'ALL' ? [...products] : products.filter(p => p.category.toLowerCase() === selectedCat.toLowerCase())

  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight mb-2">All Activewear & Essentials</h1>
        <p className="text-xs text-gray-500">Designed for performance, movement, and everyday comfort.</p>
      </div>

      <div className="flex items-center justify-between border-y border-gray-100 py-4 mb-8 gap-4 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCat(c)}
              className={`text-xs font-bold tracking-wider px-4 py-2 border transition-colors whitespace-nowrap ${
                selectedCat === c ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-600 hover:border-black'
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {list.map(p => (
          <ProductCard
            key={p.id}
            p={p}
            onAdd={onAdd}
            onView={onView}
            isWishlisted={wishlistIds?.includes(p.id)}
            onToggleWishlist={onToggleWishlist}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Cart Page (Razorpay Payment Flow) ──────────────────────────────────────
function CartPage({
  cart,
  onRemove,
  onQtyChange,
  onPlaceOrder,
  onProcessPayment
}: {
  cart: CartItem[]
  onRemove: (id: number, size: string) => void
  onQtyChange: (id: number, size: string, qty: number) => void
  onPlaceOrder: (cart: CartItem[], subtotal: number, discount: number, shipping: number, total: number, name: string, email: string, address: string) => Promise<string>
  onProcessPayment: (orderId: string, method: string, amount: number) => Promise<string>
}) {
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const shipping = subtotal > 999 ? 0 : 99
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [custName, setCustName] = useState('Ananya Sharma')
  const [custEmail, setCustEmail] = useState('ananya@example.com')
  const [custAddress, setCustAddress] = useState('Flat 402, Sunshine Heights, Bandra West, Mumbai 400050')

  const [razorpayOpen, setRazorpayOpen] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState<string>('')
  const [confirmedPaymentId, setConfirmedPaymentId] = useState<string>('')
  const [paymentMethodUsed, setPaymentMethodUsed] = useState<string>('upi')
  const [orderComplete, setOrderComplete] = useState(false)

  const discount = couponApplied ? Math.round(subtotal * 0.08) : 0
  const total = subtotal - discount + shipping

  const handleStartCheckout = async () => {
    if (cart.length === 0) return
    const orderId = await onPlaceOrder(cart, subtotal, discount, shipping, total, custName, custEmail, custAddress)
    setPendingOrderId(orderId)
    setRazorpayOpen(true)
  }

  const handlePaymentSuccess = async (method: string) => {
    setPaymentMethodUsed(method)
    const payId = await onProcessPayment(pendingOrderId, method, total)
    setConfirmedPaymentId(payId)
    setOrderComplete(true)
  }

  if (orderComplete) {
    return (
      <OrderInvoiceReceipt
        orderId={pendingOrderId}
        paymentId={confirmedPaymentId}
        paymentMethod={paymentMethodUsed}
        cart={cart}
        subtotal={subtotal}
        discount={discount}
        shipping={shipping}
        total={total}
        customerName={custName}
        customerEmail={custEmail}
        shippingAddress={custAddress}
        onContinue={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-10">
      <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-8">Your Bag ({cart.reduce((s, i) => s + i.qty, 0)} items)</h1>
      {cart.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-6xl mb-4">🛍</p>
          <p className="text-lg font-medium mb-2">Your bag is empty</p>
          <p className="text-sm mb-8">Looks like you haven't added anything yet.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details Input */}
            <div className="bg-gray-50 border border-gray-200 p-6 space-y-4">
              <h3 className="font-bold text-xs tracking-wider text-gray-900">SHIPPING & CONTACT DETAILS</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">FULL NAME</label>
                  <input value={custName} onChange={e => setCustName(e.target.value)} className="w-full border border-gray-300 px-3 py-2 text-xs bg-white focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">EMAIL ADDRESS</label>
                  <input value={custEmail} onChange={e => setCustEmail(e.target.value)} className="w-full border border-gray-300 px-3 py-2 text-xs bg-white focus:outline-none focus:border-black" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">SHIPPING ADDRESS</label>
                <input value={custAddress} onChange={e => setCustAddress(e.target.value)} className="w-full border border-gray-300 px-3 py-2 text-xs bg-white focus:outline-none focus:border-black" />
              </div>
            </div>

            {/* Items List */}
            {cart.map(item => (
              <div key={`${item.product.id}-${item.size}`} className="flex gap-5 pb-6 border-b border-gray-100">
                <img src={img(item.product.imgId, 160, 213)} alt={item.product.name} className="w-24 md:w-32 h-32 md:h-40 object-cover bg-gray-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{item.product.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Size: {item.size} · Color: {item.color}</p>
                    </div>
                    <p className="font-bold text-sm shrink-0">₹{(item.product.price * item.qty).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center border border-gray-200">
                      <button onClick={() => onQtyChange(item.product.id, item.size, Math.max(1, item.qty - 1))} className="px-3 py-2 text-gray-500 hover:text-black transition-colors">−</button>
                      <span className="px-3 py-2 text-sm border-x border-gray-200">{item.qty}</span>
                      <button onClick={() => onQtyChange(item.product.id, item.size, item.qty + 1)} className="px-3 py-2 text-gray-500 hover:text-black transition-colors">+</button>
                    </div>
                    <button onClick={() => onRemove(item.product.id, item.size)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="border border-gray-200 p-6 sticky top-40 bg-white">
              <h3 className="font-bold text-sm tracking-wider mb-6">ORDER SUMMARY</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Coupon (AROVIA150)</span>
                    <span>−₹{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className={`font-medium ${shipping === 0 ? 'text-green-700' : ''}`}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
                  <span>Total Payable</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-2 mb-5">
                <input
                  value={coupon}
                  onChange={e => setCoupon(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="flex-1 border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:border-black transition-colors"
                />
                <button
                  onClick={() => { if (coupon === 'AROVIA150' || coupon === 'AROVIAFIT150' || coupon === 'VYORA150') setCouponApplied(true) }}
                  className="bg-black text-white px-4 py-2.5 text-xs font-bold hover:bg-gray-900 transition-colors"
                >
                  APPLY
                </button>
              </div>
              {couponApplied && <p className="text-xs text-green-700 font-medium mb-4">✓ Coupon applied! You save ₹{discount.toLocaleString()}</p>}
              
              <button
                onClick={handleStartCheckout}
                className="w-full bg-[#0c2340] text-white py-4 text-xs font-bold tracking-[0.2em] hover:bg-[#07182c] transition-colors shadow-md flex items-center justify-center gap-2"
              >
                PROCEED TO PAY ₹{total.toLocaleString()} 🔒
              </button>
              
              <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-400">Powered by Razorpay Realtime · Instant Receipt</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Popup Modal */}
      <RazorpayModal
        open={razorpayOpen}
        onClose={() => setRazorpayOpen(false)}
        amount={total}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ onPageChange }: { onPageChange: (p: Page) => void }) {
  return (
    <footer className="bg-black text-white pt-16 pb-8">
      <div className="max-w-screen-xl mx-auto px-6">
        <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-14 text-white/90">LET'S #KEEPMOVING</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14 border-t border-white/10 pt-12">
          {[
            { title: 'ABOUT', links: ['Our Story', 'Stores Near You', 'Terms of Service', 'Privacy Policy', 'Careers'] },
            { title: 'HELP', links: ['Order Tracking', 'Return / Exchange', 'Returns & Refunds', 'Shipping Policy', 'FAQ', 'Contact Us'] },
            { title: 'SHOP', links: ['Shop All', 'Bestsellers', 'New Launches', 'Bottoms', 'Tops', 'Innerwear', 'Swimwear'] },
            { title: 'ADMIN & SYSTEM', links: ['Open Admin Panel ⚡', 'VYORA Fashion Private Limited', 'support@aroviafit.com', '+91 98765 43210'] },
          ].map(col => (
            <div key={col.title}>
              <p className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-4">{col.title}</p>
              {col.links.map(l => (
                <p
                  key={l}
                  onClick={() => l.includes('Admin') ? onPageChange('admin') : onPageChange('collection')}
                  className={`text-sm py-1 cursor-pointer transition-colors ${l.includes('Admin') ? 'text-blue-400 font-bold hover:text-blue-300' : 'text-white/70 hover:text-white'}`}
                >
                  {l}
                </p>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/40">© 2026 Arovia Fit. All Rights Reserved. Realtime Supabase Backend Active.</p>
          <div className="flex gap-4">
            {['Instagram', 'Facebook', 'YouTube', 'WhatsApp', 'X'].map(s => (
              <button key={s} className="text-xs text-white/40 hover:text-white transition-colors">{s}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── App Main Component ──────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Dynamic SEO Title & Meta Manager
  useEffect(() => {
    if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
      setPage('admin')
    }
    if (page === 'home') {
      document.title = 'Arovia Fit | Premium Women Activewear, Flare Pants & Athleisure'
    } else if (page === 'collection') {
      document.title = 'Shop All Activewear & Essentials | Arovia Fit'
    } else if (page === 'pdp' && selectedProduct) {
      document.title = `${selectedProduct.name} - ₹${selectedProduct.price.toLocaleString()} | Arovia Fit`
    } else if (page === 'cart') {
      document.title = 'Shopping Bag & Checkout | Arovia Fit'
    } else if (page === 'admin') {
      document.title = 'Realtime Admin Control Dashboard | Arovia Fit'
    }
  }, [page, selectedProduct])

  // Realtime Supabase Backend Integration Hook
  const {
    products: dbProducts,
    reviews: dbReviews,
    cartItems: dbCartItems,
    wishlistIds,
    orders: dbOrders,
    payments: dbPayments,
    activityLog,
    isConnected,
    isConfigured,
    lastRealtimeEvent,
    addReview,
    syncCartItem,
    clearCart,
    toggleWishlist,
    placeOrder,
    processRazorpayPayment,
    updateOrderStatus,
    saveProduct,
    deleteProduct,
    bulkSaveProducts
  } = useRealtimeBackend(ALL_PRODUCTS, REVIEWS)

  // Format products list
  const productsList: Product[] = dbProducts.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    mrp: p.mrp,
    rating: p.rating,
    reviews: p.reviews,
    badge: p.badge,
    imgId: p.imgId,
    images: p.images,
    colors: p.colors,
    category: p.category,
    description: p.description,
    stock: p.stock
  }))

  // Formatted local cart fallback & DB synced cart
  const [localCart, setLocalCart] = useState<CartItem[]>([])
  const [localWishlistIds, setLocalWishlistIds] = useState<number[]>([1, 5])

  const activeWishlistIds = wishlistIds.length > 0 ? wishlistIds : localWishlistIds

  const cart: CartItem[] = dbCartItems.length > 0
    ? dbCartItems.map(item => {
        const prod = productsList.find(p => p.id === item.productId) || ALL_PRODUCTS[0]
        return { product: prod, size: item.size, color: item.color, qty: item.qty }
      })
    : localCart

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const wishlistCount = activeWishlistIds.length

  function addToCart(p: Product, size = 'M', color = p.colors[0] || '#111') {
    if (isConfigured) {
      const existing = cart.find(i => i.product.id === p.id && i.size === size)
      const newQty = existing ? existing.qty + 1 : 1
      syncCartItem(p.id, size, color, newQty)
    } else {
      setLocalCart(prev => {
        const existing = prev.find(i => i.product.id === p.id && i.size === size)
        if (existing) return prev.map(i => i.product.id === p.id && i.size === size ? { ...i, qty: i.qty + 1 } : i)
        return [...prev, { product: p, size, color, qty: 1 }]
      })
    }
    setCartOpen(true)
  }

  function removeFromCart(id: number, size: string) {
    if (isConfigured) {
      const item = cart.find(i => i.product.id === id && i.size === size)
      if (item) syncCartItem(id, size, item.color, 0)
    } else {
      setLocalCart(prev => prev.filter(i => !(i.product.id === id && i.size === size)))
    }
  }

  function updateQty(id: number, size: string, qty: number) {
    if (isConfigured) {
      const item = cart.find(i => i.product.id === id && i.size === size)
      if (item) syncCartItem(id, size, item.color, qty)
    } else {
      setLocalCart(prev => prev.map(i => i.product.id === id && i.size === size ? { ...i, qty } : i))
    }
  }

  function handleToggleWishlist(id: number) {
    if (isConfigured) {
      const isWish = wishlistIds.includes(id)
      toggleWishlist(id, !isWish)
    }
    setLocalWishlistIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  function viewProduct(p: Product) {
    setSelectedProduct(p)
    setPage('pdp')
    window.scrollTo(0, 0)
  }

  function navigateTo(p: Page) {
    setPage(p)
    if (p === 'admin') {
      window.history.pushState(null, '', '/admin')
    } else if (p === 'home') {
      window.history.pushState(null, '', '/')
    }
    window.scrollTo(0, 0)
  }

  const handlePlaceOrder = async (
    orderItems: CartItem[],
    subtotal: number,
    discount: number,
    shipping: number,
    total: number,
    customerName: string,
    customerEmail: string,
    shippingAddress: string
  ) => {
    const itemsFormatted = orderItems.map(i => ({
      product_id: i.product.id,
      name: i.product.name,
      size: i.size,
      color: i.color,
      qty: i.qty,
      price: i.product.price
    }))
    const orderId = await placeOrder(itemsFormatted, subtotal, discount, shipping, total, customerName, customerEmail, shippingAddress)
    if (!isConfigured) {
      setLocalCart([])
    }
    return orderId
  }

  const navOffset = 'pt-[100px] md:pt-[92px]'

  return (
    <div className="min-h-screen bg-white text-black">
      <Navigation
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        onCartOpen={() => setCartOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
        onPageChange={navigateTo}
        isConnected={isConnected}
        isConfigured={isConfigured}
        lastRealtimeEvent={lastRealtimeEvent}
      />

      <main className={navOffset}>
        {page === 'home' && (
          <>
            <HomePage
              products={productsList}
              reviews={dbReviews}
              onAdd={addToCart}
              onView={viewProduct}
              onCollectionPage={() => navigateTo('collection')}
              onAddReview={addReview}
            />
            <Footer onPageChange={navigateTo} />
          </>
        )}
        {page === 'pdp' && selectedProduct && (
          <>
            <PDPPage
              product={selectedProduct}
              products={productsList}
              onAdd={addToCart}
              onView={viewProduct}
              onBack={() => navigateTo('home')}
              isWishlisted={activeWishlistIds.includes(selectedProduct.id)}
              onToggleWishlist={handleToggleWishlist}
            />
            <Footer onPageChange={navigateTo} />
          </>
        )}
        {page === 'collection' && (
          <>
            <CollectionPage
              products={productsList}
              onAdd={addToCart}
              onView={viewProduct}
              wishlistIds={activeWishlistIds}
              onToggleWishlist={handleToggleWishlist}
            />
            <div className="h-16 md:h-0" />
            <Footer onPageChange={navigateTo} />
          </>
        )}
        {page === 'cart' && (
          <>
            <CartPage
              cart={cart}
              onRemove={removeFromCart}
              onQtyChange={updateQty}
              onPlaceOrder={handlePlaceOrder}
              onProcessPayment={processRazorpayPayment}
            />
            <Footer onPageChange={navigateTo} />
          </>
        )}
        {page === 'admin' && (
          <>
            <AdminPanel
              products={productsList}
              orders={dbOrders}
              payments={dbPayments}
              activityLog={activityLog}
              isConnected={isConnected}
              onUpdateStatus={updateOrderStatus}
              onSaveProduct={saveProduct}
              onDeleteProduct={deleteProduct}
              onBulkSaveProducts={bulkSaveProducts}
              onBack={() => navigateTo('home')}
            />
            <Footer onPageChange={navigateTo} />
          </>
        )}
      </main>

      <CartDrawer
        cart={cart}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        onQtyChange={updateQty}
        onCheckout={() => { setCartOpen(false); navigateTo('cart') }}
      />

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={productsList}
        onView={viewProduct}
      />
    </div>
  )
}
