import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(await readFile(new URL('./social-preview.html', import.meta.url), 'utf8'))
  await page.screenshot({ path: 'public/social-preview.png' })
  console.log('Created public/social-preview.png (1200×630, no puzzle solution).')
} finally { await browser.close() }
