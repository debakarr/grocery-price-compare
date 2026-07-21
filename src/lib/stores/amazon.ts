import { ProductResult } from './types'
import { parseUnit, calcPricePerUnit } from './parse-unit'
import { getPlaywrightPage } from './playwright'

const IS_VERCEL = process.env.VERCEL === '1'

export async function searchAmazon(query: string, _pincode: string): Promise<ProductResult[]> {
  if (IS_VERCEL) throw new Error('Playwright not available on Vercel')

  const { page, cleanup } = await getPlaywrightPage()

  try {
    await page.goto(`https://www.amazon.in/s?k=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    await page.waitForSelector('div[data-asin]', { timeout: 15000 }).catch(() => {})

    const products = await page.evaluate(() => {
      const results: Array<{ name: string; href: string; price: number; mrp: number | null; unit: string; image: string | null }> = []
      const seen = new Set<string>()

      document.querySelectorAll('div[data-asin]').forEach((el) => {
        const asin = el.getAttribute('data-asin') || ''
        if (!asin || seen.has(asin)) return
        seen.add(asin)

        const nameEl = el.querySelector('h2 a, h2 span, [class*="product-title"], a[href*="/dp/"], a[href*="/gp/"]')
        const name = nameEl?.textContent?.trim() || ''
        if (!name || name.length < 3) return

        const linkEl = el.querySelector('a[href*="/dp/"], a[href*="/gp/aw/d/"], h2 a')
        let href = linkEl?.getAttribute('href') || ''
        if (href && !href.startsWith('http')) href = 'https://www.amazon.in' + href
        const cleanHref = href.split('?')[0]

        const priceEl = el.querySelector('.a-price .a-offscreen, .a-price-whole')
        const priceText = priceEl?.textContent?.trim() || ''
        const pm = priceText.match(/[\d,]+(?:\.\d+)?/)
        const price = pm ? parseFloat(pm[0].replace(/,/g, '')) : 0
        if (!price) return

        const mrpEl = el.querySelector('.a-price.a-text-price .a-offscreen, [class*="a-text-price"] .a-offscreen')
        const mrpText = mrpEl?.textContent?.trim() || ''
        const mpm = mrpText.match(/[\d,]+(?:\.\d+)?/)
        const mrp = mpm ? parseFloat(mpm[0].replace(/,/g, '')) : null

        const text = el.textContent || ''
        const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:g|kg|ml|l|gm|count|pack|pieces?)\b/i)
        const unit = sizeMatch ? sizeMatch[0].toUpperCase() : ''

        const imgEl = el.querySelector('img.s-image, img[alt]')
        const image = imgEl?.getAttribute('src') || null

        results.push({ name, href: cleanHref, price, mrp, unit, image })
      })
      return results
    })

    return products.map((p): ProductResult => {
      const { unitValue, unitType, unit } = parseUnit(p.unit)
      return {
        name: p.name, price: p.price, mrp: p.mrp && p.mrp > p.price ? p.mrp : null,
        unit, unitValue, unitType, pricePerUnit: calcPricePerUnit(p.price, unitValue),
        image: p.image, url: p.href, brand: '', store: 'amazon', storeName: 'Amazon',
      }
    })
  } finally {
    await cleanup()
  }
}
