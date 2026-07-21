import { Browser, BrowserContext, Page } from 'playwright'

let browser: Browser | null = null
let isCDP = false

export async function getPlaywrightPage(): Promise<{ page: Page; cleanup: () => Promise<void> }> {
  const { chromium } = await import('playwright')

  if (browser?.isConnected()) {
    if (isCDP) {
      const ctx = browser.contexts()[0]
      if (ctx) return { page: await ctx.newPage(), cleanup: async () => {} }
      const c = await browser.newContext()
      return { page: await c.newPage(), cleanup: async () => await c.close() }
    }
    const c = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    })
    return { page: await c.newPage(), cleanup: async () => await c.close() }
  }

  try {
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
    if (browser?.isConnected()) {
      isCDP = true
      const ctx = browser.contexts()[0]
      if (ctx) return { page: await ctx.newPage(), cleanup: async () => {} }
    }
  } catch {}

  isCDP = false
  browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'],
  })
  const c = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })
  return { page: await c.newPage(), cleanup: async () => await c.close() }
}
