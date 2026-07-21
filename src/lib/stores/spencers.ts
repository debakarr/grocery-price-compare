import * as cheerio from 'cheerio'
import { ProductResult } from './types'
import { parseUnit, calcPricePerUnit } from './parse-unit'

export async function searchSpencers(query: string, pincode: string): Promise<ProductResult[]> {
  const url = `https://www.spencers.in/search?q=${encodeURIComponent(query)}&pincode=${pincode}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(url, {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`Spencer's returned ${res.status}`)
    const html = await res.text()
    const $ = cheerio.load(html)
    const products: ProductResult[] = []
    const seen = new Set<string>()

    $('a[href*="/product-detail/"]').each((_, el) => {
      const $el = $(el)
      const href = $el.attr('href') || ''
      if (seen.has(href)) return
      seen.add(href)

      const fullUrl = href.startsWith('http') ? href : `https://www.spencers.in${href}`
      const name = $el.find('h3').first().text().trim() || $el.find('h2').first().text().trim()
      if (!name) return

      const allText = $el.text()
      const prices: number[] = []
      const priceMatches = allText.matchAll(/₹\s*([0-9]+(?:\.[0-9]+)?)/g)
      for (const m of priceMatches) {
        prices.push(parseFloat(m[1]))
      }

      let price = 0
      let mrp: number | null = null
      if (prices.length >= 2) { price = prices[0]; mrp = prices[1] }
      else if (prices.length === 1) { price = prices[0] }
      if (!price) return

      const sizeMatch = allText.match(/(\d+(?:\.\d+)?\s*(?:g|kg|ml|l|gm)\b)/i)
      const unitRaw = sizeMatch ? sizeMatch[1].toUpperCase() : ''

      const imgEl = $el.find('img').first()
      const image = imgEl.attr('src') || null

      const brandMatch = name.match(/^(\S+)/)
      const brand = brandMatch ? brandMatch[1] : ''

      const { unitValue, unitType, unit } = parseUnit(unitRaw)

      products.push({
        name,
        price,
        mrp: mrp && mrp > price ? mrp : null,
        unit,
        unitValue,
        unitType,
        pricePerUnit: calcPricePerUnit(price, unitValue),
        image,
        url: fullUrl,
        brand,
        store: 'spencers',
        storeName: "Spencer's",
      })
    })

    return products
  } finally {
    clearTimeout(timeout)
  }
}
