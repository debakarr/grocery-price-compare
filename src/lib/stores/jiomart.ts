import { ProductResult } from './types'
import { parseUnit, calcPricePerUnit } from './parse-unit'

interface JioMartProduct {
  name: string
  slug: string
  brand: { name: string }
  price: { effective: { min: number; max: number }; marked: { min: number; max: number } }
  medias: { url: string }[]
  sizes: string[]
  attributes?: { 'product-size'?: string }
}

function getStoreIds(pincode: string): string {
  const storeMap: Record<string, string> = {
    '734011': '218302||3882||14355||3682||3195',
  }
  return storeMap[pincode] || '218302||3882||14355||3682||3195'
}

export async function searchJioMart(query: string, pincode: string): Promise<ProductResult[]> {
  const storeIds = getStoreIds(pincode)
  const f = encodeURIComponent(`journey:quickcommerce:::store_ids:${storeIds}::searchType:global`)
  const url = `https://www.jiomart.com/ext/vertex/application/api/v1.0/products?q=${encodeURIComponent(query)}&f=${f}&page_size=20&page_id=*`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-location-detail': JSON.stringify({ pincode, country: 'INDIA', country_iso_code: 'IN' }),
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`JioMart API returned ${res.status}`)

    const data = await res.json()
    const items = data?.items?.filter((i: { type: string }) => i.type === 'product') ?? []

    return items
      .map((item: Record<string, unknown>): ProductResult | null => {
        const p = item as unknown as JioMartProduct
        const size = p.sizes?.[0] ?? p.attributes?.['product-size'] ?? ''
        const { unitValue, unitType, unit } = parseUnit(size)
        const price = p.price?.effective?.min ?? 0
        if (!price) return null
        const mrp = p.price?.marked?.min ?? null

        return {
          name: p.name,
          price,
          mrp: mrp && mrp > price ? mrp : null,
          unit,
          unitValue,
          unitType,
          pricePerUnit: calcPricePerUnit(price, unitValue),
          image: p.medias?.[0]?.url ?? null,
          url: `https://www.jiomart.com/product/${p.slug}`,
          brand: p.brand?.name ?? '',
          store: 'jiomart',
          storeName: 'JioMart',
        }
      })
      .filter((p: ProductResult | null): p is ProductResult => p !== null)
  } finally {
    clearTimeout(timeout)
  }
}
