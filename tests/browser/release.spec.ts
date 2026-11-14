import { test, expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const TODAY = '2026-11-14'
const KEY = 'prime-suspects:v2:daily:v2:2026-11-14'

test.beforeEach(async ({ page, context }) => {
  await page.clock.install({ time: new Date(`${TODAY}T12:00:00Z`) })
  await page.clock.setFixedTime(new Date(`${TODAY}T12:00:00Z`))
  await context.addInitScript(() => Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => {
    const count = Number(sessionStorage.getItem('qa-run-counter') ?? 0) + 1
    sessionStorage.setItem('qa-run-counter', String(count))
    return `00000000-0000-4000-8000-${String(count).padStart(12, '0')}`
  } }))
  await context.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})

async function enterBoard(page: Page, practice = false) {
  await page.getByRole('button', { name: practice ? 'Play endless practice' : "Skip to today's case", exact: true }).click()
  await page.getByRole('button', { name: 'Use a starter kit', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Assemble your kit' })).toBeVisible()
  await page.getByRole('button', { name: 'Start the case', exact: true }).click()
}

async function accuse(page: Page, key = KEY, win = true) {
  const guess = await page.evaluate(({ key, win }) => {
    const run = JSON.parse(localStorage.getItem(key)!)
    return win ? run.caseFile.culprit : run.caseFile.lineup.find((number: number) => number !== run.caseFile.culprit && !run.crossedOff.includes(number))
  }, { key, win })
  await page.getByRole('button', { name: `Suspect number ${guess}`, exact: true }).click()
  await page.getByRole('button', { name: `ACCUSE ${guess}`, exact: true }).click()
  await expect(page.getByRole('heading', { name: /You followed|Every case/ })).toBeVisible()
}

async function noOverflow(page: Page) {
  const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, outside: [...document.querySelectorAll('body *')].filter((element) => { const rect = element.getBoundingClientRect(); return rect.right > innerWidth + 1 || rect.left < -1 }).map((element) => ({ name: element.className, right: element.getBoundingClientRect().right, left: element.getBoundingClientRect().left })) }))
  if (layout.scroll > layout.width) await page.screenshot({ path: test.info().outputPath('overflow.png'), fullPage: true })
  expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width)
}

test('tutorial completion, skip, replay and official attempt isolation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Learn in one case' }).click()
  await page.getByRole('button', { name: 'Ask: is it even?' }).click()
  await expect(page.getByRole('button', { name: '15, eliminated' })).toBeDisabled()
  await page.getByRole('button', { name: 'Ask: divisible by three?' }).click()
  await page.getByRole('button', { name: '22, still a suspect' }).click()
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull()
  await page.getByRole('button', { name: 'Continue to your case' }).click()
  await page.getByRole('button', { name: 'How to play', exact: true }).click()
  await page.getByRole('button', { name: 'Skip tutorial', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Assemble your kit' })).toBeVisible()
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).result, KEY)).toBeNull()
})

test('draft/board reload, official result reopening and isolated practice', async ({ page }) => {
  await page.goto('/'); await enterBoard(page)
  await page.reload()
  await expect(page.locator('.lineup .suspect')).toHaveCount(12)
  await accuse(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'You followed the evidence.' })).toBeVisible()
  const original = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).result, KEY)
  await page.getByRole('button', { name: 'Practice this case', exact: true }).click()
  await page.getByRole('button', { name: 'Use a starter kit', exact: true }).click()
  await page.getByRole('button', { name: 'Start the case', exact: true }).click()
  await accuse(page, 'prime-suspects:v2:practice', false)
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).result, KEY)).toEqual(original)
})

test('links preserve source through onboarding, past practice, invalid explanation', async ({ page }) => {
  await page.goto('/?daily=2026-11-13&v=2&utm_source=player_share&utm_medium=result&secret=ignored')
  await page.getByRole('button', { name: 'Learn in one case' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Learn in one case' }).click()
  await page.getByRole('button', { name: 'Skip tutorial' }).click()
  await expect(page.locator('.draft .eyebrow')).toHaveText('Practice · 2026-11-13')
  await page.getByRole('button', { name: 'Use a starter kit', exact: true }).click()
  await page.getByRole('button', { name: 'Start the case', exact: true }).click()
  await accuse(page, 'prime-suspects:v2:practice')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('prime-suspects:v2:practice')!).markers.shared)).toBe(true)
  await page.goto('/?daily=2026-11-30&v=2')
  await expect(page.getByRole('heading', { name: 'This case link cannot be opened' })).toBeVisible()
  await page.getByRole('button', { name: 'Play today’s case', exact: true }).click()
  await expect(page.locator('.draft .eyebrow')).toContainText('2026-11-14')
})

