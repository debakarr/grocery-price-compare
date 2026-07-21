import { ProductResult } from './types'
import { parseUnit, calcPricePerUnit } from './parse-unit'

const IS_VERCEL = process.env.VERCEL === '1'

let browser: import('playwright').Browser | null = null
let isCDP = false

async function getPage() {
  const { chromium } = await import('playwright')

  if (browser?.isConnected()) {
    if (isCDP) {
      const ctx = browser.contexts()[0]
      if (ctx) return await ctx.newPage()
      const c = await browser.newContext()
      return await c.newPage()
    }
    return await (await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    })).newPage()
  }

  try {
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
    if (browser?.isConnected()) {
      isCDP = true
      const ctx = browser.contexts()[0]
      if (ctx) return await ctx.newPage()
    }
  } catch {}

  isCDP = false
  browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'],
  })
  return await (await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })).newPage()
}

export async function searchFlipkart(query: string, _pincode: string): Promise<ProductResult[]> {
  if (IS_VERCEL) throw new Error('Playwright not available on Vercel')
  const page = await getPage()

  try {
    await page.goto('https://www.flipkart.com/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.goto(`https://www.flipkart.com/search?q=${encodeURIComponent(query)}&marketplace=HYPERLOCAL`, {
      waitUntil: 'networkidle', timeout: 30000,
    })
    await page.waitForSelector('a[href*="/p/"]', { timeout: 20000 }).catch(() => {})

    const products = await page.evaluate(() => {
      const results: Array<{ name: string; href: string; price: number; mrp: number | null; unit: string; image: string | null }> = []
      const seen = new Set<string>()
      document.querySelectorAll('a[href*="/p/"]').forEach((el) => {
        const link = el as HTMLAnchorElement
        const href = link.href
        if (seen.has(href) || !href || href === '#') return
        seen.add(href)
        const name = (link.textContent || '').trim()
        if (!name || name.length < 3) return
        const container = link.closest('[class*="product"], [class*="Product"], div[class]')
        const text = container?.textContent || link.parentElement?.textContent || link.textContent || ''
        const prices: number[] = []
        for (const m of text.matchAll(/₹\s*([0-9,]+\.?[0-9]*)/g)) prices.push(parseFloat(m[1].replace(/,/g, '')))
        let price = 0, mrp: number | null = null
        if (prices.length >= 2) { mrp = prices[0]; price = prices[1] }
        else if (prices.length === 1) { price = prices[0] }
        if (!price) return
        const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:g|kg|ml|l|gm|units?|pcs)\b/i)
        const unit = sizeMatch ? sizeMatch[0].toUpperCase() : ''
        const img = link.querySelector('img') as HTMLImageElement | null
        results.push({ name, href, price, mrp, unit, image: img?.src || null })
      })
      return results
    })

    return products.map((p): ProductResult => {
      const { unitValue, unitType, unit } = parseUnit(p.unit)
      return {
        name: p.name, price: p.price, mrp: p.mrp && p.mrp > p.price ? p.mrp : null,
        unit, unitValue, unitType, pricePerUnit: calcPricePerUnit(p.price, unitValue),
        image: p.image, url: p.href, brand: '', store: 'flipkart', storeName: 'Flipkart',
      }
    })
  } finally {
    if (!isCDP) await page.context().close()
  }
}
