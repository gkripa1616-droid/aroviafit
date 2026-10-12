import React, { useState } from 'react'

export interface SizeGuideModalProps {
  open: boolean
  onClose: () => void
  category?: string
}

export default function SizeGuideModal({ open, onClose, category = 'Bottoms' }: SizeGuideModalProps) {
  const [unit, setUnit] = useState<'inches' | 'cm'>('inches')
  const [activeTab, setActiveTab] = useState<'bottoms' | 'tops' | 'innerwear' | 'swimwear'>(() => {
    const cat = category.toLowerCase()
    if (cat.includes('top')) return 'tops'
    if (cat.includes('bra') || cat.includes('inner')) return 'innerwear'
    if (cat.includes('swim')) return 'swimwear'
    return 'bottoms'
  })

  if (!open) return null

  // Size measurement matrices
  const bottomsData = [
    { size: 'XS', waistIn: '24 - 26', hipIn: '34 - 36', lengthIn: '38', waistCm: '61 - 66', hipCm: '86 - 91', lengthCm: '96.5' },
    { size: 'S', waistIn: '27 - 28', hipIn: '37 - 38', lengthIn: '39', waistCm: '68 - 71', hipCm: '94 - 96', lengthCm: '99' },
    { size: 'M', waistIn: '29 - 31', hipIn: '39 - 41', lengthIn: '39.5', waistCm: '73 - 78', hipCm: '99 - 104', lengthCm: '100.3' },
    { size: 'L', waistIn: '32 - 34', hipIn: '42 - 44', lengthIn: '40', waistCm: '81 - 86', hipCm: '106 - 112', lengthCm: '101.6' },
    { size: 'XL', waistIn: '35 - 37', hipIn: '45 - 47', lengthIn: '40.5', waistCm: '89 - 94', hipCm: '114 - 119', lengthCm: '102.8' },
    { size: 'XXL', waistIn: '38 - 40', hipIn: '48 - 50', lengthIn: '41', waistCm: '96 - 101', hipCm: '122 - 127', lengthCm: '104' },
  ]

  const topsData = [
    { size: 'XS', bustIn: '30 - 32', underbustIn: '26 - 27', waistIn: '24 - 26', bustCm: '76 - 81', underbustCm: '66 - 68', waistCm: '61 - 66' },
    { size: 'S', bustIn: '33 - 34', underbustIn: '28 - 29', waistIn: '27 - 28', bustCm: '83 - 86', underbustCm: '71 - 73', waistCm: '68 - 71' },
    { size: 'M', bustIn: '35 - 37', underbustIn: '30 - 32', waistIn: '29 - 31', bustCm: '89 - 94', underbustCm: '76 - 81', waistCm: '73 - 78' },
    { size: 'L', bustIn: '38 - 40', underbustIn: '33 - 35', waistIn: '32 - 34', bustCm: '96 - 101', underbustCm: '84 - 89', waistCm: '81 - 86' },
    { size: 'XL', bustIn: '41 - 43', underbustIn: '36 - 38', waistIn: '35 - 37', bustCm: '104 - 109', underbustCm: '91 - 96', waistCm: '89 - 94' },
    { size: 'XXL', bustIn: '44 - 46', underbustIn: '39 - 41', waistIn: '38 - 40', bustCm: '112 - 117', underbustCm: '99 - 104', waistCm: '96 - 101' },
  ]

  const innerwearData = [
    { size: 'XS', cup: '30A, 30B, 32A', underbustIn: '26 - 27', underbustCm: '66 - 69' },
    { size: 'S', cup: '32B, 32C, 34A', underbustIn: '28 - 29', underbustCm: '71 - 74' },
    { size: 'M', cup: '34B, 34C, 36A', underbustIn: '30 - 32', underbustCm: '76 - 81' },
    { size: 'L', cup: '36B, 36C, 38A', underbustIn: '33 - 35', underbustCm: '84 - 89' },
    { size: 'XL', cup: '38B, 38C, 40B', underbustIn: '36 - 38', underbustCm: '91 - 96' },
    { size: 'XXL', cup: '40C, 40D, 42C', underbustIn: '39 - 41', underbustCm: '99 - 104' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-5">
          <div>
            <span className="bg-black text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">
              AROVIA FIT ACCURACY
            </span>
            <h3 className="text-xl font-black text-gray-900 mt-1">Size & Measurement Guide</h3>
            <p className="text-xs text-gray-500">Engineered with 4-way Italian stretch compression. Fits true to size.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center font-bold text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab & Unit Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => setActiveTab('bottoms')}
              className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'bottoms' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'}`}
            >
              👖 Pants & Leggings
            </button>
            <button
              onClick={() => setActiveTab('tops')}
              className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'tops' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'}`}
            >
              👚 Tops & Tees
            </button>
            <button
              onClick={() => setActiveTab('innerwear')}
              className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'innerwear' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'}`}
            >
              👙 Sports Bras
            </button>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => setUnit('inches')}
              className={`px-3 py-1 rounded-md transition-colors ${unit === 'inches' ? 'bg-black text-white' : 'text-gray-500'}`}
            >
              Inches (in)
            </button>
            <button
              onClick={() => setUnit('cm')}
              className={`px-3 py-1 rounded-md transition-colors ${unit === 'cm' ? 'bg-black text-white' : 'text-gray-500'}`}
            >
              Centimeters (cm)
            </button>
          </div>
        </div>

        {/* Measurements Table */}
        <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-xs mb-6">
          {activeTab === 'bottoms' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Size</th>
                  <th className="p-3">Waist ({unit === 'inches' ? 'in' : 'cm'})</th>
                  <th className="p-3">Hip ({unit === 'inches' ? 'in' : 'cm'})</th>
                  <th className="p-3">Inseam Length</th>
                  <th className="p-3">Standard Fit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {bottomsData.map(row => (
                  <tr key={row.size} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-black">{row.size}</td>
                    <td className="p-3">{unit === 'inches' ? row.waistIn : row.waistCm}</td>
                    <td className="p-3">{unit === 'inches' ? row.hipIn : row.hipCm}</td>
                    <td className="p-3">{unit === 'inches' ? `${row.lengthIn}"` : `${row.lengthCm} cm`}</td>
                    <td className="p-3 text-emerald-700 font-semibold">Comfort 4-Way Stretch</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'tops' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Size</th>
                  <th className="p-3">Bust ({unit === 'inches' ? 'in' : 'cm'})</th>
                  <th className="p-3">Underbust ({unit === 'inches' ? 'in' : 'cm'})</th>
                  <th className="p-3">Waist ({unit === 'inches' ? 'in' : 'cm'})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {topsData.map(row => (
                  <tr key={row.size} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-black">{row.size}</td>
                    <td className="p-3">{unit === 'inches' ? row.bustIn : row.bustCm}</td>
                    <td className="p-3">{unit === 'inches' ? row.underbustIn : row.underbustCm}</td>
                    <td className="p-3">{unit === 'inches' ? row.waistIn : row.waistCm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'innerwear' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Size</th>
                  <th className="p-3">Typical Bra Cup Sizes</th>
                  <th className="p-3">Underbust Band ({unit === 'inches' ? 'in' : 'cm'})</th>
                  <th className="p-3">Support Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {innerwearData.map(row => (
                  <tr key={row.size} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-black">{row.size}</td>
                    <td className="p-3 font-bold text-indigo-700">{row.cup}</td>
                    <td className="p-3">{unit === 'inches' ? row.underbustIn : row.underbustCm}</td>
                    <td className="p-3 text-emerald-700 font-semibold">High Bounce Control</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* How to Measure Guide */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-2">
          <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
            <span>📏</span>
            <span>How to Measure Accurately</span>
          </h4>
          <ul className="text-gray-600 space-y-1 pl-4 list-disc text-[11px] leading-relaxed">
            <li><strong>Waist:</strong> Measure around the narrowest part of your torso (typically 2 inches above the navel).</li>
            <li><strong>Hips:</strong> Measure around the fullest point of your hips and glutes, keeping the tape parallel to the floor.</li>
            <li><strong>Bust:</strong> Measure comfortably over the fullest part of your bust with unpadded sports bra.</li>
            <li><strong>Between Sizes?</strong> We recommend sizing down for high-compression gym sessions, or sizing up for relaxed lounging.</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-black text-white text-xs font-bold px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Got It, Back to Product
          </button>
        </div>
      </div>
    </div>
  )
}
