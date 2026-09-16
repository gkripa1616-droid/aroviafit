import { useState, useEffect, useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────
type Page = 'home' | 'pdp' | 'collection' | 'cart'

interface Product {
  id: number
  name: string
  price: number
  mrp: number
  rating: number
  reviews: number
  badge: string
  imgId: string
  colors: string[]
  category: string
  description?: string
}

interface CartItem {
  product: Product
  size: string
  color: string
  qty: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const img = (id: string, w = 600, h = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format`

// ─── Data ────────────────────────────────────────────────────────────────────
const ALL_PRODUCTS: Product[] = [
  { id: 1, name: 'Ultimate Flare Pants', price: 999, mrp: 1999, rating: 4.8, reviews: 608, badge: 'BESTSELLER', imgId: 'photo-1600696491085-19dbbeb4f8c1', colors: ['#111', '#6b7280', '#7c3aed'], category: 'Bottoms', description: 'Our best-selling flare pants crafted from ultra-soft 4-way stretch fabric. Flattering high-rise waist, wide leg opening, and moisture-wicking finish.' },
  { id: 2, name: 'Ultimate Straight Pants', price: 999, mrp: 1999, rating: 4.8, reviews: 842, badge: 'BESTSELLER', imgId: 'photo-1617372591382-4ecd2bf8bbc3', colors: ['#111', '#9ca3af', '#b45309'], category: 'Bottoms', description: 'Effortlessly versatile straight-leg pants that transition from the studio to the streets. Buttery smooth fabric with 4-way stretch.' },
  { id: 3, name: 'Work-To-Wine Wide Dart Pants', price: 1699, mrp: 1899, rating: 4.8, reviews: 312, badge: 'NEW', imgId: 'photo-1597586309225-a5db6dd03b3c', colors: ['#111', '#d97706'], category: 'Bottoms', description: 'Designed for the woman who does it all. Wide-leg silhouette with dart detailing for a structured yet comfortable fit.' },
  { id: 4, name: 'Cloud Korean Pants', price: 1999, mrp: 2499, rating: 4.8, reviews: 203, badge: 'NEW', imgId: 'photo-1597586309204-ab40c927296d', colors: ['#111', '#6b7280', '#0ea5e9'], category: 'Bottoms', description: 'Inspired by Korean street style. Relaxed silhouette, ultra-light fabric, elastic waist with drawstring for the perfect fit every time.' },
  { id: 5, name: 'Ultimate Leggings', price: 1199, mrp: 2299, rating: 4.9, reviews: 1205, badge: 'BESTSELLER', imgId: 'photo-1565118520546-8f6a088d6894', colors: ['#111', '#374151', '#7c3aed', '#0ea5e9'], category: 'Bottoms', description: 'The legging that started it all. Squat-proof, non-see-through, buttery soft fabric that moves with you all day.' },
  { id: 6, name: 'Power Up Sports Bra', price: 799, mrp: 1299, rating: 4.7, reviews: 445, badge: 'RESTOCKED', imgId: 'photo-1597586740347-a5a9d9a93e85', colors: ['#c53030', '#111', '#6b7280'], category: 'Innerwear', description: 'Medium-to-high support sports bra with removable cups, cross-back design, and wide underband for all-day comfort.' },
  { id: 7, name: 'Built-In Bra Crop Top', price: 899, mrp: 1499, rating: 4.8, reviews: 367, badge: 'NEW', imgId: 'photo-1579473755852-abe535c52ff0', colors: ['#f5f5f4', '#111'], category: 'Tops', description: 'Two-in-one crop top with built-in shelf bra. Light support, relaxed fit, and breathable fabric perfect for low-intensity workouts.' },
  { id: 8, name: 'V-Neck Racerback Top', price: 699, mrp: 1199, rating: 4.7, reviews: 289, badge: 'NEW COLOURS', imgId: 'photo-1552196527-90dc99d938bc', colors: ['#111', '#b45309', '#0ea5e9', '#7c3aed'], category: 'Tops', description: 'Classic racerback design with V-neckline. Quick-dry, odor-resistant, and available in an expanded colour palette.' },
  { id: 9, name: 'AirMelt Flare Pants', price: 1599, mrp: 2199, rating: 4.9, reviews: 534, badge: 'BESTSELLER', imgId: 'photo-1597586740716-27ca9e73029a', colors: ['#111', '#3b82f6'], category: 'Travel', description: 'Lightweight, packable flare pants perfect for travel. Wrinkle-resistant, quick-dry, and surprisingly comfortable on long flights.' },
  { id: 10, name: 'BareButter Straight Pants', price: 1799, mrp: 2499, rating: 4.8, reviews: 412, badge: 'NEW', imgId: 'photo-1597460927195-a6c823cc0d0e', colors: ['#111', '#3b82f6', '#6b7280'], category: 'Travel', description: 'Butter-soft straight pants designed for the modern traveller. Adjustable waistband and hidden pockets for your essentials.' },
  { id: 11, name: 'Absolute Invisible Bra', price: 699, mrp: 1199, rating: 4.9, reviews: 892, badge: 'BESTSELLER', imgId: 'photo-1579473755852-abe535c52ff0', colors: ['#f5f5f4', '#111', '#fcd34d'], category: 'Innerwear', description: 'Seamless, invisible bra with no-show construction under any outfit. Gentle support with full coverage moulded cups.' },
  { id: 12, name: 'Ultimate Comfort Sports Bra', price: 799, mrp: 1399, rating: 4.8, reviews: 623, badge: 'BESTSELLER', imgId: 'photo-1597586309225-a5db6dd03b3c', colors: ['#111', '#c53030', '#0ea5e9'], category: 'Innerwear', description: 'Our most popular sports bra. Light to medium support, padded cups, and wide straps that won\'t dig in.' },
  { id: 13, name: 'Cloud Baby Tee', price: 599, mrp: 999, rating: 4.6, reviews: 156, badge: 'NEW', imgId: 'photo-1597586740347-a5a9d9a93e85', colors: ['#f5f5f4', '#fcd34d', '#c53030'], category: 'Tops', description: 'Relaxed baby tee cut from cloud-soft jersey. Cropped silhouette, raw hem, and effortless fit for everyday wear.' },
  { id: 14, name: 'Swim Dress Racerback', price: 1999, mrp: 2799, rating: 4.8, reviews: 178, badge: 'NEW', imgId: 'photo-1617372591382-4ecd2bf8bbc3', colors: ['#111', '#0ea5e9', '#7c3aed'], category: 'Swimwear', description: 'Flattering racerback swim dress with built-in UPF 50+ protection. Chlorine-resistant fabric for long-lasting colour.' },
  { id: 15, name: 'One-Piece Swimsuit', price: 2199, mrp: 2999, rating: 4.7, reviews: 89, badge: 'NEW', imgId: 'photo-1597586309204-ab40c927296d', colors: ['#111', '#c53030'], category: 'Swimwear', description: 'Sculpting one-piece with tummy control panel, adjustable straps, and a sophisticated minimalist design.' },
  { id: 16, name: 'Full Sleeve Swim Dress', price: 2499, mrp: 3299, rating: 4.9, reviews: 67, badge: 'NEW', imgId: 'photo-1565118520546-8f6a088d6894', colors: ['#111', '#6b7280'], category: 'Swimwear', description: 'Elegant full-sleeve swim dress with UPF 50+ protection. Perfect for conservative swimmers and beach walks alike.' },
  { id: 17, name: 'BareButter Pullover', price: 1299, mrp: 1999, rating: 4.8, reviews: 234, badge: 'NEW', imgId: 'photo-1552196527-90dc99d938bc', colors: ['#f5f5f4', '#111', '#d97706'], category: 'Travel', description: 'Ultra-soft pullover perfect for layering on travels. Lightweight, packable, and wrinkle-free for the modern nomad.' },
  { id: 18, name: 'RibSupreme Flare Pants', price: 1499, mrp: 2199, rating: 4.7, reviews: 189, badge: 'RESTOCKED', imgId: 'photo-1600696491085-19dbbeb4f8c1', colors: ['#111', '#6b7280', '#7c3aed'], category: 'Travel', description: 'Ribbed flare pants with a premium hand-feel. 4-way stretch, high-waist, and side pockets for practicality.' },
]

const HERO_SLIDES = [
  { imgId: 'photo-1572251328767-e59f06f13ba1', label: 'VYORA MOVE', heading: 'Move Without\nLimits', sub: 'Performance wear designed for everyday movement.' },
  { imgId: 'photo-1662532577856-e8ee8b138a8b', label: 'EVERYDAY. ELEVATED.', heading: "Looks Like Style.\nFeels Like Freedom.", sub: 'From morning workouts to coffee runs.' },
  { imgId: 'photo-1638265499174-62c2cb29137a', label: 'NEW SEASON', heading: 'New Season.\nNew Energy.', sub: 'Discover the latest collection.' },
]

const REVIEWS = [
  { name: 'Priya S.', text: 'Absolutely love the fit and comfort. These leggings are worth every rupee! Have ordered 3 pairs already.', rating: 5, product: 'Ultimate Leggings' },
  { name: 'Ananya M.', text: 'The quality is outstanding. I wear these to the gym and for everyday errands. Perfect versatility.', rating: 5, product: 'AirMelt Flare Pants' },
  { name: 'Rhea K.', text: 'Best sports bra I have ever owned. No bounce, great support, ultra soft. Highly recommend!', rating: 5, product: 'Power Up Sports Bra' },
  { name: 'Kavitha R.', text: 'The flare pants are so flattering! I got so many compliments at work. Love the fabric.', rating: 5, product: 'Ultimate Flare Pants' },
  { name: 'Sneha T.', text: 'Ordered 3 pairs of Ultimate Straight Pants. They wash so beautifully and stay in shape!', rating: 5, product: 'Ultimate Straight Pants' },
  { name: 'Meera V.', text: 'VYORA is my go-to for workwear. The fabric feels premium and lasts forever. Worth every rupee.', rating: 5, product: 'Cloud Korean Pants' },
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
function ProductCard({ p, onAdd, onView }: { p: Product; onAdd: (p: Product) => void; onView: (p: Product) => void }) {
  const [wishlisted, setWishlisted] = useState(false)
  const extra = p.colors.length - 3

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
          onClick={e => { e.stopPropagation(); setWishlisted(v => !v) }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 transition-transform hover:scale-110"
          aria-label="Wishlist"
        >
          <span className={`text-lg leading-none transition-colors ${wishlisted ? 'text-red-500' : 'text-gray-300'}`}>
            {wishlisted ? '♥' : '♡'}
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
        <p className="text-[11px] text-green-700">Best Price ₹{Math.round(p.price * 0.92).toLocaleString()} with VYORA150</p>
        <div className="flex items-center gap-1.5 pt-0.5">
          {p.colors.slice(0, 3).map((c, i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-full border border-gray-200 inline-block" style={{ background: c }} />
          ))}
          {extra > 0 && <span className="text-[11px] text-gray-500">+{extra}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub, viewAll }: { title: string; sub?: string; viewAll?: () => void }) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
      </div>
      {viewAll && (
        <button
          onClick={viewAll}
          className="hidden sm:flex text-[11px] font-bold tracking-[0.15em] border border-black px-5 py-2.5 hover:bg-black hover:text-white transition-colors shrink-0 ml-4"
        >
          VIEW ALL
        </button>
      )}
    </div>
  )
}

// ─── ProductGrid ──────────────────────────────────────────────────────────────
function ProductGrid({ products, onAdd, onView }: { products: Product[]; onAdd: (p: Product) => void; onView: (p: Product) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10">
      {products.map(p => <ProductCard key={p.id} p={p} onAdd={onAdd} onView={onView} />)}
    </div>
  )
}

// ─── CartDrawer ───────────────────────────────────────────────────────────────
function CartDrawer({ cart, open, onClose, onRemove, onQtyChange, onCheckout }: {
  cart: CartItem[]; open: boolean; onClose: () => void;
  onRemove: (id: number, size: string) => void;
  onQtyChange: (id: number, size: string, qty: number) => void;
  onCheckout: () => void;
}) {
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const [coupon, setCoupon] = useState('')

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 flex flex-col transition-transform duration-500 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="font-bold text-base tracking-wide">YOUR BAG ({cart.reduce((s, i) => s + i.qty, 0)})</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🛍</p>
              <p className="text-sm">Your bag is empty</p>
            </div>
          ) : cart.map(item => (
            <div key={`${item.product.id}-${item.size}`} className="flex gap-3.5">
              <img src={img(item.product.imgId, 120, 160)} alt={item.product.name} className="w-20 h-28 object-cover bg-gray-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug">{item.product.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Size: {item.size} · Color: {item.color}</p>
                <p className="text-sm font-bold mt-1">₹{item.product.price.toLocaleString()}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-gray-200">
                    <button onClick={() => onQtyChange(item.product.id, item.size, Math.max(1, item.qty - 1))} className="px-2.5 py-1 text-gray-500 hover:text-black transition-colors text-sm">−</button>
                    <span className="px-2.5 py-1 text-sm font-medium border-x border-gray-200">{item.qty}</span>
                    <button onClick={() => onQtyChange(item.product.id, item.size, item.qty + 1)} className="px-2.5 py-1 text-gray-500 hover:text-black transition-colors text-sm">+</button>
                  </div>
                  <button onClick={() => onRemove(item.product.id, item.size)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="px-6 py-5 border-t border-gray-100 space-y-3">
            <div className="flex gap-2">
              <input
                value={coupon}
                onChange={e => setCoupon(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="flex-1 border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:border-black transition-colors"
              />
              <button className="bg-black text-white px-4 py-2.5 text-xs font-bold tracking-wider hover:bg-gray-900 transition-colors">APPLY</button>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold">₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Shipping</span>
              <span className="text-green-700 font-medium">{subtotal > 999 ? 'FREE' : '₹99'}</span>
            </div>
            <button onClick={onCheckout} className="w-full bg-black text-white py-4 text-xs font-bold tracking-[0.2em] hover:bg-gray-900 transition-colors mt-1">
              PROCEED TO CHECKOUT
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── SearchOverlay ────────────────────────────────────────────────────────────
function SearchOverlay({ open, onClose, products, onView }: {
  open: boolean; onClose: () => void; products: Product[]; onView: (p: Product) => void;
}) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 100) } }, [open])

  const results = q.length > 1 ? products.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []
  const popular = ['Ultimate Leggings', 'Flare Pants', 'Sports Bra', 'Crop Top', 'Travel Wear']

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="flex items-center gap-4 px-6 md:px-12 py-5 border-b border-gray-100">
        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search products..."
          className="flex-1 text-xl md:text-2xl font-light focus:outline-none"
        />
        <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors text-xl shrink-0">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8">
        {q.length <= 1 ? (
          <div className="space-y-8">
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-gray-400 mb-4">POPULAR SEARCHES</p>
              <div className="flex flex-wrap gap-2">
                {popular.map(t => (
                  <button key={t} onClick={() => setQ(t)} className="border border-gray-200 px-4 py-2 text-sm hover:border-black hover:text-black transition-colors text-gray-600">
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-gray-400 mb-4">TRENDING NOW</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products.filter(p => p.badge === 'BESTSELLER').slice(0, 4).map(p => (
                  <div key={p.id} className="cursor-pointer group" onClick={() => { onView(p); onClose() }}>
                    <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                      <img src={img(p.imgId, 300, 400)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <p className="text-xs font-medium mt-2">{p.name}</p>
                    <p className="text-xs text-gray-500">₹{p.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {results.map(p => (
              <div key={p.id} className="cursor-pointer group" onClick={() => { onView(p); onClose() }}>
                <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                  <img src={img(p.imgId, 300, 400)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <p className="text-xs font-semibold mt-2">{p.name}</p>
                <p className="text-xs text-gray-500">₹{p.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No results for "{q}"</p>
        )}
      </div>
    </div>
  )
}

// ─── MegaMenu ─────────────────────────────────────────────────────────────────
function MegaMenu() {
  return (
    <div className="absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-30 py-10">
      <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-4 gap-8">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 mb-4">SHOP</p>
          {['New Arrivals', 'Bestsellers', 'All Products', 'Trending', 'Sale'].map(l => (
            <p key={l} className="text-sm py-1.5 hover:text-gray-500 cursor-pointer transition-colors">{l}</p>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 mb-4">CATEGORIES</p>
          {['Bottoms', 'Tops', 'Innerwear', 'Swimwear', 'Travel', 'Co-ords', 'Dresses', 'Accessories'].map(l => (
            <p key={l} className="text-sm py-1.5 hover:text-gray-500 cursor-pointer transition-colors">{l}</p>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 mb-4">SHOP BY ACTIVITY</p>
          {['Gym', 'Yoga', 'Running', 'Travel', 'Everyday', 'Swimming'].map(l => (
            <p key={l} className="text-sm py-1.5 hover:text-gray-500 cursor-pointer transition-colors">{l}</p>
          ))}
        </div>
        <div className="relative aspect-[4/5] overflow-hidden">
          <img src={img('photo-1597586740347-a5a9d9a93e85', 400, 500)} alt="Featured" className="w-full h-full object-cover" />
          <div className="absolute bottom-4 left-4">
            <p className="text-white text-[10px] tracking-widest font-bold">NEW ARRIVALS</p>
            <p className="text-white text-sm font-bold mt-0.5">Shop Now →</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function Navigation({ cartCount, wishlistCount, onCartOpen, onSearchOpen, onPageChange }: {
  cartCount: number; wishlistCount: number;
  onCartOpen: () => void; onSearchOpen: () => void; onPageChange: (p: Page) => void;
}) {
  const [megaOpen, setMegaOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [gender, setGender] = useState<'women' | 'men'>('women')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className={`fixed top-0 left-0 right-0 z-30 transition-shadow duration-300 ${scrolled ? 'shadow-sm' : ''}`}>
      {/* Promo Bar */}
      <div className="bg-black text-white text-center py-2 px-4">
        <p className="text-[11px] tracking-wide">
          ⚡ EXTRA ₹150 OFF ON PURCHASE OF 2 FAVES ⚡ | USE CODE: <span className="font-bold border border-white/40 px-2 py-0.5 ml-1">VYORA150</span>
        </p>
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
              <button onClick={() => onPageChange('home')} className="text-2xl font-black tracking-[0.15em]">VYORA</button>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 ml-auto">
              <button onClick={onSearchOpen} className="p-2 text-gray-600 hover:text-black transition-colors" aria-label="Search">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </button>
              <button className="hidden sm:block p-2 text-gray-600 hover:text-black transition-colors" aria-label="Account">
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

        {/* Mega Menu */}
        {megaOpen && <MegaMenu />}

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-6 py-6 space-y-4">
            {["Women's", 'Shop All', 'Bestsellers', 'New', 'Trending', 'Travel', 'Bottoms', 'Tops', 'Innerwear', 'Swimwear'].map(l => (
              <button key={l} className="block text-sm font-medium py-1 hover:text-gray-500 transition-colors w-full text-left" onClick={() => { setMobileOpen(false); onPageChange('collection') }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gender Switch */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex justify-center gap-8 py-2.5">
          <button
            onClick={() => setGender('women')}
            className={`text-xs font-semibold tracking-widest pb-1 transition-colors ${gender === 'women' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-black'}`}
          >
            WOMEN
          </button>
          <button
            onClick={() => setGender('men')}
            className={`text-xs font-semibold tracking-widest pb-1 transition-colors flex items-center gap-1.5 ${gender === 'men' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-black'}`}
          >
            MEN <span className="bg-black text-white text-[8px] px-1.5 py-0.5 font-bold tracking-widest">NEW</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ products, onAdd, onView, onCollectionPage }: {
  products: Product[]; onAdd: (p: Product) => void; onView: (p: Product) => void; onCollectionPage: () => void;
}) {
  const [slide, setSlide] = useState(0)
  const [activeCat, setActiveCat] = useState('Bestsellers')

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 5500)
    return () => clearInterval(t)
  }, [])

  const filteredProducts = activeCat === 'Bestsellers'
    ? products.filter(p => p.badge === 'BESTSELLER')
    : activeCat === 'New'
    ? products.filter(p => p.badge === 'NEW' || p.badge === 'NEW COLOURS')
    : products.filter(p => p.category === activeCat)

  const bestsellers = products.filter(p => p.badge === 'BESTSELLER')
  const newLaunches = products.filter(p => p.badge === 'NEW' || p.badge === 'NEW COLOURS')
  const travel = products.filter(p => p.category === 'Travel')
  const bottoms = products.filter(p => p.category === 'Bottoms')
  const innerwear = products.filter(p => p.category === 'Innerwear')
  const swimwear = products.filter(p => p.category === 'Swimwear')

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative w-full h-[92vh] overflow-hidden bg-gray-100">
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}
          >
            <img src={img(s.imgId, 1600, 900)} alt={s.heading} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
          </div>
        ))}
        <div className="relative z-10 flex flex-col justify-center h-full px-8 md:px-16 max-w-screen-xl mx-auto">
          <p className="text-white/70 text-[11px] font-bold tracking-[0.3em] mb-4">{HERO_SLIDES[slide].label}</p>
          <h1 className="hero-text text-white text-4xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight mb-5">
            {HERO_SLIDES[slide].heading}
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-xs mb-8">{HERO_SLIDES[slide].sub}</p>
          <div className="flex gap-3 flex-wrap">
            <button className="bg-white text-black px-8 py-3.5 text-xs font-bold tracking-[0.2em] hover:bg-gray-100 transition-colors">
              SHOP NOW
            </button>
            <button className="border border-white text-white px-8 py-3.5 text-xs font-bold tracking-[0.2em] hover:bg-white hover:text-black transition-colors">
              EXPLORE NEW
            </button>
          </div>
        </div>
        {/* Indicators */}
        <div className="absolute bottom-8 right-8 flex gap-2 z-10">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`w-6 h-0.5 transition-colors ${i === slide ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      </section>

      {/* ── Featured Collections ── */}
      <section className="py-12 px-4 md:px-6 max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'ALL-DAY WEAR', sub: 'From meetings to workouts', imgId: 'photo-1540827109409-17f40944f276' },
            { title: 'NEW LAUNCHES', sub: 'Hot off the press, just in.', imgId: 'photo-1677213584003-f45f39e7f372' },
            { title: 'ACTIVE ESSENTIALS', sub: 'Made for every move', imgId: 'photo-1662532577856-e8ee8b138a8b' },
          ].map(c => (
            <div key={c.title} className="group relative aspect-[4/5] overflow-hidden cursor-pointer bg-gray-100" onClick={onCollectionPage}>
              <img src={img(c.imgId, 700, 875)} alt={c.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-white text-[10px] font-bold tracking-[0.2em] mb-1">{c.title}</p>
                <p className="text-white/80 text-sm mb-3">{c.sub}</p>
                <span className="text-white text-[10px] font-bold tracking-widest border-b border-white/60 pb-0.5">SHOP NOW →</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Shop by Category ── */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-8 tracking-tight">Shop by Category</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-10 scrollbar-hide justify-start md:justify-center">
            {CATEGORIES_TABS.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`shrink-0 px-5 py-2 text-xs font-semibold tracking-widest border transition-colors ${activeCat === cat ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'}`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
          {filteredProducts.length > 0
            ? <ProductGrid products={filteredProducts.slice(0, 6)} onAdd={onAdd} onView={onView} />
            : <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10"><ProductGrid products={bestsellers.slice(0, 6)} onAdd={onAdd} onView={onView} /></div>
          }
          <div className="text-center mt-10">
            <button onClick={onCollectionPage} className="border border-black px-10 py-3.5 text-xs font-bold tracking-[0.2em] hover:bg-black hover:text-white transition-colors">
              VIEW ALL
            </button>
          </div>
        </div>
      </section>

      {/* ── Bestsellers ── */}
      <section className="py-14 max-w-screen-xl mx-auto px-4 md:px-6">
        <SectionHeader title="Bestsellers" viewAll={onCollectionPage} />
        <ProductGrid products={bestsellers.slice(0, 6)} onAdd={onAdd} onView={onView} />
      </section>

      {/* ── New Launches ── */}
      <section className="py-14 bg-[#fafafa]">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6">
          <SectionHeader title="New Launches" viewAll={onCollectionPage} />
          <ProductGrid products={newLaunches.slice(0, 6)} onAdd={onAdd} onView={onView} />
        </div>
      </section>

      {/* ── Travel ── */}
      <section className="py-14 max-w-screen-xl mx-auto px-4 md:px-6">
        <SectionHeader title="Travel" sub="Made to move with you." viewAll={onCollectionPage} />
        <ProductGrid products={travel.slice(0, 6)} onAdd={onAdd} onView={onView} />
      </section>

      {/* ── Bottoms ── */}
      <section className="py-14 bg-[#fafafa]">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6">
          <SectionHeader title="Bottoms" viewAll={onCollectionPage} />
          <ProductGrid products={bottoms.slice(0, 6)} onAdd={onAdd} onView={onView} />
        </div>
      </section>

      {/* ── Innerwear ── */}
      <section className="py-14 max-w-screen-xl mx-auto px-4 md:px-6">
        <SectionHeader title="Innerwear" viewAll={onCollectionPage} />
        <ProductGrid products={innerwear.slice(0, 6)} onAdd={onAdd} onView={onView} />
      </section>

      {/* ── Swimwear ── */}
      <section className="py-14 bg-[#fafafa]">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6">
          <SectionHeader title="Swimwear" viewAll={onCollectionPage} />
          <ProductGrid products={swimwear} onAdd={onAdd} onView={onView} />
        </div>
      </section>

      {/* ── Editorial Banner ── */}
      <section className="bg-black py-28 px-6 text-center overflow-hidden relative">
        <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] md:text-[200px] font-black text-white/5 whitespace-nowrap leading-none select-none pointer-events-none">
          #KEEPMOVING
        </p>
        <div className="relative z-10">
          <p className="text-white/50 text-[10px] tracking-[0.4em] mb-6 font-bold">VYORA · MOVE. LIVE. REPEAT.</p>
          <h2 className="text-white text-4xl md:text-7xl font-black tracking-tight">LET'S #KEEPMOVING</h2>
          <p className="text-white/60 text-sm mt-6 max-w-md mx-auto">Join thousands of women who move, live, and repeat with VYORA every single day.</p>
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
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-6">Designed for\nreal life.</h2>
            <p className="text-gray-600 leading-relaxed text-sm mb-4">
              VYORA was born from a simple idea: clothing should move with you, not against you. We believe that when you feel good in what you wear, you do more, move more, and live more fully.
            </p>
            <p className="text-gray-600 leading-relaxed text-sm mb-8">
              Every piece we design starts with real women, real routines, and real life. From morning workouts to coffee runs, boardroom meetings to weekend adventures — VYORA is built for the full spectrum of you.
            </p>
            <button className="border border-black px-8 py-3.5 text-xs font-bold tracking-[0.2em] hover:bg-black hover:text-white transition-colors">
              OUR STORY
            </button>
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="py-14 bg-[#fafafa] overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10">
            <p className="text-[10px] tracking-[0.3em] text-gray-400 font-bold mb-2">COMMUNITY LOVE</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Love From Our Community</h2>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory">
            {REVIEWS.map((r, i) => (
              <div key={i} className="shrink-0 w-72 md:w-80 border border-gray-200 bg-white p-6 snap-start">
                <Stars rating={r.rating} />
                <p className="text-sm text-gray-700 mt-3 mb-4 leading-relaxed">"{r.text}"</p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold">{r.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Verified Buyer · {r.product}</p>
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
            Follow @vyora
          </h2>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {INSTA_PHOTOS.map((id, i) => (
            <div key={i} className="aspect-square overflow-hidden bg-gray-100 cursor-pointer group">
              <img src={img(id, 400, 400)} alt={`@vyora post ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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
            { title: 'CONTACT', links: ['VYORA Fashion Private Limited', 'India', 'support@vyora.in', '+91 98765 43210'] },
          ].map(col => (
            <div key={col.title}>
              <p className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-4">{col.title}</p>
              {col.links.map(l => (
                <p key={l} className="text-sm text-white/70 py-1 hover:text-white cursor-pointer transition-colors">{l}</p>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/40">© 2026 VYORA. All Rights Reserved.</p>
          <div className="flex gap-4">
            {['Instagram', 'Facebook', 'YouTube', 'WhatsApp', 'X'].map(s => (
              <button key={s} className="text-xs text-white/40 hover:text-white transition-colors">{s}</button>
            ))}
          </div>
          <div className="flex gap-4">
            {['Contact Us', 'Refer & Earn', 'Rewards', 'Terms', 'Refund Policy'].map(l => (
              <button key={l} className="text-xs text-white/40 hover:text-white transition-colors">{l}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── PDP Page ─────────────────────────────────────────────────────────────────
function PDPPage({ product, products, onAdd, onView, onBack }: {
  product: Product; products: Product[]; onAdd: (p: Product, size: string, color: string) => void; onView: (p: Product) => void; onBack: () => void;
}) {
  const [selectedSize, setSelectedSize] = useState('M')
  const [selectedColor, setSelectedColor] = useState(product.colors[0])
  const [qty, setQty] = useState(1)
  const [activeTab, setActiveTab] = useState('details')
  const [sizeGuide, setSizeGuide] = useState(false)

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4)

  const tabs = [
    { id: 'details', label: 'Product Details' },
    { id: 'fabric', label: 'Fabric & Care' },
    { id: 'fit', label: 'Fit' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'returns', label: 'Returns' },
  ]

  const tabContent: Record<string, string> = {
    details: product.description ?? 'Premium activewear crafted with 4-way stretch fabric for maximum comfort and performance.',
    fabric: '87% Polyester, 13% Elastane. Machine wash cold. Do not bleach. Tumble dry low. Do not iron.',
    fit: 'This garment is designed with a high-rise waist. Model is 5\'7" and wears size S. We recommend sizing up if between sizes.',
    shipping: 'Free delivery on orders above ₹999. Standard delivery: 3-5 business days. Express delivery available at checkout.',
    returns: '30-day easy returns on all products. Items must be unwashed and unworn with tags attached.',
  }

  const discount = Math.round((product.mrp - product.price) / product.mrp * 100)

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8">
        <button onClick={onBack} className="hover:text-black transition-colors">Home</button>
        <span>/</span>
        <span className="hover:text-black cursor-pointer transition-colors">{product.category}</span>
        <span>/</span>
        <span className="text-black">{product.name}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-[3/4] overflow-hidden bg-gray-100">
            <img src={img(product.imgId, 800, 1067)} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`aspect-[3/4] overflow-hidden bg-gray-100 cursor-pointer border-2 ${i === 0 ? 'border-black' : 'border-transparent'}`}>
                <img src={img(product.imgId, 200, 267)} alt="" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="py-2">
          <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 mb-2">{product.category.toUpperCase()}</p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-3">{product.name}</h1>
          <div className="flex items-center gap-2 mb-4">
            <Stars rating={product.rating} />
            <span className="text-sm text-gray-500">{product.rating} · {product.reviews.toLocaleString()} reviews</span>
          </div>
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-2xl font-black">₹{product.price.toLocaleString()}</span>
            <span className="text-base text-gray-400 line-through">₹{product.mrp.toLocaleString()}</span>
            <span className="text-sm font-bold text-green-700">{discount}% OFF</span>
          </div>
          <p className="text-sm text-green-700 mb-6">Best Price ₹{Math.round(product.price * 0.92).toLocaleString()} with coupon <span className="font-bold">VYORA150</span></p>

          {/* Color */}
          <div className="mb-6">
            <p className="text-xs font-bold tracking-wider mb-3">COLOR</p>
            <div className="flex gap-2">
              {product.colors.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c ? 'border-black scale-110' : 'border-gray-200 hover:border-gray-400'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold tracking-wider">SIZE</p>
              <button onClick={() => setSizeGuide(v => !v)} className="text-xs text-gray-500 underline hover:text-black transition-colors">Size Guide</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`w-12 h-10 text-xs font-semibold border transition-colors ${selectedSize === s ? 'bg-black text-white border-black' : 'border-gray-200 hover:border-black text-gray-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            {sizeGuide && (
              <div className="mt-3 p-4 border border-gray-200 text-xs text-gray-600">
                <p className="font-bold mb-2">SIZE GUIDE (Waist / Hip in inches)</p>
                <div className="grid grid-cols-3 gap-1 text-center">
                  {[['XS', '24–25 / 33–34'], ['S', '26–27 / 35–36'], ['M', '28–29 / 37–38'], ['L', '30–32 / 39–41'], ['XL', '33–35 / 42–44'], ['XXL', '36–38 / 45–47']].map(([size, meas]) => (
                    <div key={size} className="border border-gray-100 p-1.5"><p className="font-bold">{size}</p><p className="text-gray-400">{meas}</p></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <p className="text-xs font-bold tracking-wider">QTY</p>
            <div className="flex items-center border border-gray-200">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-2.5 text-gray-500 hover:text-black transition-colors">−</button>
              <span className="px-4 py-2.5 text-sm font-medium border-x border-gray-200">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="px-4 py-2.5 text-gray-500 hover:text-black transition-colors">+</button>
            </div>
          </div>

          <div className="flex gap-3 mb-8">
            <button
              onClick={() => onAdd(product, selectedSize, selectedColor)}
              className="flex-1 bg-black text-white py-4 text-xs font-bold tracking-[0.2em] hover:bg-gray-900 transition-colors"
            >
              ADD TO BAG
            </button>
            <button className="flex-1 border border-black py-4 text-xs font-bold tracking-[0.2em] hover:bg-black hover:text-white transition-colors">
              BUY NOW
            </button>
          </div>

          <div className="flex gap-6 text-xs text-gray-500 mb-8">
            {['Free returns', 'Secure checkout', 'COD available'].map(f => (
              <span key={f} className="flex items-center gap-1"><span className="text-green-600">✓</span>{f}</span>
            ))}
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-100">
            <div className="flex overflow-x-auto">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`shrink-0 text-xs font-semibold py-4 px-4 border-b-2 transition-colors ${activeTab === t.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600 py-5 leading-relaxed">{tabContent[activeTab]}</p>
          </div>
        </div>
      </div>

      {/* You May Also Like */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="text-2xl font-black tracking-tight mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
            {related.map(p => <ProductCard key={p.id} p={p} onAdd={() => onAdd(p, 'M', p.colors[0])} onView={onView} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Collection Page ──────────────────────────────────────────────────────────
function CollectionPage({ products, onAdd, onView }: { products: Product[]; onAdd: (p: Product) => void; onView: (p: Product) => void }) {
  const [sort, setSort] = useState('featured')
  const [filters, setFilters] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState([0, 5000])
  const [filterOpen, setFilterOpen] = useState(false)

  const cats = ['Bottoms', 'Tops', 'Innerwear', 'Swimwear', 'Travel']
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

  const toggleFilter = (f: string) => setFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  let filtered = filters.length ? products.filter(p => filters.includes(p.category)) : products
  filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])

  if (sort === 'price-asc') filtered = [...filtered].sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') filtered = [...filtered].sort((a, b) => b.price - a.price)
  if (sort === 'rating') filtered = [...filtered].sort((a, b) => b.rating - a.rating)

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-8">
      <p className="text-xs text-gray-400 mb-4">Home / <span className="text-black">All Products</span></p>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">All Products</h1>
        <p className="text-sm text-gray-500 mt-2">Premium women's activewear and athleisure for every move.</p>
      </div>

      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFilterOpen(v => !v)}
            className="hidden md:flex items-center gap-2 text-xs font-bold tracking-wider border border-gray-200 px-4 py-2.5 hover:border-black transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18M7 12h10M10 20h4" /></svg>
            FILTER {filters.length > 0 && `(${filters.length})`}
          </button>
          <p className="text-xs text-gray-400">{filtered.length} products</p>
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="text-xs border border-gray-200 px-3 py-2.5 focus:outline-none focus:border-black transition-colors cursor-pointer"
        >
          <option value="featured">FEATURED</option>
          <option value="price-asc">PRICE: LOW TO HIGH</option>
          <option value="price-desc">PRICE: HIGH TO LOW</option>
          <option value="rating">TOP RATED</option>
        </select>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        {filterOpen && (
          <div className="hidden md:block w-56 shrink-0">
            <div className="border-b border-gray-100 pb-6 mb-6">
              <p className="text-xs font-bold tracking-wider mb-4">CATEGORY</p>
              {cats.map(c => (
                <label key={c} className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={filters.includes(c)} onChange={() => toggleFilter(c)} className="w-3.5 h-3.5 accent-black" />
                  <span className="text-sm text-gray-700">{c}</span>
                </label>
              ))}
            </div>
            <div className="border-b border-gray-100 pb-6 mb-6">
              <p className="text-xs font-bold tracking-wider mb-4">SIZE</p>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map(s => (
                  <button key={s} className="w-9 h-9 text-xs border border-gray-200 hover:border-black transition-colors">{s}</button>
                ))}
              </div>
            </div>
            <div className="pb-6">
              <p className="text-xs font-bold tracking-wider mb-4">PRICE RANGE</p>
              <p className="text-xs text-gray-500 mb-2">₹{priceRange[0]} – ₹{priceRange[1]}</p>
              <input type="range" min={0} max={5000} step={100} value={priceRange[1]} onChange={e => setPriceRange([0, +e.target.value])} className="w-full accent-black" />
            </div>
            {filters.length > 0 && (
              <button onClick={() => setFilters([])} className="text-xs font-bold tracking-wider text-red-500 hover:text-red-700 transition-colors">
                CLEAR ALL FILTERS
              </button>
            )}
          </div>
        )}
        <div className="flex-1">
          <ProductGrid products={filtered} onAdd={onAdd} onView={onView} />
        </div>
      </div>

      {/* Mobile filter bar */}
      <div className="fixed bottom-0 left-0 right-0 flex md:hidden bg-white border-t border-gray-200 z-20">
        <button onClick={() => setFilterOpen(v => !v)} className="flex-1 py-4 text-xs font-bold tracking-wider flex items-center justify-center gap-2 border-r border-gray-200">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18M7 12h10M10 20h4" /></svg>
          FILTER {filters.length > 0 && `(${filters.length})`}
        </button>
        <select value={sort} onChange={e => setSort(e.target.value)} className="flex-1 py-4 text-xs font-bold tracking-wider text-center focus:outline-none bg-transparent cursor-pointer">
          <option value="featured">SORT</option>
          <option value="price-asc">PRICE: LOW TO HIGH</option>
          <option value="price-desc">PRICE: HIGH TO LOW</option>
          <option value="rating">TOP RATED</option>
        </select>
      </div>
    </div>
  )
}

// ─── Cart Page ────────────────────────────────────────────────────────────────
function CartPage({ cart, onRemove, onQtyChange }: {
  cart: CartItem[]; onRemove: (id: number, size: string) => void; onQtyChange: (id: number, size: string, qty: number) => void;
}) {
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const shipping = subtotal > 999 ? 0 : 99
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const discount = couponApplied ? Math.round(subtotal * 0.08) : 0

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
            <div className="border border-gray-200 p-6 sticky top-40">
              <h3 className="font-bold text-sm tracking-wider mb-6">ORDER SUMMARY</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Coupon (VYORA150)</span>
                    <span>−₹{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className={`font-medium ${shipping === 0 ? 'text-green-700' : ''}`}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{(subtotal - discount + shipping).toLocaleString()}</span>
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
                  onClick={() => { if (coupon === 'VYORA150') setCouponApplied(true) }}
                  className="bg-black text-white px-4 py-2.5 text-xs font-bold hover:bg-gray-900 transition-colors"
                >
                  APPLY
                </button>
              </div>
              {couponApplied && <p className="text-xs text-green-700 font-medium mb-4">✓ Coupon applied! You save ₹{discount.toLocaleString()}</p>}
              <button className="w-full bg-black text-white py-4 text-xs font-bold tracking-[0.2em] hover:bg-gray-900 transition-colors">
                PROCEED TO CHECKOUT
              </button>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">Secure checkout · COD available</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [wishlistCount] = useState(2)

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  function addToCart(p: Product, size = 'M', color = p.colors[0]) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === p.id && i.size === size)
      if (existing) return prev.map(i => i.product.id === p.id && i.size === size ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product: p, size, color, qty: 1 }]
    })
    setCartOpen(true)
  }

  function removeFromCart(id: number, size: string) {
    setCart(prev => prev.filter(i => !(i.product.id === id && i.size === size)))
  }

  function updateQty(id: number, size: string, qty: number) {
    setCart(prev => prev.map(i => i.product.id === id && i.size === size ? { ...i, qty } : i))
  }

  function viewProduct(p: Product) {
    setSelectedProduct(p)
    setPage('pdp')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function navigateTo(p: Page) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navOffset = 'pt-[108px] md:pt-[108px]'

  return (
    <div className="min-h-screen bg-white text-black">
      <Navigation
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        onCartOpen={() => setCartOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
        onPageChange={navigateTo}
      />

      <main className={navOffset}>
        {page === 'home' && (
          <>
            <HomePage
              products={ALL_PRODUCTS}
              onAdd={addToCart}
              onView={viewProduct}
              onCollectionPage={() => navigateTo('collection')}
            />
            <Footer onPageChange={navigateTo} />
          </>
        )}
        {page === 'pdp' && selectedProduct && (
          <>
            <PDPPage
              product={selectedProduct}
              products={ALL_PRODUCTS}
              onAdd={addToCart}
              onView={viewProduct}
              onBack={() => navigateTo('home')}
            />
            <Footer onPageChange={navigateTo} />
          </>
        )}
        {page === 'collection' && (
          <>
            <CollectionPage products={ALL_PRODUCTS} onAdd={addToCart} onView={viewProduct} />
            <div className="h-16 md:h-0" />
            <Footer onPageChange={navigateTo} />
          </>
        )}
        {page === 'cart' && (
          <>
            <CartPage cart={cart} onRemove={removeFromCart} onQtyChange={updateQty} />
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
        products={ALL_PRODUCTS}
        onView={viewProduct}
      />
    </div>
  )
}
