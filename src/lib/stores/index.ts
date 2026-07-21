import { getCached, setCache } from '@/lib/cache'
import { DeliveryMode, MatchedProduct, ProductResult, SearchResponse, StoreName } from './types'
import { searchJioMart } from './jiomart'
import { searchVishalMegaMart } from './vishalmegamart'
import { searchSpencers } from './spencers'
import { searchFlipkart } from './flipkart'
import { searchAmazon } from './amazon'

const STORE_GROUPS: Record<DeliveryMode, { id: StoreName; name: string; search: (q: string, p: string) => Promise<ProductResult[]> }[]> = {
  quick: [
    { id: 'jiomart', name: 'JioMart', search: searchJioMart },
    { id: 'flipkart', name: 'Flipkart', search: searchFlipkart },
    { id: 'spencers', name: "Spencer's", search: searchSpencers },
    { id: 'vishalmegamart', name: 'Vishal Mega Mart', search: searchVishalMegaMart },
  ],
  normal: [
    { id: 'amazon', name: 'Amazon', search: searchAmazon },
  ],
}

function stripSize(name: string): string {
  return name
    .replace(/\d+(?:\.\d+)?\s*(kg|kilogram|litre|liter|ltr|gm|gram|ml|g|l)\b/gi, '')
    .replace(/\(\s*pack\s*(of\s*)?\d*\s*\)/gi, '')
    .replace(/\d+\s*x\s*\d+/gi, '')
    .replace(/\d+\s*(pcs|pieces|units?)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeMatchKey(name: string, brand: string): string {
  const core = stripSize(name.toLowerCase())
  const brandClean = brand.toLowerCase().trim()
  const words = core.split(' ').filter(w => w.length > 1)
  const keyWords = words.slice(0, 5)
  if (brandClean) keyWords.push(brandClean)
  return keyWords.sort().join(' ')
}

function computeRelevance(name: string, query: string): number {
  const lower = name.toLowerCase()
  const q = query.toLowerCase().trim()
  const qWords = q.split(/\s+/)
  if (qWords.some(w => new RegExp(`\\b${w}\\b`).test(lower))) return 0
  if (qWords.some(w => lower.includes(w))) return 1
  return 2
}

export async function searchAllStores(query: string, pincode: string, mode: DeliveryMode = 'quick'): Promise<SearchResponse> {
  const cacheKey = `search:${mode}:${query.toLowerCase().trim()}:${pincode}`
  const cached = getCached<SearchResponse>(cacheKey)
  if (cached) return cached

  const stores = STORE_GROUPS[mode]
  const allResults: ProductResult[] = []

  const results = await Promise.allSettled(
    stores.map(async (store) => {
      const products = await store.search(query, pincode)
      return { id: store.id, name: store.name, products }
    })
  )

  const storeStatuses: SearchResponse['stores'] = []
  for (let i = 0; i < stores.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled') {
      allResults.push(...r.value.products)
      storeStatuses.push({ id: r.value.id, name: r.value.name, status: 'ok' })
    } else {
      storeStatuses.push({ id: stores[i].id, name: stores[i].name, status: 'error', error: (r.reason as Error)?.message?.slice(0, 80) })
    }
  }

  const groups = new Map<string, ProductResult[]>()
  for (const p of allResults) {
    const key = normalizeMatchKey(p.name, p.brand)
    const existing = groups.get(key) || []
    existing.push(p)
    groups.set(key, existing)
  }

  const matched: MatchedProduct[] = []
  for (const [, variants] of groups) {
    const best = variants.reduce((a, b) => a.name.length <= b.name.length ? a : b)
    matched.push({
      matchKey: normalizeMatchKey(best.name, best.brand),
      displayName: best.name,
      brand: best.brand,
      variants,
      minPrice: Math.min(...variants.map(v => v.price)),
      maxPrice: Math.max(...variants.map(v => v.price)),
      minPricePerUnit: Math.min(...variants.filter(v => v.unitValue && v.unitValue > 0).map(v => v.pricePerUnit)),
      relevance: Math.min(...variants.map(v => computeRelevance(v.name, query))),
    })
  }

  matched.sort((a, b) => a.relevance - b.relevance || a.minPrice - b.minPrice)

  const response: SearchResponse = {
    query,
    pincode,
    mode,
    matched,
    totalProducts: allResults.length,
    stores: storeStatuses,
  }

  setCache(cacheKey, response, 120)
  return response
}
