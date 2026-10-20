import React from 'react'

export type InfoModalType =
  | 'returns'
  | 'shipping'
  | 'contact'
  | 'story'
  | 'fabric'
  | 'sustainability'
  | 'privacy'
  | 'terms'
  | 'refund'

interface InfoModalProps {
  type: InfoModalType | null
  onClose: () => void
}

export default function InfoModal({ type, onClose }: InfoModalProps) {
  if (!type) return null

  const contentMap: Record<InfoModalType, { badge: string; title: string; subtitle: string; body: React.ReactNode }> = {
    returns: {
      badge: 'HASSLE-FREE PROMISE',
      title: '7-Day Easy Returns & Exchanges',
      subtitle: 'Try it on at home. If it doesn’t fit like a dream, we will exchange or refund it immediately.',
      body: (
        <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg flex items-start gap-3">
            <span className="text-xl">🔄</span>
            <div>
              <p className="font-bold text-gray-900 text-sm">Doorstep Reverse Pickup Across India</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Our delivery partner picks up the item from your doorstep within 24-48 hours of request.</p>
            </div>
          </div>

          <h4 className="font-bold text-gray-900 text-xs tracking-wider uppercase pt-2">Exchange Guidelines:</h4>
          <ul className="list-disc list-inside space-y-1.5 pl-1">
            <li>Item must be unused, unwashed with original Arovia Fit tags and polybag intact.</li>
            <li>Free size or color exchange on first request.</li>
            <li>Prepaid orders are refunded back to original source or UPI within 24 hours of inspection.</li>
            <li>COD orders are refunded via direct UPI / Bank Transfer.</li>
          </ul>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Need an immediate exchange?</span>
            <a
              href="https://wa.me/919876543210?text=Hi%20Arovia%20Fit,%20I%20would%20like%20to%20request%20an%20exchange/return"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded text-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <span>💬</span> WhatsApp Support
            </a>
          </div>
        </div>
      )
    },
    shipping: {
      badge: 'EXPRESS DISPATCH',
      title: 'Shipping & Delivery Policy',
      subtitle: 'Powered by BlitzShipz Logistics Gateway with live telemetry tracking.',
      body: (
        <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Standard Delivery</p>
              <p className="font-extrabold text-sm text-gray-900 mt-1">2 - 4 Days</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Metros & Tier 1 Cities</p>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Free Shipping</p>
              <p className="font-extrabold text-sm text-emerald-600 mt-1">Orders &gt; ₹999</p>
              <p className="text-[11px] text-gray-500 mt-0.5">₹99 for orders below ₹999</p>
            </div>
          </div>

          <h4 className="font-bold text-gray-900 text-xs tracking-wider uppercase pt-2">Order Fulfillment:</h4>
          <ul className="list-disc list-inside space-y-1.5 pl-1">
            <li>Same-day dispatch for all orders placed before 2:00 PM IST.</li>
            <li>Realtime tracking link sent via SMS and WhatsApp instantly upon dispatch.</li>
            <li>Tamper-evident sealed waterproof packaging for all activewear apparel.</li>
          </ul>
        </div>
      )
    },
    contact: {
      badge: 'WE ARE HERE FOR YOU',
      title: 'Contact Arovia Fit Support',
      subtitle: 'Have a question about sizing, fabrics or orders? We are available 7 days a week.',
      body: (
        <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
          <div className="space-y-2.5">
            <a
              href="https://wa.me/919876543210?text=Hello%20Arovia%20Fit%20Team"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-emerald-950 font-bold"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">💬</span>
                <div>
                  <p className="text-xs font-bold text-emerald-900">Live WhatsApp Chat</p>
                  <p className="text-[10px] text-emerald-700 font-normal">Fastest response in under 5 minutes</p>
                </div>
              </div>
              <span className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded">Chat Now</span>
            </a>

            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-3">
              <span className="text-xl">✉️</span>
              <div>
                <p className="font-bold text-gray-900">Email Support</p>
                <p className="text-[11px] text-gray-500">support@aroviafit.com (Response within 4 hours)</p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-3">
              <span className="text-xl">📍</span>
              <div>
                <p className="font-bold text-gray-900">Headquarters</p>
                <p className="text-[11px] text-gray-500">Arovia Fit Private Limited, DLF Cyber City, Phase III, Gurugram, HR - 122002</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    story: {
      badge: 'THE GENESIS',
      title: 'Our Story: Comfort Meets Style',
      subtitle: 'Crafted for the modern woman who refuses to compromise between performance and elegance.',
      body: (
        <div className="space-y-3.5 text-xs text-gray-600 leading-relaxed">
          <p>
            Arovia Fit was born out of a simple frustration: activewear in India was either high-priced international imports with ill-suited fits, or uncomfortable polyester that failed the squat test.
          </p>
          <p>
            We set out to engineer precision athletic apparel in India using premium 4-way Italian stretch compression textiles. Pieces that transition seamlessly from a 7 AM pilates class to a 10 AM executive meeting and dinner with friends.
          </p>
          <div className="p-4 bg-zinc-950 text-white rounded-lg my-3">
            <p className="text-xs italic leading-relaxed text-zinc-300">
              "We believe confidence begins the second you pull on activewear that sculpts, breathes, and feels like a second skin."
            </p>
            <p className="text-[10px] font-bold text-zinc-400 mt-2">— Founder, Arovia Fit</p>
          </div>
        </div>
      )
    },
    fabric: {
      badge: 'MATERIAL SCIENCE',
      title: 'Fabric Innovation & Craftsmanship',
      subtitle: 'Proprietary textiles engineered for high durability, buttery softness, and 100% opacity.',
      body: (
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="font-bold text-gray-900 text-xs">ButterSoft™ Micro-Nylon</p>
              <p className="text-[11px] text-gray-500 mt-1">Interlock knit with brushed microfiber finish that feels weightless and cloud-soft against skin.</p>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="font-bold text-gray-900 text-xs">100% Squat-Proof Opacity</p>
              <p className="text-[11px] text-gray-500 mt-1">Dual-faced high-density weaving guarantees zero sheer transparency under gym lighting.</p>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="font-bold text-gray-900 text-xs">HydroDry™ Moisture Wicking</p>
              <p className="text-[11px] text-gray-500 mt-1">Capillary action pulls sweat away from the body to vaporize rapidly, keeping you dry.</p>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="font-bold text-gray-900 text-xs">ShapeLock™ Recovery</p>
              <p className="text-[11px] text-gray-500 mt-1">25% Lycra spandex content ensures leggings never sag at knees or waistline even after 100+ washes.</p>
            </div>
          </div>
        </div>
      )
    },
    sustainability: {
      badge: 'CONSCIOUS CREATION',
      title: 'Our Sustainability Commitment',
      subtitle: 'Fashion that moves you forward without leaving a heavy footprint behind.',
      body: (
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold text-sm">✓</span>
              <div>
                <strong className="text-gray-900">Zero-Waste Pattern Engineering:</strong> Pattern pieces are digitized using AI CAD layout to maximize fabric utilization and eliminate textile scrap.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold text-sm">✓</span>
              <div>
                <strong className="text-gray-900">100% Biodegradable Polybags:</strong> Every item is packaged in plant-based, compostable mailers instead of single-use virgin plastic.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold text-sm">✓</span>
              <div>
                <strong className="text-gray-900">Non-Toxic OEKO-TEX® Certified Dyes:</strong> Water-efficient closed-loop dyeing prevents harmful effluent from reaching freshwater streams.
              </div>
            </li>
          </ul>
        </div>
      )
    },
    privacy: {
      badge: 'YOUR DATA MATTERS',
      title: 'Privacy Policy',
      subtitle: 'How Arovia Fit protects and respects your personal information.',
      body: (
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <p>
            Arovia Fit Private Limited adheres to strict data privacy principles under Indian IT Act regulations and global standards.
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>We collect only essential details (Name, Shipping Address, Phone) needed to process your delivery.</li>
            <li>We never store your credit card, debit card, or UPI PIN numbers. All payments are encrypted by Razorpay PCI-DSS Level 1 security.</li>
            <li>Your phone number and email are never rented, sold, or shared with third-party advertisers.</li>
          </ul>
        </div>
      )
    },
    terms: {
      badge: 'TERMS & CONDITIONS',
      title: 'Terms of Service',
      subtitle: 'Standard terms governing purchases and platform usage on AroviaFit.com.',
      body: (
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <ul className="list-disc list-inside space-y-1.5 pl-1">
            <li>All product prices are inclusive of GST (Goods and Services Tax) in Indian Rupees (INR).</li>
            <li>Orders once dispatched can be tracked via BlitzShipz live logistics integration.</li>
            <li>Arovia Fit reserves the right to cancel any order flagged by automated anti-fraud security with immediate refund.</li>
          </ul>
        </div>
      )
    },
    refund: {
      badge: 'INSTANT REVERSAL',
      title: 'Refund Policy & Timelines',
      subtitle: 'Clear, transparent refund processing directly back to your account.',
      body: (
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 font-semibold">
            ⚡ Instant UPI & Card Refunds: Completed within 24 hours of warehouse return inspection!
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>UPI & Netbanking:</strong> 2 to 24 hours.</li>
            <li><strong>Credit / Debit Cards:</strong> 2 to 4 business days depending on issuing bank.</li>
            <li><strong>Cash on Delivery (COD):</strong> Instant payout link sent to your mobile for immediate direct UPI transfer.</li>
          </ul>
        </div>
      )
    }
  }

  const active = contentMap[type]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 sm:p-7 relative border border-gray-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center text-gray-500 font-bold transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="mb-4">
          <span className="bg-black text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm">
            {active.badge}
          </span>
          <h3 className="text-xl font-black text-gray-900 mt-2">{active.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{active.subtitle}</p>
        </div>

        <div className="py-2 border-t border-gray-100">
          {active.body}
        </div>

        <div className="mt-6 pt-3 border-t border-gray-100 text-right">
          <button
            onClick={onClose}
            className="bg-black text-white text-xs font-bold px-5 py-2.5 rounded hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
