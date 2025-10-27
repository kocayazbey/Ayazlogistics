import { test, expect } from '@playwright/test';

test.describe('Admin Panel E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('should load admin dashboard', async ({ page }) => {
    await expect(page).toHaveTitle(/AyazLogistics Admin/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should navigate to vehicles page', async ({ page }) => {
    await page.click('text=Vehicles');
    await expect(page).toHaveURL(/.*\/admin\/vehicles/);
    await expect(page.locator('h1')).toContainText('Vehicles');
  });

  test('should navigate to drivers page', async ({ page }) => {
    await page.click('text=Drivers');
    await expect(page).toHaveURL(/.*\/admin\/drivers/);
    await expect(page.locator('h1')).toContainText('Drivers');
  });

  test('should navigate to routes page', async ({ page }) => {
    await page.click('text=Routes');
    await expect(page).toHaveURL(/.*\/admin\/routes/);
    await expect(page.locator('h1')).toContainText('Routes');
  });

  test('should create a new vehicle', async ({ page }) => {
    await page.click('text=Vehicles');
    await page.click('text=Add Vehicle');
    
    await page.fill('input[name="vehicleNumber"]', 'VH-001');
    await page.fill('input[name="licensePlate"]', 'ABC-123');
    await page.selectOption('select[name="vehicleType"]', 'truck');
    await page.fill('input[name="make"]', 'Mercedes');
    await page.fill('input[name="model"]', 'Sprinter');
    await page.fill('input[name="year"]', '2023');
    await page.fill('input[name="capacity"]', '1000');
    await page.fill('input[name="maxWeight"]', '3500');
    await page.selectOption('select[name="fuelType"]', 'diesel');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toContainText('Vehicle created successfully');
  });

  test('should create a new driver', async ({ page }) => {
    await page.click('text=Drivers');
    await page.click('text=Add Driver');
    
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@example.com');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.selectOption('select[name="licenseType"]', 'CDL');
    await page.fill('input[name="licenseNumber"]', 'DL-123456');
    await page.fill('input[name="experienceYears"]', '5');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toContainText('Driver created successfully');
  });

  test('should optimize route', async ({ page }) => {
    await page.click('text=Routes');
    await page.click('text=Optimize Route');
    
    // Set origin
    await page.fill('input[name="originLat"]', '40.7128');
    await page.fill('input[name="originLng"]', '-74.0060');
    
    // Add destinations
    await page.click('text=Add Destination');
    await page.fill('input[name="destinations[0].lat"]', '40.7589');
    await page.fill('input[name="destinations[0].lng"]', '-73.9851');
    await page.fill('input[name="destinations[0].priority"]', '1');
    await page.fill('input[name="destinations[0].name"]', 'Warehouse A');
    
    await page.click('text=Add Destination');
    await page.fill('input[name="destinations[1].lat"]', '40.6892');
    await page.fill('input[name="destinations[1].lng"]', '-74.0445');
    await page.fill('input[name="destinations[1].priority"]', '2');
    await page.fill('input[name="destinations[1].name"]', 'Warehouse B');
    
    // Set constraints
    await page.fill('input[name="maxDistance"]', '100');
    await page.fill('input[name="maxTime"]', '2');
    
    // Select algorithm
    await page.selectOption('select[name="algorithm"]', 'genetic');
    
    await page.click('button[type="submit"]');
    
    // Wait for optimization to complete
    await expect(page.locator('.optimization-result')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.optimized-route')).toContainText('Optimized Route');
  });

  test('should generate demand forecast', async ({ page }) => {
    await page.click('text=Analytics');
    await page.click('text=Demand Forecasting');
    
    await page.fill('input[name="sku"]', 'PROD-001');
    await page.fill('input[name="horizon"]', '30');
    await page.selectOption('select[name="modelType"]', 'lstm');
    
    // Upload historical data or use sample data
    await page.click('text=Use Sample Data');
    
    await page.click('button[type="submit"]');
    
    // Wait for forecast to complete
    await expect(page.locator('.forecast-result')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.forecast-chart')).toBeVisible();
  });

  test('should generate AI insights', async ({ page }) => {
    await page.click('text=Analytics');
    await page.click('text=AI Insights');
    
    // Fill in logistics data
    await page.fill('input[name="shipments.total"]', '1000');
    await page.fill('input[name="shipments.onTime"]', '950');
    await page.fill('input[name="shipments.delayed"]', '50');
    
    await page.fill('input[name="warehouses.utilization"]', '0.8');
    await page.fill('input[name="warehouses.capacity"]', '10000');
    await page.fill('input[name="warehouses.throughput"]', '500');
    
    await page.fill('input[name="routes.averageDistance"]', '45');
    await page.fill('input[name="routes.averageTime"]', '2');
    await page.fill('input[name="routes.fuelEfficiency"]', '0.7');
    
    await page.fill('input[name="customers.satisfaction"]', '4.5');
    await page.fill('input[name="customers.complaints"]', '5');
    await page.fill('input[name="customers.retention"]', '0.9');
    
    await page.selectOption('select[name="analysisType"]', 'comprehensive');
    await page.check('input[name="includeRecommendations"]');
    await page.check('input[name="includeRiskAssessment"]');
    
    await page.click('button[type="submit"]');
    
    // Wait for insights to generate
    await expect(page.locator('.insights-result')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.insights-summary')).toBeVisible();
    await expect(page.locator('.insights-recommendations')).toBeVisible();
  });

  test('should handle authentication', async ({ page }) => {
    await page.goto('/admin/login');
    
    await page.fill('input[name="email"]', 'admin@ayazlogistics.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
    await expect(page.locator('.user-menu')).toContainText('Admin User');
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.locator('.mobile-menu')).toBeVisible();
    await page.click('.mobile-menu-toggle');
    await expect(page.locator('.mobile-nav')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.tablet-layout')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.desktop-layout')).toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Test network error
    await page.route('**/api/**', route => route.abort());
    
    await page.click('text=Vehicles');
    await expect(page.locator('.error-message')).toContainText('Network error');
    
    // Test validation errors
    await page.route('**/api/**', route => route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Validation failed', errors: ['Invalid data'] })
    }));
    
    await page.click('text=Add Vehicle');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText('Validation failed');
  });

  test('should handle loading states', async ({ page }) => {
    // Test loading state for route optimization
    await page.click('text=Routes');
    await page.click('text=Optimize Route');
    
    // Fill form quickly
    await page.fill('input[name="originLat"]', '40.7128');
    await page.fill('input[name="originLng"]', '-74.0060');
    await page.click('text=Add Destination');
    await page.fill('input[name="destinations[0].lat"]', '40.7589');
    await page.fill('input[name="destinations[0].lng"]', '-73.9851');
    await page.fill('input[name="destinations[0].priority"]', '1');
    await page.fill('input[name="destinations[0].name"]', 'Warehouse A');
    
    await page.click('button[type="submit"]');
    
    // Check loading state
    await expect(page.locator('.loading-spinner')).toBeVisible();
    await expect(page.locator('.loading-text')).toContainText('Optimizing route...');
  });

  test('should handle accessibility', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test screen reader support
    await expect(page.locator('h1')).toHaveAttribute('role', 'heading');
    await expect(page.locator('button')).toHaveAttribute('aria-label');
    
    // Test color contrast
    const button = page.locator('button').first();
    const buttonColor = await button.evaluate(el => getComputedStyle(el).color);
    const backgroundColor = await button.evaluate(el => getComputedStyle(el).backgroundColor);
    
    // Basic color contrast check
    expect(buttonColor).not.toBe(backgroundColor);
  });
});
