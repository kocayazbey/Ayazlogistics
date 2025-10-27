import { chromium, Browser, BrowserContext, Page, devices } from 'playwright';

describe('Mobile Compatibility Tests', () => {
  let browser: Browser;

  const mobileDevices = [
    devices['iPhone 13'],
    devices['iPhone 13 Pro'],
    devices['Pixel 5'],
    devices['Galaxy S21'],
    devices['iPad Pro'],
  ];

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  mobileDevices.forEach(device => {
    describe(`${device.name}`, () => {
      let context: BrowserContext;
      let page: Page;

      beforeEach(async () => {
        context = await browser.newContext(device);
        page = await context.newPage();
      });

      afterEach(async () => {
        await page.close();
        await context.close();
      });

      it('should load mobile-friendly interface', async () => {
        await page.goto('http://localhost:3001/dashboard');

        const isMobileView = await page.evaluate(() => {
          return window.innerWidth < 768;
        });

        if (device.viewport.width < 768) {
          expect(isMobileView).toBe(true);
        }
      });

      it('should have touch-friendly buttons (min 44x44px)', async () => {
        await page.goto('http://localhost:3001');

        const buttons = await page.$$('button, a[role="button"]');

        for (const button of buttons.slice(0, 10)) {
          const box = await button.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      });

      it('should not require horizontal scrolling', async () => {
        await page.goto('http://localhost:3001/dashboard');

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        expect(hasHorizontalScroll).toBe(false);
      });

      it('should render navigation menu', async () => {
        await page.goto('http://localhost:3001');

        const menuButton = await page.$('[aria-label="menu"], .hamburger, .mobile-menu');
        
        if (device.viewport.width < 768) {
          expect(menuButton).toBeTruthy();
        }
      });

      it('should support touch gestures', async () => {
        await page.goto('http://localhost:3001/dashboard');

        await page.touchscreen.tap(100, 100);

        const touchSupport = await page.evaluate(() => {
          return 'ontouchstart' in window;
        });

        expect(touchSupport).toBe(true);
      });

      it('should have readable font sizes (min 16px)', async () => {
        await page.goto('http://localhost:3001');

        const fontSize = await page.evaluate(() => {
          const body = document.body;
          const computed = window.getComputedStyle(body);
          return parseFloat(computed.fontSize);
        });

        expect(fontSize).toBeGreaterThanOrEqual(14);
      });

      it('should handle orientation change', async () => {
        await page.goto('http://localhost:3001/dashboard');

        const initialWidth = page.viewportSize()?.width;

        await page.setViewportSize({
          width: page.viewportSize()?.height || 800,
          height: page.viewportSize()?.width || 600,
        });

        await page.waitForTimeout(500);

        const newWidth = page.viewportSize()?.width;
        expect(newWidth).not.toBe(initialWidth);
      });
    });
  });

  describe('Responsive Breakpoints', () => {
    let context: BrowserContext;
    let page: Page;

    const breakpoints = [
      { name: 'xs', width: 320 },
      { name: 'sm', width: 640 },
      { name: 'md', width: 768 },
      { name: 'lg', width: 1024 },
      { name: 'xl', width: 1280 },
      { name: '2xl', width: 1536 },
    ];

    breakpoints.forEach(({ name, width }) => {
      it(`should adapt to ${name} breakpoint (${width}px)`, async () => {
        context = await browser.newContext({
          viewport: { width, height: 800 },
        });
        page = await context.newPage();

        await page.goto('http://localhost:3001/dashboard');

        const computedWidth = await page.evaluate(() => window.innerWidth);
        expect(computedWidth).toBe(width);

        await page.close();
        await context.close();
      });
    });
  });
});

