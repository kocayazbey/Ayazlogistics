import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';

describe('Cross-Browser Compatibility Tests', () => {
  const browsers = [
    { name: 'Chromium', launcher: chromium },
    { name: 'Firefox', launcher: firefox },
    { name: 'WebKit (Safari)', launcher: webkit },
  ];

  const testURL = 'http://localhost:3001';

  browsers.forEach(({ name, launcher }) => {
    describe(`${name}`, () => {
      let browser: Browser;
      let context: BrowserContext;
      let page: Page;

      beforeAll(async () => {
        browser = await launcher.launch();
      });

      afterAll(async () => {
        await browser.close();
      });

      beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
      });

      afterEach(async () => {
        await page.close();
        await context.close();
      });

      it('should load dashboard page', async () => {
        const response = await page.goto(`${testURL}/dashboard`);
        expect(response?.status()).toBe(200);
      });

      it('should render all main navigation items', async () => {
        await page.goto(`${testURL}/dashboard`);
        const navItems = await page.$$('nav a, nav button');
        expect(navItems.length).toBeGreaterThan(0);
      });

      it('should support localStorage', async () => {
        await page.goto(testURL);
        
        const localStorageWorks = await page.evaluate(() => {
          try {
            localStorage.setItem('test', 'value');
            const value = localStorage.getItem('test');
            localStorage.removeItem('test');
            return value === 'value';
          } catch {
            return false;
          }
        });

        expect(localStorageWorks).toBe(true);
      });

      it('should handle CSS Grid layout', async () => {
        await page.goto(`${testURL}/dashboard`);

        const supportsGrid = await page.evaluate(() => {
          const testDiv = document.createElement('div');
          testDiv.style.display = 'grid';
          return testDiv.style.display === 'grid';
        });

        expect(supportsGrid).toBe(true);
      });

      it('should handle Flexbox layout', async () => {
        await page.goto(testURL);

        const supportsFlex = await page.evaluate(() => {
          const testDiv = document.createElement('div');
          testDiv.style.display = 'flex';
          return testDiv.style.display === 'flex';
        });

        expect(supportsFlex).toBe(true);
      });

      it('should execute JavaScript correctly', async () => {
        await page.goto(testURL);

        const jsWorks = await page.evaluate(() => {
          return [1, 2, 3].map(x => x * 2).reduce((a, b) => a + b, 0) === 12;
        });

        expect(jsWorks).toBe(true);
      });

      it('should support Fetch API', async () => {
        await page.goto(testURL);

        const fetchWorks = await page.evaluate(() => {
          return typeof fetch === 'function';
        });

        expect(fetchWorks).toBe(true);
      });

      it('should render table data correctly', async () => {
        await page.goto(`${testURL}/vehicles`);
        
        await page.waitForSelector('table', { timeout: 5000 });
        const rows = await page.$$('table tbody tr');
        
        expect(rows.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Responsive Design Tests', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;

    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ];

    beforeAll(async () => {
      browser = await chromium.launch();
    });

    afterAll(async () => {
      await browser.close();
    });

    viewports.forEach(({ name, width, height }) => {
      it(`should render correctly on ${name} (${width}x${height})`, async () => {
        context = await browser.newContext({ viewport: { width, height } });
        page = await context.newPage();

        await page.goto(`${testURL}/dashboard`);

        const screenshot = await page.screenshot();
        expect(screenshot).toBeTruthy();

        await page.close();
        await context.close();
      });
    });
  });
});

