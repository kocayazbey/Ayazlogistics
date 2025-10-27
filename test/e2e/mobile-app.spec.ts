import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });

test.describe('Mobile App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mobile');
  });

  test('should load mobile app', async ({ page }) => {
    await expect(page).toHaveTitle(/AyazLogistics Mobile/);
    await expect(page.locator('.mobile-header')).toBeVisible();
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.click('text=Dashboard');
    await expect(page.locator('.dashboard-content')).toBeVisible();
    await expect(page.locator('.stats-grid')).toBeVisible();
  });

  test('should navigate to shipments', async ({ page }) => {
    await page.click('text=Shipments');
    await expect(page.locator('.shipments-list')).toBeVisible();
    await expect(page.locator('.shipment-item')).toHaveCount(5);
  });

  test('should track shipment', async ({ page }) => {
    await page.click('text=Shipments');
    await page.click('.shipment-item:first-child');
    
    await expect(page.locator('.shipment-details')).toBeVisible();
    await expect(page.locator('.tracking-map')).toBeVisible();
    await expect(page.locator('.status-timeline')).toBeVisible();
  });

  test('should scan QR code', async ({ page }) => {
    await page.click('text=Scan');
    await expect(page.locator('.camera-view')).toBeVisible();
    
    // Mock QR code scan
    await page.click('.mock-scan-button');
    await expect(page.locator('.scan-result')).toContainText('QR Code scanned successfully');
  });

  test('should navigate to profile', async ({ page }) => {
    await page.click('text=Profile');
    await expect(page.locator('.profile-content')).toBeVisible();
    await expect(page.locator('.user-info')).toBeVisible();
  });

  test('should handle offline mode', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);
    
    await page.click('text=Dashboard');
    await expect(page.locator('.offline-indicator')).toBeVisible();
    await expect(page.locator('.offline-message')).toContainText('You are offline');
    
    // Simulate online
    await page.context().setOffline(false);
    await expect(page.locator('.offline-indicator')).not.toBeVisible();
  });

  test('should handle push notifications', async ({ page }) => {
    // Request notification permission
    await page.click('text=Notifications');
    await page.click('text=Enable Notifications');
    
    // Mock notification
    await page.evaluate(() => {
      new Notification('New shipment assigned', {
        body: 'You have been assigned a new shipment',
        icon: '/icon.png'
      });
    });
    
    await expect(page.locator('.notification-banner')).toBeVisible();
  });

  test('should handle geolocation', async ({ page }) => {
    // Mock geolocation
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 40.7128, longitude: -74.0060 });
    
    await page.click('text=Location');
    await expect(page.locator('.location-display')).toContainText('40.7128, -74.0060');
  });

  test('should handle camera access', async ({ page }) => {
    // Mock camera permission
    await page.context().grantPermissions(['camera']);
    
    await page.click('text=Scan');
    await expect(page.locator('.camera-view')).toBeVisible();
    await expect(page.locator('.camera-controls')).toBeVisible();
  });

  test('should handle app state persistence', async ({ page }) => {
    // Set some app state
    await page.click('text=Settings');
    await page.check('input[name="darkMode"]');
    await page.selectOption('select[name="language"]', 'tr');
    
    // Reload page
    await page.reload();
    
    // Check if state persisted
    await page.click('text=Settings');
    await expect(page.locator('input[name="darkMode"]')).toBeChecked();
    await expect(page.locator('select[name="language"]')).toHaveValue('tr');
  });

  test('should handle deep linking', async ({ page }) => {
    // Test deep link to specific shipment
    await page.goto('/mobile/shipments/12345');
    await expect(page.locator('.shipment-details')).toBeVisible();
    await expect(page.locator('.shipment-id')).toContainText('12345');
  });

  test('should handle swipe gestures', async ({ page }) => {
    await page.click('text=Shipments');
    
    // Swipe left on shipment item
    await page.locator('.shipment-item:first-child').swipe({ direction: 'left' });
    await expect(page.locator('.swipe-actions')).toBeVisible();
    
    // Swipe right to close
    await page.locator('.shipment-item:first-child').swipe({ direction: 'right' });
    await expect(page.locator('.swipe-actions')).not.toBeVisible();
  });

  test('should handle pull to refresh', async ({ page }) => {
    await page.click('text=Dashboard');
    
    // Pull to refresh
    await page.locator('.dashboard-content').swipe({ direction: 'down' });
    await expect(page.locator('.refresh-indicator')).toBeVisible();
    
    // Wait for refresh to complete
    await expect(page.locator('.refresh-indicator')).not.toBeVisible();
  });

  test('should handle touch interactions', async ({ page }) => {
    await page.click('text=Dashboard');
    
    // Test touch on stats
    await page.locator('.stat-card:first-child').tap();
    await expect(page.locator('.stat-details')).toBeVisible();
    
    // Test long press
    await page.locator('.stat-card:first-child').longPress();
    await expect(page.locator('.context-menu')).toBeVisible();
  });

  test('should handle orientation change', async ({ page }) => {
    // Test portrait orientation
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.portrait-layout')).toBeVisible();
    
    // Test landscape orientation
    await page.setViewportSize({ width: 667, height: 375 });
    await expect(page.locator('.landscape-layout')).toBeVisible();
  });

  test('should handle app backgrounding', async ({ page }) => {
    // Simulate app going to background
    await page.evaluate(() => {
      window.dispatchEvent(new Event('visibilitychange'));
    });
    
    await expect(page.locator('.background-indicator')).toBeVisible();
    
    // Simulate app coming to foreground
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible' });
      window.dispatchEvent(new Event('visibilitychange'));
    });
    
    await expect(page.locator('.background-indicator')).not.toBeVisible();
  });

  test('should handle network status changes', async ({ page }) => {
    // Test slow network
    await page.route('**/api/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
      delay: 5000
    }));
    
    await page.click('text=Shipments');
    await expect(page.locator('.loading-indicator')).toBeVisible();
    
    // Test network error
    await page.route('**/api/**', route => route.abort());
    await page.reload();
    await expect(page.locator('.error-message')).toContainText('Network error');
  });

  test('should handle device rotation', async ({ page }) => {
    // Test device rotation
    await page.evaluate(() => {
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90, type: 'landscape-primary' },
        writable: true
      });
      window.dispatchEvent(new Event('orientationchange'));
    });
    
    await expect(page.locator('.landscape-layout')).toBeVisible();
  });

  test('should handle app updates', async ({ page }) => {
    // Simulate app update available
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('app-update-available', {
        detail: { version: '1.1.0' }
      }));
    });
    
    await expect(page.locator('.update-banner')).toBeVisible();
    await expect(page.locator('.update-banner')).toContainText('Update available');
  });

  test('should handle accessibility on mobile', async ({ page }) => {
    // Test screen reader support
    await expect(page.locator('h1')).toHaveAttribute('role', 'heading');
    await expect(page.locator('button')).toHaveAttribute('aria-label');
    
    // Test touch target sizes
    const button = page.locator('button').first();
    const buttonBox = await button.boundingBox();
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });
});
