'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import type { SearchResponse, MatchedProduct, ProductResult, StoreName, DeliveryMode } from '@/lib/stores/types'

const STORE_THEME: Record<StoreName, { bg: string; text: string; border: string; light: string; label: string }> = {
  jiomart:       { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-200', light: 'bg-blue-50', label: 'JioMart' },
  flipkart:      { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-200', light: 'bg-amber-50', label: 'Flipkart' },
  spencers:      { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-200', light: 'bg-emerald-50', label: "Spencer's" },
  vishalmegamart: { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-200', light: 'bg-violet-50', label: 'Vishal MM' },
  amazon:        { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-200', light: 'bg-orange-50', label: 'Amazon' },
}

const STORE_ICON: Record<StoreName, string> = {
  jiomart: 'JM',
  flipkart: 'FK',
  spencers: 'SP',
  vishalmegamart: 'VM',
  amazon: 'AZ',
}

function formatPrice(n: number): string {
  return `₹${n.toFixed(2)}`
}

function unitDisplay(product: ProductResult): string {
  if (!product.unitValue || product.unitValue <= 0) return ''
  if (product.unitType === 'count') return formatPrice(product.pricePerUnit) + '/unit'
  const label = product.unitType === 'g' ? '/100g' : '/100ml'
  return formatPrice((product.price / product.unitValue) * 100) + label
}

function PercentBadge({ mrp, price }: { mrp: number; price: number }) {
  if (mrp <= price) return null
  const pct = Math.round(((mrp - price) / mrp) * 100)
  return (
    <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200 leading-none">
      -{pct}%
    </span>
  )
}

function StoreIcon({ store, size = 'sm' }: { store: StoreName; size?: 'sm' | 'md' }) {
  const t = STORE_THEME[store]
  const s = size === 'md' ? 'w-8 h-8 text-[11px]' : 'w-5 h-5 text-[9px]'
  return (
    <div className={`${s} ${t.bg} ${t.text} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {STORE_ICON[store]}
    </div>
  )
}

function ProductRow({ product, rank }: { product: ProductResult; rank: number }) {
  const t = STORE_THEME[product.store]
  const isBest = rank === 0
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all no-underline
        ${isBest ? 'bg-white ring-1 ring-amber-200 ring-offset-1' : 'bg-white hover:ring-1 hover:ring-gray-200'}
      `}
    >
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
        {product.image
          ? <img src={product.image} alt="" className="w-full h-full object-contain" loading="lazy" />
          : <StoreIcon store={product.store} size="md" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate leading-snug">{product.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-gray-400">{product.unit || '—'}</span>
          {product.mrp && product.mrp > product.price && <PercentBadge mrp={product.mrp} price={product.price} />}
        </div>
      </div>
      <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-[11px] text-gray-400 line-through">{formatPrice(product.mrp)}</span>
          )}
        </div>
        {unitDisplay(product) && (
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{unitDisplay(product)}</span>
        )}
      </div>
      <div className={`${t.bg} ${t.text} text-[10px] font-semibold px-2 py-1 rounded-md flex-shrink-0 leading-none`}>
        {t.label}
      </div>
    </a>
  )
}

function ProductGroup({ match }: { match: MatchedProduct }) {
  const sorted = useMemo(
    () => [...match.variants].sort((a, b) => a.price - b.price),
    [match.variants]
  )
  const [expanded, setExpanded] = useState(false)
  const show = expanded ? sorted : sorted.slice(0, 2)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{match.displayName}</h3>
            {match.brand && <p className="text-xs text-gray-400 mt-0.5">{match.brand}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-lg font-bold text-gray-900">{formatPrice(match.minPrice)}</span>
              {match.minPrice !== match.maxPrice && (
                <span className="text-xs text-gray-400">– {formatPrice(match.maxPrice)}</span>
              )}
            </div>
            <p className="text-[10px] text-gray-400">{match.variants.length} store{match.variants.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
      <div className="px-3 py-2 space-y-2">
        {show.map((v, i) => <ProductRow key={`${v.store}-${v.url}`} product={v} rank={i} />)}
      </div>
      {sorted.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-xs font-medium text-gray-400 hover:text-gray-600 py-2 border-t border-gray-100 transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${sorted.length} prices`}
        </button>
      )}
    </div>
  )
}

const SECTION_LABELS: Record<number, { label: string; desc: string }> = {
  0: { label: 'Best Matches', desc: 'Products matching your search' },
  1: { label: 'Related', desc: 'Related categories' },
  2: { label: 'Other', desc: 'Other available products' },
}

function applySort(matched: MatchedProduct[], sort: string): MatchedProduct[] {
  const m = [...matched]
  if (sort === 'price_asc') m.sort((a, b) => a.minPrice - b.minPrice)
  else if (sort === 'price_desc') m.sort((a, b) => b.minPrice - a.minPrice)
  else if (sort === 'unit_price_asc') m.sort((a, b) => a.minPricePerUnit - b.minPricePerUnit)
  else if (sort === 'unit_price_desc') m.sort((a, b) => b.minPricePerUnit - a.minPricePerUnit)
  else if (sort === 'store_count_desc') m.sort((a, b) => b.variants.length - a.variants.length)
  else m.sort((a, b) => a.relevance - b.relevance || a.minPrice - b.minPrice)
  return m
}

const TABS: { key: DeliveryMode; label: string; desc: string; icon: string }[] = [
  { key: 'quick', label: 'Quick Commerce', desc: '30 min delivery', icon: '⚡' },
  { key: 'normal', label: 'Normal Delivery', desc: '1-3 day delivery', icon: '📦' },
]

export default function Home() {
  const [mode, setMode] = useState<DeliveryMode>('quick')
  const [query, setQuery] = useState('')
  const [pincode, setPincode] = useState('734011')
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sort, setSort] = useState('relevance')
  const [visibleCount, setVisibleCount] = useState(10)
  const searchIdRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (m?: DeliveryMode) => {
    const currentMode = m || mode
    if (!query.trim()) return
    const id = ++searchIdRef.current
    setVisibleCount(10)
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&pincode=${pincode}&mode=${currentMode}&sort=${sort}`)
      if (id !== searchIdRef.current) return
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`) }
      const json: SearchResponse = await res.json()
      if (id === searchIdRef.current) setData(json)
    } catch (err) {
      if (id === searchIdRef.current) setError((err as Error).message)
    } finally {
      if (id === searchIdRef.current) setLoading(false)
    }
  }, [query, pincode, sort, mode])

  const handleTabChange = (newMode: DeliveryMode) => {
    setMode(newMode)
    setData(null)
    setError('')
    if (query.trim()) doSearch(newMode)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch()
  }

  const sortedMatches = useMemo(() => {
    if (!data) return []
    return applySort(data.matched, sort)
  }, [data, sort])

  const groupsByRelevance = useMemo(() => {
    if (sort !== 'relevance' || sortedMatches.length === 0) return null
    const sections = []
    for (const r of [0, 1, 2]) {
      const g = sortedMatches.filter(m => m.relevance === r)
      if (g.length) sections.push({ label: SECTION_LABELS[r].label, desc: SECTION_LABELS[r].desc, groups: g })
    }
    return sections
  }, [sortedMatches, sort])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-5 sm:pt-6 pb-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-white text-lg">🛒</div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Price Compare</h1>
            </div>
          </div>

          <div className="flex gap-1 sm:gap-2 mb-4">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="text-[10px] opacity-60">{tab.desc}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === 'quick' ? 'Search groceries...' : 'Search products...'}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border-0 text-sm bg-white/95 backdrop-blur focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
                />
              </div>
              <input
                type="text"
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Pincode"
                className="w-20 sm:w-24 px-2 py-2.5 rounded-xl border-0 text-sm text-center bg-white/95 backdrop-blur focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
              />
            </div>
            <button
              onClick={() => doSearch()}
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              )}
              <span className="hidden sm:inline">{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-5 sm:py-8">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-400 animate-spin"></div>
            </div>
            <p className="text-sm text-slate-400">
              {mode === 'quick' ? 'Searching quick commerce stores...' : 'Searching all stores...'}
            </p>
          </div>
        )}

        {data && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <p className="text-sm text-slate-500">
                Found <strong className="text-slate-700">{sortedMatches.length}</strong> product groups · <strong className="text-slate-700">{data.totalProducts}</strong> items
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 font-medium">Sort</label>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="unit_price_asc">Unit Price: Low → High</option>
                  <option value="unit_price_desc">Unit Price: High → Low</option>
                  <option value="store_count_desc">Most Stores</option>
                </select>
              </div>
            </div>

            {sortedMatches.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-lg text-slate-400">No products found for &quot;{data.query}&quot;</p>
              </div>
            ) : sort === 'relevance' && groupsByRelevance ? (
              (() => {
                let shown = 0
                const rendered = groupsByRelevance.map(s => {
                  const g = s.groups.slice(0, Math.max(0, visibleCount - shown))
                  shown += g.length
                  return { ...s, groups: g }
                }).filter(s => s.groups.length > 0)
                const total = groupsByRelevance.reduce((s, sec) => s + sec.groups.length, 0)
                return (<>{rendered.map(section => (
                  <div key={section.label} className="mb-7">
                    <div className="flex items-baseline gap-3 mb-3">
                      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{section.label}</h2>
                      <span className="text-[10px] text-slate-300">{section.desc}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {section.groups.map((m) => <ProductGroup key={m.matchKey + '-' + m.variants.length} match={m} />)}
                    </div>
                  </div>
                ))}{shown < total && (
                  <button onClick={() => setVisibleCount(c => c + 10)} className="w-full py-3 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white rounded-xl border border-gray-200 hover:border-blue-200 transition-colors shadow-sm">
                    Show {total - shown} more products →
                  </button>
                )}</>)
              })()
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedMatches.slice(0, visibleCount).map((m) => <ProductGroup key={m.matchKey + '-' + m.variants.length} match={m} />)}
                {sortedMatches.length > visibleCount && (
                  <div className="col-span-full">
                    <button onClick={() => setVisibleCount(c => c + 10)} className="w-full py-3 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white rounded-xl border border-gray-200 hover:border-blue-200 transition-colors shadow-sm">
                      Show {sortedMatches.length - visibleCount} more products →
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-1.5 text-[10px]">
              {data.stores.map(s => (
                <span key={s.id} className={`px-2 py-1 rounded-md border ${s.status === 'ok' ? 'border-green-200 text-green-700 bg-green-50' : 'border-red-200 text-red-500 bg-red-50'}`}>
                  {s.status === 'ok' ? '✓' : '✗'} {s.name}
                  {s.error && <span className="opacity-60 ml-1">({s.error.slice(0, 40)})</span>}
                </span>
              ))}
            </div>
          </>
        )}

        {!data && !loading && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-5">🛒</div>
            <p className="text-lg font-medium text-slate-400 mb-1">
              {mode === 'quick' ? 'Compare grocery prices instantly' : 'Search for products across stores'}
            </p>
            <p className="text-sm text-slate-300">
              {mode === 'quick'
                ? 'JioMart Quick · Flipkart Minutes · Spencer\'s Jiffy · Vishal Mega Mart'
                : 'Amazon.in'
              }
            </p>
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-[10px] text-slate-300 border-t border-slate-200/50">
        Grocery Price Compare · {mode === 'quick' ? 'Quick Commerce' : 'Normal Delivery'} · Pincode: {pincode}
      </footer>
    </div>
  )
}
