import React, { useState, useEffect } from 'react'
import { DBOrder } from '../services/supabaseBackend'
import {
  trackBlitzshipShipment,
  BlitzshipTrackingResult,
  generateBlitzshipThermalLabel
} from '../services/blitzshipService'

export interface TrackingModalProps {
  open: boolean
  onClose: () => void
  order?: DBOrder | null
  initialAwbOrOrderId?: string
}

export default function TrackingModal({
  open,
  onClose,
  order,
  initialAwbOrOrderId = ''
}: TrackingModalProps) {
  const [query, setQuery] = useState(initialAwbOrOrderId || order?.tracking_number || order?.id || '')
  const [loading, setLoading] = useState(false)
  const [trackingData, setTrackingData] = useState<BlitzshipTrackingResult | null>(null)

  useEffect(() => {
    if (open) {
      const initialId = initialAwbOrOrderId || order?.tracking_number || order?.id || 'BLZ98214309'
      setQuery(initialId)
      fetchTracking(initialId)
    }
  }, [open, order, initialAwbOrOrderId])

  const fetchTracking = async (idToTrack: string) => {
    if (!idToTrack.trim()) return
    setLoading(true)
    try {
      const result = await trackBlitzshipShipment(idToTrack.trim(), order)
      setTrackingData(result)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchTracking(query)
  }

  const handlePrintLabel = () => {
    if (!order && !trackingData) return
    const targetOrder = order || {
      id: trackingData?.order_id || 'ORD-982143',
      session_id: 'guest',
      items: [{ product: { name: 'Arovia Signature Flare Pants', price: 999 }, size: 'M', qty: 1 }],
      subtotal: 999,
      discount: 0,
      shipping: 0,
      total: 999,
      payment_status: 'Paid',
      tracking_number: trackingData?.awb_number,
      customer_name: trackingData?.consignee_name || 'Arovia Customer',
      shipping_address: '402, Sunset Heights, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400050',
      created_at: new Date().toISOString()
    } as DBOrder

    const labelHtml = generateBlitzshipThermalLabel(targetOrder, trackingData?.awb_number || 'BLZ98214309')
    const win = window.open('', '_blank', 'width=450,height=600')
    if (win) {
      win.document.write(labelHtml)
      win.document.close()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-black text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">
                BLITZSHIPZ LIVE TELEMETRY
              </span>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Realtime API Connected</span>
              </span>
            </div>
            <h3 className="text-xl font-black text-gray-900">Shipment & AWB Live Tracking</h3>
            <p className="text-xs text-gray-500">Live parcel tracking powered by BlitzShipz Logistics Gateway</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center font-bold text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter BlitzShipz AWB # or Order ID (e.g. BLZ98214309, ORD-123456)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg px-3.5 py-2.5 pl-9 font-mono font-bold focus:outline-none focus:border-black"
            />
            <span className="absolute left-3 top-2.5 text-xs text-gray-400">📦</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white text-xs font-bold px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{loading ? 'Tracking...' : 'Track AWB'}</span>
            <span>→</span>
          </button>
        </form>

        {/* Tracking Content */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-500">Querying BlitzShipz Tracking Gateway...</p>
          </div>
        ) : trackingData ? (
          <div className="space-y-6">
            {/* High Level Status Banner */}
            <div className="bg-gradient-to-br from-zinc-900 to-black text-white p-5 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] text-zinc-400 font-mono">AWB: {trackingData.awb_number}</span>
                <h4 className="text-xl font-black mt-0.5 text-white flex items-center gap-2">
                  <span>{trackingData.current_status}</span>
                  {trackingData.is_delivered && <span className="text-emerald-400 text-sm">✓</span>}
                </h4>
                <p className="text-xs text-zinc-300 mt-1">
                  Courier: <strong>{trackingData.courier}</strong>
                </p>
              </div>
              <div className="text-left sm:text-right bg-white/10 p-3 rounded-lg border border-white/10">
                <p className="text-[10px] text-zinc-300 uppercase tracking-wider font-bold">Estimated Delivery</p>
                <p className="text-base font-black text-emerald-400">{trackingData.estimated_delivery}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">To {trackingData.destination_city}</p>
              </div>
            </div>

            {/* Visual Step Timeline */}
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4">
                Shipment Transit History
              </h4>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {trackingData.milestones.map((step, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle Node */}
                    <span
                      className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
                        step.completed
                          ? 'bg-black text-white border-black ring-4 ring-emerald-100'
                          : 'bg-white text-gray-400 border-gray-300'
                      }`}
                    >
                      {step.completed ? '✓' : idx + 1}
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <p className={`text-xs font-bold ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.title}
                        </p>
                        <span className="text-[10px] font-mono text-gray-400">{step.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{step.description}</p>
                      <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">📍 {step.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consignee Details & Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Consignee Recipient</p>
                <p className="font-bold text-gray-900">{trackingData.consignee_name}</p>
                <p className="text-gray-600">{trackingData.destination_city}</p>
                <p className="text-[10px] text-emerald-700 font-semibold">✓ Verified Doorstep Delivery</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Logistics Actions</p>
                  <p className="text-[11px] text-gray-600">Print standard BlitzShipz thermal dispatch label</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrintLabel}
                    className="flex-1 bg-black text-white font-bold py-2 rounded-lg text-xs hover:bg-gray-800 transition-colors"
                  >
                    🖨️ Print Label
                  </button>
                  <a
                    href={`https://wa.me/919876543210?text=Hi%20Arovia%20Fit%2C%20please%20update%20me%20on%20my%20order%20${trackingData.awb_number}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center"
                    title="WhatsApp Support"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400 text-xs">
            Enter an Order ID or BlitzShipz AWB tracking number to view real-time transit telemetry.
          </div>
        )}
      </div>
    </div>
  )
}
