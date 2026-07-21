import * as cheerio from 'cheerio'
import { ProductResult } from './types'
import { parseUnit, calcPricePerUnit } from './parse-unit'

export async function searchVishalMegaMart(query: string, _pincode: string): Promise<ProductResult[]> {
  const url = `https://www.vishalmegamart.com/en-in/search?q=${encodeURIComponent(query)}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`Vishal Mega Mart returned ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)
    const products: ProductResult[] = []
    const seen = new Set<string>()

    $('a[href*=".html"]').each((_, el) => {
      const $el = $(el)
      const href = $el.attr('href') || ''
      if (seen.has(href)) return
      seen.add(href)

      const $parent = $el.closest('[class*="product"], li, div')
      if (!$parent.length) return

      const name = $el.text().trim()
      if (!name || name.length < 3) return

      const fullUrl = href.startsWith('http') ? href : `https://www.vishalmegamart.com${href}`

      const priceText = $parent.find('[class*="price"]').first().text().trim()
      const priceMatch = priceText.match(/₹\s*([0-9]+(?:\.[0-9]+)?)/)
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0
      if (!price) return

      const mrpText = $parent.find('del, s, [class*="strike"], [class*="old"]').first().text().trim()
      const mrpMatch = mrpText.match(/₹\s*([0-9]+(?:\.[0-9]+)?)/)
      const mrp = mrpMatch ? parseFloat(mrpMatch[1]) : null

      const unitRaw = $parent.find('[class*="size"], [class*="unit"], [class*="weight"]').first().text().trim()
      const imgEl = $parent.find('img').first()
      const image = imgEl.attr('src') || null

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
        brand: '',
        store: 'vishalmegamart',
        storeName: 'Vishal Mega Mart',
      })
    })

    return products
  } finally {
    clearTimeout(timeout)
  }
}
