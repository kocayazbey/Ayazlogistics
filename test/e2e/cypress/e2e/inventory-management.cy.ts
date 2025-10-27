describe('Inventory Management E2E Tests', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type(Cypress.env('testUser').email);
    cy.get('[data-cy=password-input]').type(Cypress.env('testUser').password);
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should display inventory page', () => {
    cy.visit('/wms/inventory');
    cy.get('[data-cy=inventory-page]').should('be.visible');
    cy.get('[data-cy=inventory-title]').should('contain', 'Inventory Management');
  });

  it('should load inventory items', () => {
    cy.visit('/wms/inventory');
    cy.get('[data-cy=inventory-table]').should('be.visible');
    cy.get('[data-cy=inventory-item]').should('have.length.greaterThan', 0);
  });

  it('should search inventory items', () => {
    cy.visit('/wms/inventory');
    cy.get('[data-cy=search-input]').type('TEST-SKU');
    cy.get('[data-cy=search-button]').click();
    cy.get('[data-cy=inventory-item]').should('contain', 'TEST-SKU');
  });

  it('should filter inventory by status', () => {
    cy.visit('/wms/inventory');
    cy.get('[data-cy=status-filter]').select('available');
    cy.get('[data-cy=filter-button]').click();
    cy.get('[data-cy=inventory-item]').each(($item) => {
      cy.wrap($item).should('contain', 'Available');
    });
  });

  it('should create new inventory item', () => {
    cy.visit('/wms/inventory');
    cy.get('[data-cy=add-item-button]').click();
    
    cy.get('[data-cy=sku-input]').type('E2E-TEST-SKU-001');
    cy.get('[data-cy=name-input]').type('E2E Test Product');
    cy.get('[data-cy=description-input]').type('Product for E2E testing');
    cy.get('[data-cy=category-input]').type('Test');
    cy.get('[data-cy=current-stock-input]').type('100');
    cy.get('[data-cy=min-stock-input]').type('10');
    cy.get('[data-cy=max-stock-input]').type('500');
    cy.get('[data-cy=unit-cost-input]').type('25.50');
    cy.get('[data-cy=location-input]').type('A1-B2-C3');
    
    cy.get('[data-cy=save-button]').click();
    
    cy.get('[data-cy=success-message]').should('contain', 'Inventory item created successfully');
    cy.get('[data-cy=inventory-item]').should('contain', 'E2E-TEST-SKU-001');
  });

  it('should edit inventory item', () => {
    cy.visit('/wms/inventory');
    cy.get('[data-cy=inventory-item]').first().within(() => {
      cy.get('[data-cy=edit-button]').click();
    });
    
    cy.get('[data-cy=name-input]').clear().type('Updated Product Name');
    cy.get('[data-cy=save-button]').click();
    
    cy.get('[data-cy=success-message]').should('contain', 'Inventory item updated successfully');
    cy.get('[data-cy=inventory-item]').should('contain', 'Updated Product Name');
  });

  it('should delete inventory item', () => {
    cy.visit('/wms/inventory');
    cy.get('[data-cy=inventory-item]').first().within(() => {
      cy.get('[data-cy=delete-button]').click();
    });
    
    cy.get('[data-cy=confirm-delete-button]').click();
    cy.get('[data-cy=success-message]').should('contain', 'Inventory item deleted successfully');
  });

  it('should show inventory statistics', () => {
    cy.visit('/wms/inventory');
    cy.get('[data-cy=inventory-stats]').should('be.visible');
    cy.get('[data-cy=total-items]').should('contain', 'Total Items');
    cy.get('[data-cy=in-stock]').should('contain', 'In Stock');
    cy.get('[data-cy=low-stock]').should('contain', 'Low Stock');
    cy.get('[data-cy=out-of-stock]').should('contain', 'Out of Stock');
  });

  it('should export inventory data', () => {
    cy.visit('/wms/inventory');
    cy.get('[data-cy=export-button]').click();
    cy.get('[data-cy=export-options]').should('be.visible');
    cy.get('[data-cy=export-csv]').click();
    
    // Verify file download (this might need to be adjusted based on actual implementation)
    cy.window().its('navigator.downloads').should('exist');
  });

  it('should handle real-time updates', () => {
    cy.visit('/wms/inventory');
    cy.get('[data-cy=connection-status]').should('contain', 'Online');
    
    // Simulate real-time update
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('inventory:updated', {
        detail: {
          type: 'inventory.updated',
          data: {
            id: 'test-id',
            sku: 'REAL-TIME-TEST',
            name: 'Real-time Test Product',
            status: 'available',
          },
        },
      }));
    });
    
    cy.get('[data-cy=inventory-item]').should('contain', 'REAL-TIME-TEST');
  });
});
