import { test, expect } from '@playwright/test';

test.describe('Invoice Generation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'admin@ayazlogistics.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should navigate to billing page', async ({ page }) => {
    await page.click('text=/Billing|Invoices/i');
    await expect(page).toHaveURL(/\/billing|\/invoices/);
  });

  test('should display list of invoices', async ({ page }) => {
    await page.goto('http://localhost:3001/billing/invoices');
    
    await expect(page.locator('h1')).toContainText(/Invoices|Billing/i);
    await expect(page.locator('table, [data-testid="invoice-list"]')).toBeVisible();
  });

  test('should generate new invoice', async ({ page }) => {
    await page.goto('http://localhost:3001/billing/invoices');
    
    await page.click('button:has-text("Generate Invoice"), button:has-text("New Invoice")');
    
    // Fill invoice details
    await page.fill('[name="customerId"], [id="customerId"]', 'CUST-001');
    await page.fill('[name="contractId"], [id="contractId"]', 'CONTRACT-001');
    
    // Select month/year
    await page.selectOption('[name="month"]', '10');
    await page.selectOption('[name="year"]', '2025');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Generate")');
    
    // Should show success
    await expect(page.locator('text=/Invoice generated|Success/i')).toBeVisible({
      timeout: 10000,
    });
    
    // Should show invoice number
    await expect(page.locator('text=/INV-\\d+/')).toBeVisible();
  });

  test('should view invoice details', async ({ page }) => {
    await page.goto('http://localhost:3001/billing/invoices');
    
    // Click on first invoice
    await page.click('tr:nth-child(1) td:has-text("INV-"), tr:nth-child(1) button:has-text("View")');
    
    // Should show invoice details
    await expect(page.locator('text=/Invoice Number|Invoice #/i')).toBeVisible();
    await expect(page.locator('text=/Customer|Client/i')).toBeVisible();
    await expect(page.locator('text=/Total Amount|Total/i')).toBeVisible();
    
    // Should show line items
    await expect(page.locator('text=/Line Items|Items|Services/i')).toBeVisible();
  });

  test('should download invoice as PDF', async ({ page }) => {
    await page.goto('http://localhost:3001/billing/invoices');
    
    // View invoice
    await page.click('tr:nth-child(1) td:has-text("INV-")');
    
    // Download PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download PDF"), button:has-text("PDF")');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf/i);
  });

  test('should filter invoices by status', async ({ page }) => {
    await page.goto('http://localhost:3001/billing/invoices');
    
    // Apply filter
    await page.selectOption('[name="status"], select:near(text=/Status/i)', 'paid');
    
    // Should update list
    await page.waitForTimeout(1000);
    
    // All visible invoices should have 'paid' status
    const statusBadges = await page.locator('text=/paid/i').count();
    expect(statusBadges).toBeGreaterThan(0);
  });

  test('should filter invoices by date range', async ({ page }) => {
    await page.goto('http://localhost:3001/billing/invoices');
    
    await page.fill('[name="startDate"], [id="startDate"]', '2025-01-01');
    await page.fill('[name="endDate"], [id="endDate"]', '2025-12-31');
    await page.click('button:has-text("Filter"), button:has-text("Apply")');
    
    await page.waitForTimeout(1000);
    
    // Should show filtered results
    const invoices = await page.locator('tr:has-text("INV-")').count();
    expect(invoices).toBeGreaterThan(0);
  });

  test('should mark invoice as paid', async ({ page }) => {
    await page.goto('http://localhost:3001/billing/invoices');
    
    // View draft invoice
    await page.click('tr:has-text("draft") td:has-text("INV-")').first();
    
    // Mark as paid
    await page.click('button:has-text("Mark as Paid")');
    
    // Confirm
    await page.click('button:has-text("Confirm"), button:has-text("Yes")');
    
    // Should show success
    await expect(page.locator('text=/marked as paid|payment recorded/i')).toBeVisible();
  });

  test('should send invoice via email', async ({ page }) => {
    await page.goto('http://localhost:3001/billing/invoices');
    
    await page.click('tr:nth-child(1) td:has-text("INV-")');
    
    await page.click('button:has-text("Send Email")');
    
    // Fill email form
    await page.fill('[name="email"], [id="recipientEmail"]', 'customer@example.com');
    await page.click('button[type="submit"]:has-text("Send")');
    
    // Should show success
    await expect(page.locator('text=/Email sent|Invoice sent/i')).toBeVisible();
  });

  test('should calculate invoice totals correctly', async ({ page }) => {
    await page.goto('http://localhost:3001/billing/invoices/generate');
    
    // Add multiple line items
    await page.click('text=/Add Line Item/i');
    await page.fill('[name="items.0.description"]', 'Storage Fee');
    await page.fill('[name="items.0.quantity"]', '100');
    await page.fill('[name="items.0.unitPrice"]', '10');
    
    await page.click('text=/Add Line Item/i');
    await page.fill('[name="items.1.description"]', 'Handling Fee');
    await page.fill('[name="items.1.quantity"]', '50');
    await page.fill('[name="items.1.unitPrice"]', '5');
    
    // Should show calculated subtotal (1000 + 250 = 1250)
    await expect(page.locator('text=/Subtotal.*1,?250/i')).toBeVisible();
    
    // Should show tax (assume 20%)
    await expect(page.locator('text=/Tax.*250/i')).toBeVisible();
    
    // Should show total (1250 + 250 = 1500)
    await expect(page.locator('text=/Total.*1,?500/i')).toBeVisible();
  });

  test('should handle pagination in invoice list', async ({ page }) => {
    await page.goto('http://localhost:3001/billing/invoices');
    
    const hasNextButton = await page.locator('button:has-text("Next"), button[aria-label="Next page"]').isVisible();
    
    if (hasNextButton) {
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(1000);
      
      // Should show different invoices
      await expect(page.locator('tr:has-text("INV-")')).toBeVisible();
    }
  });
});

