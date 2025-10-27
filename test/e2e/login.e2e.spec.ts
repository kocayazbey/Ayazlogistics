import { test, expect } from '@playwright/test';

test.describe('Login Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/login');
  });

  test('should display login page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/AyazLogistics/);
    await expect(page.locator('h1')).toContainText(/Login|Sign In/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/email.*required/i')).toBeVisible();
    await expect(page.locator('text=/password.*required/i')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalidemail');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
  });

  test('should login successfully with correct credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@ayazlogistics.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Should show user profile or welcome message
    await expect(page.locator('text=/Welcome|Dashboard/i')).toBeVisible();
  });

  test('should show error for incorrect credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/Invalid credentials|Login failed/i')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.click('text=/Sign Up|Register/i');
    await expect(page).toHaveURL(/\/register/);
  });

  test('should show password when toggle is clicked', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('mypassword');
    
    await page.click('[data-testid="toggle-password"], button:has-text("Show")');
    await expect(page.locator('input[type="text"]').first()).toHaveValue('mypassword');
  });

  test('should persist login after page refresh', async ({ page, context }) => {
    await page.fill('input[type="email"]', 'admin@ayazlogistics.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=/Logout|Sign Out/i')).toBeVisible();
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    for (let i = 0; i < 6; i++) {
      await page.fill('input[type="email"]', 'test@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }
    
    await expect(page.locator('text=/Too many.*attempts|Rate limit/i')).toBeVisible();
  });
});