test('clipboard denial displays selectable text; native cancellation never copies', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('cancel', 'AbortError') } })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied') } } })
  })
  await page.goto('/'); await enterBoard(page); await accuse(page)
  await page.getByRole('button', { name: 'Share challenge', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Share cancelled. Nothing was copied.')
  await expect(page.getByRole('textbox')).toHaveCount(0)
  await page.getByRole('button', { name: 'Copy result', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Invitation text' })).toHaveValue(/daily=2026-11-14&v=2&utm_source=player_share/)
})

test('denied storage still permits tutorial, sound control and a real result', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError') } }))
  await page.goto('/')
  await expect(page.getByRole('status')).toContainText('Session-only play')
  await page.getByRole('button', { name: 'Turn sound on' }).click()
  await page.getByRole('button', { name: 'Turn sound off' }).click()
  await enterBoard(page)
  await page.locator('.lineup button').first().click()
  await page.getByRole('button', { name: /^ACCUSE / }).click()
  await expect(page.locator('.verdict')).toBeVisible()
})

test('same-origin tabs serialize finalization and reconcile to one official result', async ({ page, context }) => {
  await context.addInitScript(() => {
    const controls = window as unknown as { releaseFinalization: () => void; acquiredFinalization: boolean }
    let allowed = false
    let release: (() => void) | undefined
    controls.releaseFinalization = () => { allowed = true; release?.() }
    const request = navigator.locks.request.bind(navigator.locks)
    navigator.locks.request = ((name: string, callback: (lock: Lock) => void) => request(name, async (lock) => {
      controls.acquiredFinalization = true
      if (!allowed) await new Promise<void>((resolve) => { release = resolve })
      return callback(lock)
    })) as typeof navigator.locks.request
  })
  await page.goto('/'); await enterBoard(page)
  const second = await context.newPage()
  await second.clock.install({ time: new Date(`${TODAY}T12:00:00Z`) })
  await second.goto('/')
  const lineup = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).caseFile, KEY)
  const wrong = lineup.lineup.find((number: number) => number !== lineup.culprit)
  await page.getByRole('button', { name: `Suspect number ${lineup.culprit}`, exact: true }).click()
  await second.getByRole('button', { name: `Suspect number ${wrong}`, exact: true }).click()
  await Promise.all([
    page.getByRole('button', { name: `ACCUSE ${lineup.culprit}`, exact: true }).click(),
    second.getByRole('button', { name: `ACCUSE ${wrong}`, exact: true }).click(),
  ])
  await expect.poll(async () => (await Promise.all([page, second].map((tab) => tab.evaluate(() => !!(window as unknown as { acquiredFinalization: boolean }).acquiredFinalization)))).filter(Boolean).length).toBe(1)
  const firstOwnsLock = await page.evaluate(() => (window as unknown as { acquiredFinalization: boolean }).acquiredFinalization)
  if (!firstOwnsLock) expect(await second.evaluate(() => (window as unknown as { acquiredFinalization: boolean }).acquiredFinalization)).toBe(true)
  await Promise.all([page, second].map((tab) => tab.evaluate(() => (window as unknown as { releaseFinalization: () => void }).releaseFinalization())))
  await expect(page.locator('.verdict')).toBeVisible()
  await expect(second.locator('.verdict')).toBeVisible()
  await expect(page.locator('.verdict__stamp')).toHaveText(firstOwnsLock ? 'CASE CLOSED' : 'CASE MISSED')
  await expect(second.locator('.verdict__stamp')).toHaveText(firstOwnsLock ? 'CASE CLOSED' : 'CASE MISSED')
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('prime-suspects:v2:daily:')).length)).toBe(1)
})

test('keyboard cards, accusation focus trap, escape and reduced motion', async ({ page }) => {
  await page.goto('/'); await enterBoard(page)
  const first = page.locator('.lineup button').first()
  await first.focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(first).toBeFocused()
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
})

test('midnight never interrupts the starting case or credits it to the new day', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-14T23:59:59Z'))
  await page.goto('/'); await enterBoard(page)
  await page.clock.setFixedTime(new Date('2026-11-15T00:00:01Z'))
  await expect(page.locator('.lineup .suspect')).toHaveCount(12)
  await accuse(page)
  await expect(page.locator('.verdict .eyebrow')).toContainText('2026-11-14')
  await page.getByRole('button', { name: 'Open today’s case' }).click()
  await expect(page.locator('.draft .eyebrow')).toContainText('2026-11-15')
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).result.win, KEY)).toBe(true)
})

