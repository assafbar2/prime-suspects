import { test, expect } from '@playwright/test'

for (const basePath of ['/', '/nested/']) {
  test(`startup stays brief while assets load at ${basePath}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    let releaseAssets!: () => void
    const assetsReady = new Promise<void>((resolve) => { releaseAssets = resolve })
    await page.route('**/assets/*', async (route) => {
      if (route.request().resourceType() === 'script') await assetsReady
      await route.continue()
    })

    try {
      await page.goto(basePath, { waitUntil: 'commit' })
      const fallback = page.locator('.boot-fallback')
      await expect(fallback).toBeVisible()
      await expect(fallback.getByRole('heading', { name: 'Prime Suspects' })).toBeVisible()
      await expect(fallback.getByRole('status')).toHaveText('Opening the case…')
      await expect(fallback).toHaveText('PRIME SUSPECTS Opening the case…', { useInnerText: true })
      await expect(fallback.getByRole('link')).toHaveCount(0)
      const layout = await page.evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      }))
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width)
      expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height)
      await page.screenshot({ path: test.info().outputPath('loading.png') })
    } finally {
      releaseAssets()
    }

    await expect(page.getByRole('button', { name: 'Learn in one case', exact: true })).toBeVisible()
    await expect(page.locator('.boot-fallback')).toHaveCount(0)
    await page.getByRole('button', { name: 'How to play', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Ask: is it even?', exact: true })).toBeVisible()
  })
}

test.describe('startup without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  for (const basePath of ['/', '/nested/']) {
    test(`startup provides an explanation and working About link at ${basePath}`, async ({ page }) => {
      await page.goto(basePath)
      await expect(page.getByRole('heading', { name: 'Prime Suspects' })).toBeVisible()
      await expect(page.getByRole('status')).toBeHidden()
      await expect(page.getByText('Enable JavaScript to play Prime Suspects.', { exact: true })).toBeVisible()
      await page.getByRole('link', { name: 'About the game', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${basePath}about/$`))
      await expect(page.getByRole('heading', { name: 'How a case plays', exact: true })).toBeVisible()
    })
  }
})
