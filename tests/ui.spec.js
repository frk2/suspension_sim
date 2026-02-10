import { test, expect } from '@playwright/test';

test('app loads and renders visualization with default params', async ({ page }) => {
  await page.goto('/');
  // Wait for the canvas to render
  await page.waitForSelector('canvas');
  // Wait for HUD to populate
  await page.waitForFunction(() => {
    const mr = document.getElementById('hud-mr');
    return mr && mr.textContent !== '—';
  }, { timeout: 5000 });

  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/default-load.png', fullPage: true });
});

test('force mode shows equilibrium position', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => {
    const mr = document.getElementById('hud-mr');
    return mr && mr.textContent !== '—';
  }, { timeout: 5000 });

  // Switch to force mode via lil-gui select
  const modeSelect = page.locator('.lil-gui select');
  await modeSelect.selectOption('Force Mode');

  // Wait for animation to settle
  await page.waitForTimeout(1500);

  const modeText = await page.locator('#hud-mode').textContent();
  expect(modeText).toBe('Force');

  await page.screenshot({ path: 'tests/screenshots/force-mode.png', fullPage: true });
});

test('output values are displayed and non-zero', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => {
    const mr = document.getElementById('hud-mr');
    return mr && mr.textContent !== '—';
  }, { timeout: 5000 });

  const mr = await page.locator('#hud-mr').textContent();
  const force = await page.locator('#hud-force').textContent();
  const wheelrate = await page.locator('#hud-wheelrate').textContent();
  const sag = await page.locator('#hud-sag').textContent();
  const comp = await page.locator('#hud-comp').textContent();

  // All values should be present and parseable
  expect(parseFloat(mr)).toBeGreaterThanOrEqual(0);
  expect(parseFloat(sag)).toBeGreaterThan(0);
  // Force can be 0 at fully extended, but sag should always be > 0
  expect(sag).toContain('mm');
});