test('unlocked tabs reconcile a simulated simultaneous last-valid result without double counting', async ({ page, context }) => {
  await context.addInitScript(() => Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined }))
  await page.goto('/'); await enterBoard(page)
  const second = await context.newPage()
  await second.clock.install({ time: new Date(`${TODAY}T12:00:00Z`) })
  await second.goto('/')
  await accuse(page)
  await expect(second.locator('.verdict')).toBeVisible()
  await second.evaluate((key) => {
    const record = JSON.parse(localStorage.getItem(key)!)
    record.accusation = record.caseFile.lineup.find((number: number) => number !== record.caseFile.culprit)
    record.result = { ...record.result, guess: record.accusation, win: false }
    localStorage.setItem(key, JSON.stringify(record))
  }, KEY)
  await expect(page.locator('.verdict__stamp')).toHaveText('CASE MISSED')
  await second.reload()
  await expect(second.locator('.verdict__stamp')).toHaveText('CASE MISSED')
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('prime-suspects:v2:daily:')).length)).toBe(1)
})

test('default-off collection issues no analytics requests; successful copy markers persist', async ({ page }) => {
  const analytics: string[] = []
  page.on('request', (request) => { if (request.url().includes('_vercel') || new URL(request.url()).hostname !== '127.0.0.1') analytics.push(request.url()) })
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => undefined } }))
  await page.goto('/'); await enterBoard(page); await accuse(page)
  await page.getByRole('button', { name: 'Copy result', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Copied.')
  await page.reload()
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).markers, KEY)).toMatchObject({ intent: true, success: true })
  expect(analytics).toEqual([])
})

for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1440, 900]]) {
  test(`layout and practice evidence ${width}x${height}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height })
    await page.goto('/'); await noOverflow(page)
    await page.getByRole('button', { name: 'Learn in one case' }).click()
    await noOverflow(page)
    await page.getByRole('button', { name: 'Ask: is it even?' }).click()
    await page.getByRole('button', { name: 'Ask: divisible by three?' }).click()
    await page.getByRole('button', { name: '22, still a suspect' }).click()
    await noOverflow(page)
    await mkdir('docs/assets', { recursive: true })
    await page.screenshot({ path: `docs/assets/tutorial-${width}x${height}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Continue to your case' }).click()
    await page.getByRole('button', { name: '← Lobby', exact: true }).click()
    await page.getByRole('button', { name: 'Play endless practice', exact: true }).click()
    await page.getByRole('button', { name: 'Use a starter kit', exact: true }).click()
    await noOverflow(page)
    const rows = await page.locator('.slot').evaluateAll((slots) => new Set(slots.map((slot) => Math.round(slot.getBoundingClientRect().top))).size)
    expect(rows).toBe(1)
    await mkdir('docs/assets', { recursive: true })
    await page.screenshot({ path: `docs/assets/draft-${width}x${height}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Start the case', exact: true }).click()
    await noOverflow(page)
    await page.locator('.hand__cards .probe:not(:disabled)').first().click()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `docs/assets/viewport-${width}x${height}.png` })
    await page.screenshot({ path: `docs/assets/gameplay-${width}x${height}.png`, fullPage: true })
    const covered = await page.locator('.hand__cards .probe:not(:disabled)').evaluateAll((buttons) => buttons.some((button) => {
      const rect = button.getBoundingClientRect()
      if (rect.bottom > innerHeight || rect.top < 0) return false
      return !button.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2))
    }))
    expect(covered).toBe(false)
    await accuse(page, 'prime-suspects:v2:practice')
    await noOverflow(page)
    await page.screenshot({ path: `docs/assets/result-${width}x${height}.png`, fullPage: true })
    expect(errors).toEqual([])
  })
}

test('root and nested static play work with all external requests blocked', async ({ page }) => {
  for (const prefix of ['/', '/nested/']) {
    await page.goto(prefix)
    await page.getByRole('button', { name: 'Play endless practice', exact: true }).click()
    await page.getByRole('button', { name: 'Use a starter kit', exact: true }).click()
    await page.getByRole('button', { name: 'Start the case', exact: true }).click()
    await accuse(page, 'prime-suspects:v2:practice')
    const response = await page.request.get(`${prefix}social-preview.png`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('image/png')
    await page.getByRole('link', { name: 'Privacy', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Privacy', exact: true })).toBeVisible()
    await page.getByRole('link', { name: '← Play', exact: true }).click()
    await page.getByRole('button', { name: 'Lobby', exact: true }).click()
  }
})
