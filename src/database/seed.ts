import { DatabaseService } from '../core/database/database.service';
import { ComprehensiveLoggerService } from '../common/services/comprehensive-logger.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as bcrypt from 'bcrypt';

async function seedDatabase() {
  const logger = new ComprehensiveLoggerService();

  logger.log('🌱 Starting database seeding...', 'DatabaseSeeder');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dbService = app.get(DatabaseService);
  const db = dbService.getDb();

  try {
    // Default tenant ID for seeding
    const defaultTenantId = '00000000-0000-0000-0000-000000000001';
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const managerPassword = await bcrypt.hash('Manager123!', 10);
    const driverPassword = await bcrypt.hash('Driver123!', 10);
    const customerPassword = await bcrypt.hash('Customer123!', 10);
    
    // Sample Users
    logger.log('👥 Creating sample users...', 'DatabaseSeeder');
    const users = await db.insert(db.users).values([
      {
        email: 'admin@ayazlogistics.com',
        passwordHash: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'manager@ayazlogistics.com',
        passwordHash: managerPassword,
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager',
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'driver@ayazlogistics.com',
        passwordHash: driverPassword,
        firstName: 'Driver',
        lastName: 'User',
        role: 'driver',
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'customer@example.com',
        passwordHash: customerPassword,
        firstName: 'Customer',
        lastName: 'User',
        role: 'customer',
        isActive: true,
        emailVerified: true,
      },
    ]).returning();

    // Sample Warehouses
    logger.log('🏭 Creating sample warehouses...', 'DatabaseSeeder');
    const warehouses = await db.insert(db.warehouses).values([
      {
        tenantId: defaultTenantId,
        name: 'Main Warehouse',
        code: 'WH-001',
        address: '123 Industrial Blvd',
        city: 'Istanbul',
        state: 'Istanbul',
        country: 'Turkey',
        postalCode: '34000',
        phone: '+90 212 123 4567',
        email: 'warehouse@ayazlogistics.com',
        capacityCubicMeters: 5000.00,
        capacityWeightKg: 100000.00,
        isActive: true,
      },
      {
        tenantId: defaultTenantId,
        name: 'Secondary Warehouse',
        code: 'WH-002',
        address: '456 Logistics Ave',
        city: 'Ankara',
        state: 'Ankara',
        country: 'Turkey',
        postalCode: '06000',
        phone: '+90 312 987 6543',
        email: 'warehouse2@ayazlogistics.com',
        capacityCubicMeters: 3000.00,
        capacityWeightKg: 75000.00,
        isActive: true,
      },
    ]).returning();

    // Sample Warehouse Zones
    logger.log('📍 Creating sample warehouse zones...', 'DatabaseSeeder');
    const zones = await db.insert(db.warehouseZones).values([
      {
        warehouseId: warehouses[0].id,
        name: 'Receiving Zone',
        code: 'RZ-001',
        zoneType: 'receiving',
        capacityCubicMeters: 500.00,
        capacityWeightKg: 10000.00,
        isActive: true,
      },
      {
        warehouseId: warehouses[0].id,
        name: 'Storage Zone A',
        code: 'SA-001',
        zoneType: 'storage',
        capacityCubicMeters: 2000.00,
        capacityWeightKg: 40000.00,
        isActive: true,
      },
      {
        warehouseId: warehouses[0].id,
        name: 'Picking Zone',
        code: 'PZ-001',
        zoneType: 'picking',
        capacityCubicMeters: 1000.00,
        capacityWeightKg: 20000.00,
        isActive: true,
      },
      {
        warehouseId: warehouses[0].id,
        name: 'Shipping Zone',
        code: 'SZ-001',
        zoneType: 'shipping',
        capacityCubicMeters: 300.00,
        capacityWeightKg: 5000.00,
        isActive: true,
      },
    ]).returning();

    // Sample Warehouse Locations
    logger.log('🗂️ Creating sample warehouse locations...', 'DatabaseSeeder');
    const locations = await db.insert(db.warehouseLocations).values([
      {
        zoneId: zones[0].id,
        locationCode: 'RZ-001-A1',
        aisle: 'A',
        rack: '1',
        shelf: '1',
        position: '1',
        capacityCubicMeters: 10.00,
        capacityWeightKg: 200.00,
        isActive: true,
      },
      {
        zoneId: zones[1].id,
        locationCode: 'SA-001-A1',
        aisle: 'A',
        rack: '1',
        shelf: '1',
        position: '1',
        capacityCubicMeters: 15.00,
        capacityWeightKg: 300.00,
        isActive: true,
      },
      {
        zoneId: zones[1].id,
        locationCode: 'SA-001-A2',
        aisle: 'A',
        rack: '1',
        shelf: '2',
        position: '1',
        capacityCubicMeters: 15.00,
        capacityWeightKg: 300.00,
        isActive: true,
      },
      {
        zoneId: zones[2].id,
        locationCode: 'PZ-001-B1',
        aisle: 'B',
        rack: '1',
        shelf: '1',
        position: '1',
        capacityCubicMeters: 8.00,
        capacityWeightKg: 150.00,
        isActive: true,
      },
    ]).returning();

    // Sample Products
    logger.log('📦 Creating sample products...', 'DatabaseSeeder');
    const products = await db.insert(db.products).values([
      {
        tenantId: defaultTenantId,
        sku: 'PAL-001',
        name: 'Standard Pallet',
        description: 'Standard wooden pallet for logistics',
        category: 'Logistics',
        brand: 'AyazLogistics',
        weightKg: 25.0,
        dimensionsLengthCm: 120.0,
        dimensionsWidthCm: 80.0,
        dimensionsHeightCm: 15.0,
        volumeCubicMeters: 0.144,
        unitOfMeasure: 'piece',
        isActive: true,
      },
      {
        tenantId: defaultTenantId,
        sku: 'BOX-001',
        name: 'Cardboard Box Small',
        description: 'Small cardboard box for packaging',
        category: 'Packaging',
        brand: 'AyazLogistics',
        weightKg: 0.5,
        dimensionsLengthCm: 30.0,
        dimensionsWidthCm: 20.0,
        dimensionsHeightCm: 15.0,
        volumeCubicMeters: 0.009,
        unitOfMeasure: 'piece',
        isActive: true,
      },
      {
        tenantId: defaultTenantId,
        sku: 'TAPE-001',
        name: 'Packaging Tape',
        description: 'Clear packaging tape',
        category: 'Packaging',
        brand: 'AyazLogistics',
        weightKg: 0.1,
        dimensionsLengthCm: 50.0,
        dimensionsWidthCm: 5.0,
        dimensionsHeightCm: 0.5,
        volumeCubicMeters: 0.000125,
        unitOfMeasure: 'roll',
        isActive: true,
      },
      {
        tenantId: defaultTenantId,
        sku: 'LABEL-001',
        name: 'Shipping Label',
        description: 'Standard shipping label',
        category: 'Packaging',
        brand: 'AyazLogistics',
        weightKg: 0.01,
        dimensionsLengthCm: 10.0,
        dimensionsWidthCm: 6.0,
        dimensionsHeightCm: 0.1,
        volumeCubicMeters: 0.000006,
        unitOfMeasure: 'piece',
        isActive: true,
      },
    ]).returning();

    // Sample Inventory
    logger.log('📊 Creating sample inventory...', 'DatabaseSeeder');
    const inventory = await db.insert(db.inventory).values([
      {
        tenantId: defaultTenantId,
        productId: products[0].id,
        warehouseId: warehouses[0].id,
        locationId: locations[1].id,
        quantityAvailable: 100,
        quantityReserved: 0,
        quantityShipped: 0,
        status: 'available',
        batchNumber: 'BATCH-001',
        expiryDate: new Date('2025-12-31'),
        costPerUnit: 50.00,
        lastCountedAt: new Date(),
      },
      {
        tenantId: defaultTenantId,
        productId: products[1].id,
        warehouseId: warehouses[0].id,
        locationId: locations[2].id,
        quantityAvailable: 500,
        quantityReserved: 0,
        quantityShipped: 0,
        status: 'available',
        batchNumber: 'BATCH-002',
        costPerUnit: 5.00,
        lastCountedAt: new Date(),
      },
      {
        tenantId: defaultTenantId,
        productId: products[2].id,
        warehouseId: warehouses[0].id,
        locationId: locations[3].id,
        quantityAvailable: 200,
        quantityReserved: 0,
        quantityShipped: 0,
        status: 'available',
        batchNumber: 'BATCH-003',
        costPerUnit: 2.50,
        lastCountedAt: new Date(),
      },
      {
        tenantId: defaultTenantId,
        productId: products[3].id,
        warehouseId: warehouses[0].id,
        locationId: locations[3].id,
        quantityAvailable: 1000,
        quantityReserved: 0,
        quantityShipped: 0,
        status: 'available',
        batchNumber: 'BATCH-004',
        costPerUnit: 0.50,
        lastCountedAt: new Date(),
      },
    ]).returning();

    // Sample Batch Lots - Skip as they require stockCards first
    logger.log('📦 Skipping batch lots (requires stockCards setup)...', 'DatabaseSeeder');
    const batchLots = [];

    // Sample Vehicles
    logger.log('🚛 Creating sample vehicles...', 'DatabaseSeeder');
    const vehicles = await db.insert(db.vehicles).values([
      {
        tenantId: defaultTenantId,
        licensePlate: '34ABC123',
        make: 'Ford',
        model: 'Transit',
        year: 2022,
        vehicleType: 'van',
        capacityWeightKg: 1500.00,
        capacityVolumeCubicMeters: 8.0,
        fuelType: 'diesel',
        fuelCapacityLiters: 80.0,
        mileageKm: 25000,
        status: 'available',
        currentLocation: 'Istanbul Warehouse',
        gpsLatitude: 41.0082,
        gpsLongitude: 28.9784,
        lastMaintenanceDate: new Date('2024-01-15'),
        nextMaintenanceDate: new Date('2024-04-15'),
        insuranceExpiry: new Date('2024-12-31'),
        registrationExpiry: new Date('2024-12-31'),
        isActive: true,
      },
      {
        tenantId: defaultTenantId,
        licensePlate: '34DEF456',
        make: 'Mercedes',
        model: 'Sprinter',
        year: 2021,
        vehicleType: 'truck',
        capacityWeightKg: 3500.00,
        capacityVolumeCubicMeters: 15.0,
        fuelType: 'diesel',
        fuelCapacityLiters: 100.0,
        mileageKm: 45000,
        status: 'available',
        currentLocation: 'Istanbul Warehouse',
        gpsLatitude: 41.0082,
        gpsLongitude: 28.9784,
        lastMaintenanceDate: new Date('2024-01-10'),
        nextMaintenanceDate: new Date('2024-04-10'),
        insuranceExpiry: new Date('2024-11-30'),
        registrationExpiry: new Date('2024-11-30'),
        isActive: true,
      },
    ]).returning();

    // Sample Drivers
    logger.log('👨‍💼 Creating sample drivers...', 'DatabaseSeeder');
    const drivers = await db.insert(db.drivers).values([
      {
        tenantId: defaultTenantId,
        userId: users[2].id,
        licenseNumber: 'DL-123456789',
        licenseType: 'B+E',
        licenseExpiry: new Date('2026-12-31'),
        status: 'available',
        currentVehicleId: vehicles[0].id,
        rating: 4.8,
        totalDeliveries: 150,
        totalDistanceKm: 25000.00,
        totalHoursWorked: 1200.00,
        isActive: true,
      },
    ]).returning();

    // Sample Orders
    logger.log('📋 Creating sample orders...', 'DatabaseSeeder');
    const orders = await db.insert(db.orders).values([
      {
        orderNumber: 'ORD-2024-001',
        customerId: users[3].id,
        status: 'pending',
        orderDate: new Date(),
        requiredDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        totalWeightKg: 50.0,
        totalVolumeCubicMeters: 0.5,
        subtotal: 500.00,
        taxAmount: 90.00,
        shippingCost: 50.00,
        totalAmount: 640.00,
        billingAddress: 'Customer Address, Istanbul, Turkey',
        shippingAddress: 'Delivery Address, Istanbul, Turkey',
        specialInstructions: 'Handle with care',
      },
    ]).returning();

    // Sample Order Items
    logger.log('📦 Creating sample order items...', 'DatabaseSeeder');
    const orderItems = await db.insert(db.orderItems).values([
      {
        orderId: orders[0].id,
        productId: products[0].id,
        quantity: 2,
        unitPrice: 50.00,
        totalPrice: 100.00,
        weightKg: 50.0,
        volumeCubicMeters: 0.288,
      },
      {
        orderId: orders[0].id,
        productId: products[1].id,
        quantity: 10,
        unitPrice: 5.00,
        totalPrice: 50.00,
        weightKg: 5.0,
        volumeCubicMeters: 0.09,
      },
    ]).returning();

    // Sample Routes
    logger.log('🗺️ Creating sample routes...', 'DatabaseSeeder');
    const routes = await db.insert(db.routes).values([
      {
        tenantId: defaultTenantId,
        routeName: 'Morning Delivery Route',
        driverId: drivers[0].id,
        vehicleId: vehicles[0].id,
        status: 'planned',
        startLocation: 'Istanbul Warehouse',
        endLocation: 'Istanbul Warehouse',
        totalDistanceKm: 45.5,
        estimatedDurationHours: 3.5,
      },
    ]).returning();

    // Sample Route Stops
    logger.log('📍 Creating sample route stops...', 'DatabaseSeeder');
    const routeStops = await db.insert(db.routeStops).values([
      {
        tenantId: defaultTenantId,
        routeId: routes[0].id,
        stopSequence: 1,
        customerName: 'ABC Company',
        address: '123 Business St',
        city: 'Istanbul',
        state: 'Istanbul',
        postalCode: '34000',
        country: 'Turkey',
        contactPhone: '+90 212 123 4567',
        contactEmail: 'contact@abc.com',
        latitude: 41.0082,
        longitude: 28.9784,
        estimatedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000),
        deliveryNotes: 'Call before delivery',
        isCompleted: false,
      },
      {
        tenantId: defaultTenantId,
        routeId: routes[0].id,
        stopSequence: 2,
        customerName: 'XYZ Corp',
        address: '456 Industrial Ave',
        city: 'Istanbul',
        state: 'Istanbul',
        postalCode: '34010',
        country: 'Turkey',
        contactPhone: '+90 212 987 6543',
        contactEmail: 'info@xyz.com',
        latitude: 41.0123,
        longitude: 28.9876,
        estimatedArrival: new Date(Date.now() + 4 * 60 * 60 * 1000),
        deliveryNotes: 'Gate code: 1234',
        isCompleted: false,
      },
    ]).returning();

    // Sample Deliveries
    logger.log('🚚 Creating sample deliveries...', 'DatabaseSeeder');
    const deliveries = await db.insert(db.deliveries).values([
      {
        orderId: orders[0].id,
        driverId: drivers[0].id,
        vehicleId: vehicles[0].id,
        routeId: routes[0].id,
        status: 'pending',
        scheduledPickupTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
        scheduledDeliveryTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        deliveryAddress: 'Delivery Address, Istanbul, Turkey',
        deliveryNotes: 'Handle with care',
        recipientName: 'John Doe',
        recipientPhone: '+90 555 123 4567',
      },
    ]).returning();

    // Sample Invoices
    logger.log('🧾 Creating sample invoices...', 'DatabaseSeeder');
    const invoices = await db.insert(db.invoices).values([
      {
        tenantId: defaultTenantId,
        invoiceNumber: 'INV-2024-001',
        customerId: users[3].id,
        orderId: orders[0].id,
        status: 'pending',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: 500.00,
        taxAmount: 90.00,
        totalAmount: 590.00,
        paidAmount: 0.00,
        paymentTerms: 'Net 30',
        notes: 'Thank you for your business',
      },
    ]).returning();

    // Sample Invoice Items
    logger.log('📄 Creating sample invoice items...', 'DatabaseSeeder');
    const { invoiceItems: invoiceItemsTable } = await import('../database/schema/shared/billing.schema');
    const invoiceItems = await db.insert(invoiceItemsTable).values([
      {
        tenantId: defaultTenantId,
        invoiceId: invoices[0].id,
        description: 'Standard Pallet x2',
        quantity: 2,
        unitPrice: 50.00,
        totalPrice: 100.00,
      },
      {
        tenantId: defaultTenantId,
        invoiceId: invoices[0].id,
        description: 'Cardboard Box Small x10',
        quantity: 10,
        unitPrice: 5.00,
        totalPrice: 50.00,
      },
      {
        tenantId: defaultTenantId,
        invoiceId: invoices[0].id,
        description: 'Logistics Service',
        quantity: 1,
        unitPrice: 350.00,
        totalPrice: 350.00,
      },
    ]).returning();

    // Sample Contracts
    logger.log('📋 Creating sample contracts...', 'DatabaseSeeder');
    const { contracts: contractsTable } = await import('../database/schema/shared/billing.schema');
    const contracts = await db.insert(contractsTable).values([
      {
        tenantId: defaultTenantId,
        contractNumber: 'CNT-2024-001',
        customerId: users[3].id,
        contractType: 'service_agreement',
        status: 'active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        contractValue: 50000.00,
        monthlyRate: 4166.67,
        paymentTerms: 'Net 30',
        contactPerson: 'John Doe',
        contactPhone: '+90 555 123 4567',
        contactEmail: 'john@abc.com',
        renewalDate: new Date('2024-11-01'),
        autoRenewal: true,
        termsAndConditions: 'Standard service agreement terms',
      },
    ]).returning();

    logger.log('✅ Database seeding completed successfully!', 'DatabaseSeeder');
    logger.log(`📊 Created:`, 'DatabaseSeeder');
    logger.log(`   - ${users.length} users`, 'DatabaseSeeder');
    logger.log(`   - ${warehouses.length} warehouses`, 'DatabaseSeeder');
    logger.log(`   - ${zones.length} warehouse zones`, 'DatabaseSeeder');
    logger.log(`   - ${locations.length} warehouse locations`, 'DatabaseSeeder');
    logger.log(`   - ${products.length} products`, 'DatabaseSeeder');
    logger.log(`   - ${batchLots.length} batch lots`, 'DatabaseSeeder');
    logger.log(`   - ${inventory.length} inventory items`, 'DatabaseSeeder');
    logger.log(`   - ${vehicles.length} vehicles`, 'DatabaseSeeder');
    logger.log(`   - ${drivers.length} drivers`, 'DatabaseSeeder');
    logger.log(`   - ${orders.length} orders`, 'DatabaseSeeder');
    logger.log(`   - ${orderItems.length} order items`, 'DatabaseSeeder');
    logger.log(`   - ${routes.length} routes`, 'DatabaseSeeder');
    logger.log(`   - ${routeStops.length} route stops`, 'DatabaseSeeder');
    logger.log(`   - ${deliveries.length} deliveries`, 'DatabaseSeeder');
    logger.log(`   - ${invoices.length} invoices`, 'DatabaseSeeder');
    logger.log(`   - ${invoiceItems.length} invoice items`, 'DatabaseSeeder');
    logger.log(`   - ${contracts.length} contracts`, 'DatabaseSeeder');

  } catch (error) {
    logger.logError(error, 'DatabaseSeeder', { message: 'Error seeding database' });
    throw error;
  } finally {
    await app.close();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.log('🎉 Seeding process completed!', 'DatabaseSeeder');
      process.exit(0);
    })
    .catch((error) => {
      logger.logError(error, 'DatabaseSeeder', { message: 'Seeding process failed' });
      process.exit(1);
    });
}

export { seedDatabase };