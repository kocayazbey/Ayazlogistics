describe('Operations Workflow E2E Tests', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type(Cypress.env('testUser').email);
    cy.get('[data-cy=password-input]').type(Cypress.env('testUser').password);
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should complete full receiving workflow', () => {
    // Step 1: Create receiving order
    cy.visit('/wms/receiving');
    cy.get('[data-cy=add-receipt-button]').click();
    
    cy.get('[data-cy=receipt-number-input]').type('REC-E2E-001');
    cy.get('[data-cy=supplier-input]').type('E2E Test Supplier');
    cy.get('[data-cy=add-item-button]').click();
    
    cy.get('[data-cy=item-sku-input]').type('E2E-RECEIVING-SKU-001');
    cy.get('[data-cy=item-quantity-input]').type('50');
    cy.get('[data-cy=item-unit-cost-input]').type('25.00');
    
    cy.get('[data-cy=save-receipt-button]').click();
    cy.get('[data-cy=success-message]').should('contain', 'Receipt created successfully');

    // Step 2: Approve receiving order
    cy.get('[data-cy=receipt-item]').contains('REC-E2E-001').within(() => {
      cy.get('[data-cy=approve-button]').click();
    });
    cy.get('[data-cy=confirm-approve-button]').click();
    cy.get('[data-cy=success-message]').should('contain', 'Receipt approved successfully');

    // Step 3: Verify inventory update
    cy.visit('/wms/inventory');
    cy.get('[data-cy=search-input]').type('E2E-RECEIVING-SKU-001');
    cy.get('[data-cy=search-button]').click();
    cy.get('[data-cy=inventory-item]').should('contain', 'E2E-RECEIVING-SKU-001');
  });

  it('should complete full picking workflow', () => {
    // Step 1: Create pick order
    cy.visit('/wms/picking');
    cy.get('[data-cy=add-pick-button]').click();
    
    cy.get('[data-cy=pick-number-input]').type('PICK-E2E-001');
    cy.get('[data-cy=order-id-input]').type('ORD-E2E-001');
    cy.get('[data-cy=customer-input]').type('E2E Test Customer');
    cy.get('[data-cy=priority-select]').select('high');
    cy.get('[data-cy=add-pick-item-button]').click();
    
    cy.get('[data-cy=pick-item-sku-input]').type('E2E-RECEIVING-SKU-001');
    cy.get('[data-cy=pick-item-quantity-input]').type('10');
    cy.get('[data-cy=pick-item-location-input]').type('A1-B2-C3');
    
    cy.get('[data-cy=save-pick-button]').click();
    cy.get('[data-cy=success-message]').should('contain', 'Pick order created successfully');

    // Step 2: Assign pick to operator
    cy.get('[data-cy=pick-item]').contains('PICK-E2E-001').within(() => {
      cy.get('[data-cy=assign-button]').click();
    });
    cy.get('[data-cy=operator-select]').select('operator-001');
    cy.get('[data-cy=confirm-assign-button]').click();
    cy.get('[data-cy=success-message]').should('contain', 'Pick assigned successfully');

    // Step 3: Start pick operation
    cy.get('[data-cy=pick-item]').contains('PICK-E2E-001').within(() => {
      cy.get('[data-cy=start-button]').click();
    });
    cy.get('[data-cy=confirm-start-button]').click();
    cy.get('[data-cy=success-message]').should('contain', 'Pick operation started');

    // Step 4: Complete pick operation
    cy.get('[data-cy=pick-item]').contains('PICK-E2E-001').within(() => {
      cy.get('[data-cy=complete-button]').click();
    });
    cy.get('[data-cy=confirm-complete-button]').click();
    cy.get('[data-cy=success-message]').should('contain', 'Pick operation completed');
  });

  it('should complete full shipping workflow', () => {
    // Step 1: Create shipment
    cy.visit('/wms/shipping');
    cy.get('[data-cy=add-shipment-button]').click();
    
    cy.get('[data-cy=shipment-number-input]').type('SHP-E2E-001');
    cy.get('[data-cy=order-id-input]').type('ORD-E2E-001');
    cy.get('[data-cy=customer-input]').type('E2E Test Customer');
    cy.get('[data-cy=destination-input]').type('E2E Test City');
    cy.get('[data-cy=carrier-input]').type('E2E Test Carrier');
    cy.get('[data-cy=priority-select]').select('high');
    cy.get('[data-cy=add-shipment-item-button]').click();
    
    cy.get('[data-cy=shipment-item-sku-input]').type('E2E-RECEIVING-SKU-001');
    cy.get('[data-cy=shipment-item-quantity-input]').type('10');
    cy.get('[data-cy=shipment-item-weight-input]').type('5.5');
    
    cy.get('[data-cy=save-shipment-button]').click();
    cy.get('[data-cy=success-message]').should('contain', 'Shipment created successfully');

    // Step 2: Dispatch shipment
    cy.get('[data-cy=shipment-item]').contains('SHP-E2E-001').within(() => {
      cy.get('[data-cy=dispatch-button]').click();
    });
    cy.get('[data-cy=confirm-dispatch-button]').click();
    cy.get('[data-cy=success-message]').should('contain', 'Shipment dispatched successfully');
  });

  it('should handle real-time operation updates', () => {
    cy.visit('/wms/operations');
    cy.get('[data-cy=connection-status]').should('contain', 'Online');
    
    // Simulate real-time operation update
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('operation:updated', {
        detail: {
          type: 'operation.completed',
          data: {
            id: 'test-operation-id',
            operationNumber: 'OP-E2E-001',
            type: 'picking',
            status: 'completed',
            operator: 'Test Operator',
          },
        },
      }));
    });
    
    cy.get('[data-cy=operation-item]').should('contain', 'OP-E2E-001');
    cy.get('[data-cy=operation-item]').should('contain', 'completed');
  });

  it('should display operations dashboard', () => {
    cy.visit('/wms/operations');
    cy.get('[data-cy=operations-dashboard]').should('be.visible');
    cy.get('[data-cy=total-operations]').should('contain', 'Total Operations');
    cy.get('[data-cy=completed-operations]').should('contain', 'Completed');
    cy.get('[data-cy=pending-operations]').should('contain', 'Pending');
    cy.get('[data-cy=in-progress-operations]').should('contain', 'In Progress');
  });

  it('should filter operations by type and status', () => {
    cy.visit('/wms/operations');
    cy.get('[data-cy=type-filter]').select('picking');
    cy.get('[data-cy=status-filter]').select('completed');
    cy.get('[data-cy=filter-button]').click();
    
    cy.get('[data-cy=operation-item]').each(($item) => {
      cy.wrap($item).should('contain', 'picking');
      cy.wrap($item).should('contain', 'completed');
    });
  });

  it('should show operation details', () => {
    cy.visit('/wms/operations');
    cy.get('[data-cy=operation-item]').first().within(() => {
      cy.get('[data-cy=view-details-button]').click();
    });
    
    cy.get('[data-cy=operation-details]').should('be.visible');
    cy.get('[data-cy=operation-id]').should('be.visible');
    cy.get('[data-cy=operation-type]').should('be.visible');
    cy.get('[data-cy=operation-status]').should('be.visible');
    cy.get('[data-cy=operation-operator]').should('be.visible');
  });
});
