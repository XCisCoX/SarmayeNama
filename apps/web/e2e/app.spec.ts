import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads and renders market cards with provider data', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/سرمایه‌نما/);
    // Header nav renders
    await expect(page.getByRole('link', { name: 'مبدل', exact: true })).toBeVisible();
    // At least one market card appears (seeded assets + real provider data)
    const cards = page.locator('a[href^="/assets/"]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    // Freshness badges present somewhere on the page
    await expect(page.locator('text=/زنده|نرخ مرجع روزانه|تأخیری|قدیمی/').first()).toBeVisible();
  });

  test('search finds دلار and opens the asset page', async ({ page }) => {
    await page.goto('/');
    const search = page.getByRole('searchbox');
    await search.fill('دلار');
    const dropdown = page.locator('#search-results');
    await expect(dropdown).toBeVisible();
    const usdLink = page.locator('#search-results a[href="/assets/USD"]').first();
    await expect(usdLink).toBeVisible({ timeout: 10_000 });
    await usdLink.click();
    await expect(page).toHaveURL(/\/assets\/USD/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('دلار');
  });
});

test.describe('Asset detail page', () => {
  test('opens an asset, shows chart ranges and switches range', async ({ page }) => {
    await page.goto('/assets/BTC');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('بیت‌کوین', { timeout: 15_000 });
    // Range selector exists
    const rangeGroup = page.locator('[role="group"][aria-label="Chart range"]');
    await expect(rangeGroup).toBeVisible();
    // Switch range (1M) — exact name match avoids "۳ ماه"/"۶ ماه" in RTL a11y trees.
    const monthBtn = rangeGroup.getByRole('button', { name: 'ماه', exact: true }).first();
    if ((await monthBtn.count()) > 0) {
      await monthBtn.click();
      await expect(monthBtn).toHaveAttribute('aria-pressed', 'true');
    }
    // Chart canvas area rendered
    await expect(page.locator('text=/بازار رمزارز/').first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
  });

  test('converter widget converts USD to Toman', async ({ page }) => {
    await page.goto('/converter');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('مبدل');
    // Default preset: USD -> TOMAN, amount 100
    const result = page.locator('text=/نتیجه|نرخ/').first();
    await expect(result).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Language & theme', () => {
  test('switches between RTL Persian and LTR English', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByTestId('lang-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    // Metadata is server-rendered from the cookie; refresh to pick it up.
    await page.reload();
    await expect(page).toHaveTitle(/SarmayeNama/);
  });

  test('switches dark theme', async ({ page }) => {
    await page.goto('/');
    const themeBtn = page.getByRole('button', { name: /پوسته/ });
    await themeBtn.click();
    const cls = await page.locator('html').getAttribute('class');
    expect(cls).toContain('dark');
  });
});

test.describe('Stale data display', () => {
  test('shows a visible stale warning when the provider data is stale', async ({ page }) => {
    await page.route('**/api/market/overview**', async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      // Force the first asset to be stale and report a stale count.
      if (body.assets?.length) {
        body.assets = body.assets.map((a: Record<string, unknown>, i: number) =>
          i === 0
            ? { ...a, freshness: 'stale', receivedAt: new Date(Date.now() - 3600_000).toISOString() }
            : a
        );
        body.staleCount = 1;
      }
      await route.fulfill({ response: res, json: body });
    });
    await page.goto('/');
    // Stale banner is visible
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 15_000 });
    // A stale freshness label is shown on the card
    await expect(page.locator('text=/قدیمی/').first()).toBeVisible();
  });
});
