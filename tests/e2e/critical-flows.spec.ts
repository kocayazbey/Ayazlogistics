import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('User Login Flow', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Login');
    
    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('Inventory Management Flow', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Navigate to inventory
    await page.click('text=Inventory');
    
    // Add new item
    await page.click('text=Add Item');
    await page.fill('input[name="name"]', 'Test Product');
    await page.fill('input[name="sku"]', 'TEST-001');
    await page.fill('input[name="quantity"]', '100');
    
    // Save item
    await page.click('button[type="submit"]');
    
    // Verify item appears in list
    await expect(page.locator('text=Test Product')).toBeVisible();
  });

  test('Order Processing Flow', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'user123');
    await page.click('button[type="submit"]');
    
    // Navigate to orders
    await page.click('text=Orders');
    
    // Create new order
    await page.click('text=New Order');
    await page.fill('input[name="customerName"]', 'Test Customer');
    await page.fill('input[name="product"]', 'Test Product');
    await page.fill('input[name="quantity"]', '5');
    
    // Submit order
    await page.click('button[type="submit"]');
    
    // Verify order created
    await expect(page.locator('text=Order Created')).toBeVisible();
  });

  test('Warehouse Operations Flow', async ({ page }) => {
    // Login as warehouse manager
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'warehouse@example.com');
    await page.fill('input[name="password"]', 'warehouse123');
    await page.click('button[type="submit"]');
    
    // Navigate to warehouse
    await page.click('text=Warehouse');
    
    // Perform picking operation
    await page.click('text=Picking');
    await page.selectOption('select[name="order"]', 'ORDER-001');
    await page.click('text=Start Picking');
    
    // Verify picking started
    await expect(page.locator('text=Picking Started')).toBeVisible();
  });

  test('Reporting Flow', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'manager@example.com');
    await page.fill('input[name="password"]', 'manager123');
    await page.click('button[type="submit"]');
    
    // Navigate to reports
    await page.click('text=Reports');
    
    // Generate inventory report
    await page.click('text=Inventory Report');
    await page.selectOption('select[name="period"]', 'last-month');
    await page.click('text=Generate Report');
    
    // Verify report generated
    await expect(page.locator('text=Report Generated')).toBeVisible();
  });

  test('Mobile App Flow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to mobile app
    await page.goto('http://localhost:3000/mobile');
    
    // Test mobile navigation
    await page.click('text=Menu');
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Orders')).toBeVisible();
    await expect(page.locator('text=Inventory')).toBeVisible();
  });

  test('API Integration Flow', async ({ page }) => {
    // Test API endpoints
    const response = await page.request.get('http://localhost:3000/api/health');
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData.status).toBe('healthy');
  });

  test('Error Handling Flow', async ({ page }) => {
    // Test 404 page
    await page.goto('http://localhost:3000/nonexistent-page');
    await expect(page.locator('text=Page Not Found')).toBeVisible();
    
    // Test error boundary
    await page.goto('http://localhost:3000/error-test');
    await expect(page.locator('text=Something went wrong')).toBeVisible();
  });

  test('Performance Flow', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    await page.goto('http://localhost:3000');
    const loadTime = Date.now() - startTime;
    
    // Verify load time is acceptable
    expect(loadTime).toBeLessThan(3000); // 3 seconds
  });
});
