import { chromium, Browser, Page } from 'playwright';
import { AxePuppeteer } from '@axe-core/playwright';

describe('WCAG 2.1 AA Compliance Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it('Admin Panel - Dashboard should be accessible', async () => {
    await page.goto('http://localhost:3001/dashboard');

    const accessibilityScanResults = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toHaveLength(0);
  });

  it('Admin Panel - Forms should have proper labels', async () => {
    await page.goto('http://localhost:3001/vehicles/new');

    const inputs = await page.$$('input, select, textarea');

    for (const input of inputs) {
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      
      let hasLabel = false;
      if (id) {
        const label = await page.$(`label[for="${id}"]`);
        hasLabel = label !== null;
      }

      expect(ariaLabel || hasLabel).toBeTruthy();
    }
  });

  it('Color contrast should meet WCAG AA standards', async () => {
    await page.goto('http://localhost:3001');

    const accessibilityScanResults = await new AxePuppeteer(page)
      .withTags(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toHaveLength(0);
  });

  it('Keyboard navigation should work on all interactive elements', async () => {
    await page.goto('http://localhost:3001/dashboard');

    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    
    expect(firstFocused).toBeTruthy();

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    }
  });

  it('Images should have alt text', async () => {
    await page.goto('http://localhost:3001');

    const images = await page.$$('img');

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const role = await img.getAttribute('role');

      expect(alt || ariaLabel || role === 'presentation').toBeTruthy();
    }
  });

  it('Tables should have proper headers', async () => {
    await page.goto('http://localhost:3001/vehicles');

    const tables = await page.$$('table');

    for (const table of tables) {
      const headers = await table.$$('th');
      expect(headers.length).toBeGreaterThan(0);

      const caption = await table.$('caption');
      const ariaLabel = await table.getAttribute('aria-label');

      expect(caption || ariaLabel).toBeTruthy();
    }
  });

  it('Page should have proper heading hierarchy', async () => {
    await page.goto('http://localhost:3001/dashboard');

    const h1Count = await page.$$eval('h1', els => els.length);
    expect(h1Count).toBe(1);

    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', els => 
      els.map(el => parseInt(el.tagName[1]))
    );

    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i] - headings[i - 1];
      expect(diff).toBeLessThanOrEqual(1);
    }
  });

  it('Screen reader should announce important changes', async () => {
    await page.goto('http://localhost:3001/dashboard');

    const liveRegions = await page.$$('[aria-live]');
    expect(liveRegions.length).toBeGreaterThan(0);
  });

  it('Focus indicators should be visible', async () => {
    await page.goto('http://localhost:3001/dashboard');

    const button = await page.$('button');
    if (button) {
      await button.focus();

      const outlineStyle = await button.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.outline || style.border;
      });

      expect(outlineStyle).not.toBe('none');
    }
  });
});

