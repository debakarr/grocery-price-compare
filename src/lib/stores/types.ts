export type StoreName = 'jiomart' | 'flipkart' | 'spencers' | 'vishalmegamart'

export interface ProductResult {
  name: string
  price: number
  mrp: number | null
  unit: string
  unitValue: number | null
  unitType: 'g' | 'ml' | 'count'
  pricePerUnit: number
  image: string | null
  url: string
  brand: string
  store: StoreName
  storeName: string
}

export interface MatchedProduct {
  matchKey: string
  displayName: string
  brand: string
  variants: ProductResult[]
  minPrice: number
  maxPrice: number
  minPricePerUnit: number
  relevance: number
}

export interface SearchResponse {
  query: string
  pincode: string
  matched: MatchedProduct[]
  totalProducts: number
  stores: { id: StoreName; name: string; status: 'ok' | 'error'; error?: string }[]
}
