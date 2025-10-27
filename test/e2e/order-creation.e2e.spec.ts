import { test, expect } from '@playwright/test';

test.describe('Order Creation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'admin@ayazlogistics.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should navigate to create order page', async ({ page }) => {
    await page.click('text=/Orders|New Order/i');
    await expect(page).toHaveURL(/\/orders\/create|\/orders\/new/);
    await expect(page.locator('h1')).toContainText(/Create.*Order|New Order/i);
  });

  test('should create order with all required fields', async ({ page }) => {
    await page.goto('http://localhost:3001/orders/create');
    
    // Fill customer information
    await page.fill('[name="customerName"], [id="customerName"]', 'Test Customer Inc.');
    await page.fill('[name="customerEmail"], [id="customerEmail"]', 'customer@test.com');
    await page.fill('[name="customerPhone"], [id="customerPhone"]', '+905551234567');
    
    // Fill shipping information
    await page.fill('[name="origin"], [id="origin"]', 'Istanbul, Turkey');
    await page.fill('[name="destination"], [id="destination"]', 'Ankara, Turkey');
    await page.fill('[name="shipmentDate"], [id="shipmentDate"]', '2025-10-30');
    
    // Add order items
    await page.click('text=/Add Item|Add Product/i');
    await page.fill('[name="items.0.sku"], [id="item-sku-0"]', 'SKU-001');
    await page.fill('[name="items.0.quantity"], [id="item-quantity-0"]', '10');
    await page.fill('[name="items.0.weight"], [id="item-weight-0"]', '50');
    
    // Select service type
    await page.selectOption('[name="serviceType"], [id="serviceType"]', 'standard');
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create Order")');
    
    // Should show success message
    await expect(page.locator('text=/Order created|Success/i')).toBeVisible({
      timeout: 10000,
    });
    
    // Should redirect to order details or list
    await expect(page).toHaveURL(/\/orders\/\d+|\/orders/);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('http://localhost:3001/orders/create');
    
    await page.click('button[type="submit"]:has-text("Create Order")');
    
    // Should show validation errors
    await expect(page.locator('text=/required/i').first()).toBeVisible();
  });

  test('should add multiple items to order', async ({ page }) => {
    await page.goto('http://localhost:3001/orders/create');
    
    // Add first item
    await page.click('text=/Add Item/i');
    await page.fill('[id="item-sku-0"]', 'SKU-001');
    await page.fill('[id="item-quantity-0"]', '10');
    
    // Add second item
    await page.click('text=/Add Item/i');
    await page.fill('[id="item-sku-1"]', 'SKU-002');
    await page.fill('[id="item-quantity-1"]', '5');
    
    // Should see both items
    await expect(page.locator('[id="item-sku-0"]')).toHaveValue('SKU-001');
    await expect(page.locator('[id="item-sku-1"]')).toHaveValue('SKU-002');
  });

  test('should remove item from order', async ({ page }) => {
    await page.goto('http://localhost:3001/orders/create');
    
    // Add items
    await page.click('text=/Add Item/i');
    await page.click('text=/Add Item/i');
    
    // Remove first item
    await page.click('[data-testid="remove-item-0"], button:has-text("Remove")').first();
    
    // Should only have one item left
    const items = await page.locator('[id^="item-sku-"]').count();
    expect(items).toBe(1);
  });

  test('should calculate total price dynamically', async ({ page }) => {
    await page.goto('http://localhost:3001/orders/create');
    
    await page.click('text=/Add Item/i');
    await page.fill('[name="items.0.quantity"]', '10');
    await page.fill('[name="items.0.unitPrice"]', '100');
    
    // Should show calculated total
    await expect(page.locator('text=/Total.*1000|₺1,000/i')).toBeVisible();
  });

  test('should save draft order', async ({ page }) => {
    await page.goto('http://localhost:3001/orders/create');
    
    await page.fill('[name="customerName"]', 'Draft Customer');
    await page.fill('[name="origin"]', 'Istanbul');
    
    await page.click('button:has-text("Save Draft")');
    
    await expect(page.locator('text=/Draft saved|Saved as draft/i')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('http://localhost:3001/orders/create');
    
    // Fill with invalid data that will cause API error
    await page.fill('[name="customerEmail"]', 'invalid-email');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/Error|Failed/i')).toBeVisible();
  });
});

