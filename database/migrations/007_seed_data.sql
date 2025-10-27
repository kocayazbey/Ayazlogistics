-- Seed Data Migration
-- This migration populates the database with test data for development and testing

-- ============================================
-- TENANTS (Multi-tenant setup)
-- ============================================

INSERT INTO tenants (id, name, code, domain, status, settings, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Ayaz Logistics Main', 'AYAZ_MAIN', 'ayazlogistics.com', 'active',
     '{"timezone": "Europe/Istanbul", "currency": "TRY", "language": "tr", "features": ["tms", "wms", "crm", "billing"]}',
     NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440002', 'Ayaz Logistics Demo', 'AYAZ_DEMO', 'demo.ayazlogistics.com', 'active',
     '{"timezone": "Europe/Istanbul", "currency": "TRY", "language": "tr", "features": ["tms", "wms", "crm"]}',
     NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440003', 'Ayaz Express', 'AYAZ_EXPRESS', 'express.ayazlogistics.com', 'active',
     '{"timezone": "Europe/Istanbul", "currency": "TRY", "language": "tr", "features": ["tms", "express_delivery"]}',
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USERS (System users)
-- ============================================

INSERT INTO users (id, tenant_id, email, password_hash, name, role, is_active, last_login_at, created_at, updated_at) VALUES
    -- Admin users
    ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001',
     'admin@ayazlogistics.com', '$2b$10$example.hash.for.admin', 'System Admin', 'admin', true, NOW(), NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001',
     'manager@ayazlogistics.com', '$2b$10$example.hash.for.manager', 'Operations Manager', 'manager', true, NOW(), NOW(), NOW()),

    -- Warehouse operators
    ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001',
     'warehouse@ayazlogistics.com', '$2b$10$example.hash.for.warehouse', 'Ahmet Yılmaz', 'warehouse_operator', true, NOW(), NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001',
     'depo@ayazlogistics.com', '$2b$10$example.hash.for.depo', 'Mehmet Kaya', 'warehouse_operator', true, NOW(), NOW(), NOW()),

    -- Forklift operators
    ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440001',
     'forklift@ayazlogistics.com', '$2b$10$example.hash.for.forklift', 'Ali Çelik', 'forklift_operator', true, NOW(), NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440001',
     'istif@ayazlogistics.com', '$2b$10$example.hash.for.istif', 'Fatma Şahin', 'forklift_operator', true, NOW(), NOW(), NOW()),

    -- Drivers
    ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440001',
     'driver@ayazlogistics.com', '$2b$10$example.hash.for.driver', 'Hasan Aksoy', 'driver', true, NOW(), NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440001',
     'surucu@ayazlogistics.com', '$2b$10$example.hash.for.surucu', 'Ayşe Kara', 'driver', true, NOW(), NOW(), NOW()),

    -- Customers
    ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440001',
     'customer@ayazlogistics.com', '$2b$10$example.hash.for.customer', 'Müşteri Demo', 'customer', true, NOW(), NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001',
     'musteri@ayazlogistics.com', '$2b$10$example.hash.for.musteri', 'Test Müşteri', 'customer', true, NOW(), NOW(), NOW()),

    -- Accounting staff
    ('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440001',
     'accountant@ayazlogistics.com', '$2b$10$example.hash.for.accountant', 'Muhasebe Sorumlusu', 'accountant', true, NOW(), NOW(), NOW()),

    -- Sales representatives
    ('550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440001',
     'sales@ayazlogistics.com', '$2b$10$example.hash.for.sales', 'Satış Temsilcisi', 'sales_representative', true, NOW(), NOW(), NOW()),

    -- HR managers
    ('550e8400-e29b-41d4-a716-446655440080', '550e8400-e29b-41d4-a716-446655440001',
     'hr@ayazlogistics.com', '$2b$10$example.hash.for.hr', 'İnsan Kaynakları', 'hr_manager', true, NOW(), NOW(), NOW()),

    -- Supervisors
    ('550e8400-e29b-41d4-a716-446655440090', '550e8400-e29b-41d4-a716-446655440001',
     'supervisor@ayazlogistics.com', '$2b$10$example.hash.for.supervisor', 'Vardiya Amiri', 'supervisor', true, NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- WAREHOUSES (Storage locations)
-- ============================================

INSERT INTO warehouses (id, tenant_id, code, name, address, city, country, capacity, current_utilization, status, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440001',
     'DEP-A', 'Ana Depo A', 'İstanbul Caddesi No:123', 'İstanbul', 'Türkiye', 50000, 0.65, 'active', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001',
     'DEP-B', 'Ana Depo B', 'Ankara Bulvarı No:456', 'Ankara', 'Türkiye', 30000, 0.45, 'active', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001',
     'DEP-C', 'İzmir Deposu', 'İzmir Yolu No:789', 'İzmir', 'Türkiye', 25000, 0.80, 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CUSTOMERS (Client data)
-- ============================================

INSERT INTO customers (id, tenant_id, customer_number, name, email, phone, company, address, city, country, postal_code, type, status, customer_value, source, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440001',
     'CUST-001', 'ABC Tekstil Ltd. Şti.', 'info@abctekstil.com', '+90 216 555 0001', 'ABC Tekstil', 'Bağdat Caddesi No:100', 'İstanbul', 'Türkiye', '34710', 'business', 'active', 50000.00, 'website', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440001',
     'CUST-002', 'XYZ Elektronik A.Ş.', 'contact@xyzelektronik.com', '+90 312 555 0002', 'XYZ Elektronik', 'Kızılay Meydanı No:50', 'Ankara', 'Türkiye', '06650', 'business', 'active', 75000.00, 'referral', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440001',
     'CUST-003', 'Demo Müşteri Bireysel', 'demo@musteri.com', '+90 533 555 0003', NULL, 'Atatürk Mah. No:25', 'İzmir', 'Türkiye', '35100', 'individual', 'active', 1500.00, 'social_media', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440001',
     'CUST-004', 'Test Company Inc.', 'test@testcompany.com', '+90 544 555 0004', 'Test Company', 'Test Sokak No:1', 'İstanbul', 'Türkiye', '34000', 'business', 'inactive', 0.00, 'cold_call', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INVENTORY ITEMS (Stock data)
-- ============================================

INSERT INTO inventory_items (id, tenant_id, sku, name, description, category, quantity, min_stock_level, unit_cost, warehouse_location, supplier, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440001',
     'TXT-001', 'Pamuklu Tişört', 'Yüksek kaliteli pamuklu tişört', 'Tekstil', 1500, 200, 25.50, 'DEP-A-R01-S01', 'ABC Tekstil', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440001',
     'TXT-002', 'Kot Pantolon', 'Klasik kot pantolon', 'Tekstil', 800, 100, 85.00, 'DEP-A-R01-S02', 'XYZ Jeans', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440001',
     'ELK-001', 'LED Ampul', 'Enerji tasarruflu LED ampul', 'Elektronik', 2000, 300, 12.75, 'DEP-B-R02-S01', 'LightTech', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440001',
     'ELK-002', 'USB Kablo', 'Hızlı şarj USB kablo', 'Elektronik', 500, 50, 8.25, 'DEP-B-R02-S02', 'ConnectTech', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440001',
     'LOW-001', 'Düşük Stok Test Ürünü', 'Stok seviyesi düşük test ürünü', 'Test', 5, 50, 100.00, 'DEP-A-R01-S03', 'Test Supplier', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440001',
     'ZERO-001', 'Stokta Yok Ürün', 'Stokta olmayan test ürünü', 'Test', 0, 10, 50.00, 'DEP-A-R01-S04', 'Test Supplier', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ORDERS (Customer orders)
-- ============================================

INSERT INTO orders (id, tenant_id, order_number, customer_id, order_date, status, total_amount, currency, shipping_address, notes, created_by, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440001',
     'ORD-2024-001', '550e8400-e29b-41d4-a716-446655440200', NOW() - INTERVAL '5 days', 'delivered',
     1250.00, 'TRY', 'Bağdat Caddesi No:100, İstanbul', 'Acil teslimat', '550e8400-e29b-41d4-a716-446655440050', NOW() - INTERVAL '5 days', NOW()),

    ('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440001',
     'ORD-2024-002', '550e8400-e29b-41d4-a716-446655440201', NOW() - INTERVAL '3 days', 'in_transit',
     3400.00, 'TRY', 'Kızılay Meydanı No:50, Ankara', 'Standart teslimat', '550e8400-e29b-41d4-a716-446655440050', NOW() - INTERVAL '3 days', NOW()),

    ('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440001',
     'ORD-2024-003', '550e8400-e29b-41d4-a716-446655440202', NOW() - INTERVAL '1 day', 'processing',
     275.50, 'TRY', 'Atatürk Mah. No:25, İzmir', 'Test siparişi', '550e8400-e29b-41d4-a716-446655440050', NOW() - INTERVAL '1 day', NOW()),

    ('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440001',
     'ORD-2024-004', '550e8400-e29b-41d4-a716-446655440200', NOW() - INTERVAL '2 hours', 'confirmed',
     890.00, 'TRY', 'Bağdat Caddesi No:100, İstanbul', 'Yeni sipariş', '550e8400-e29b-41d4-a716-446655440050', NOW() - INTERVAL '2 hours', NOW()),

    ('550e8400-e29b-41d4-a716-446655440404', '550e8400-e29b-41d4-a716-446655440001',
     'ORD-2024-005', '550e8400-e29b-41d4-a716-446655440203', NOW() - INTERVAL '6 hours', 'pending',
     0.00, 'TRY', 'Test Sokak No:1, İstanbul', 'Onay bekleyen sipariş', '550e8400-e29b-41d4-a716-446655440050', NOW() - INTERVAL '6 hours', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SHIPMENTS (Delivery tracking)
-- ============================================

INSERT INTO shipments (id, tenant_id, tracking_number, order_id, status, weight_kg, dimensions_cm, value, sender_address, receiver_address, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440500', '550e8400-e29b-41d4-a716-446655440001',
     'TRK-2024-001', '550e8400-e29b-41d4-a716-446655440400', 'delivered',
     15.5, '30x20x10', 1250.00, 'Ana Depo A, İstanbul', 'Bağdat Caddesi No:100, İstanbul',
     NOW() - INTERVAL '5 days', NOW()),

    ('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440001',
     'TRK-2024-002', '550e8400-e29b-41d4-a716-446655440401', 'in_transit',
     45.2, '60x40x30', 3400.00, 'Ana Depo B, Ankara', 'Kızılay Meydanı No:50, Ankara',
     NOW() - INTERVAL '3 days', NOW()),

    ('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440001',
     'TRK-2024-003', '550e8400-e29b-41d4-a716-446655440402', 'processing',
     2.1, '15x10x5', 275.50, 'Ana Depo A, İstanbul', 'Atatürk Mah. No:25, İzmir',
     NOW() - INTERVAL '1 day', NOW()),

    ('550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440001',
     'TRK-2024-004', '550e8400-e29b-41d4-a716-446655440403', 'pending',
     8.7, '25x15x8', 890.00, 'Ana Depo A, İstanbul', 'Bağdat Caddesi No:100, İstanbul',
     NOW() - INTERVAL '2 hours', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VEHICLES (Fleet data)
-- ============================================

INSERT INTO tms_vehicles (id, tenant_id, vehicle_number, license_plate, vehicle_type, make, model, year, capacity, max_weight, fuel_type, status, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440600', '550e8400-e29b-41d4-a716-446655440001',
     'VH-001', '34 ABC 123', 'truck', 'Mercedes', 'Actros', 2022, 24000, 24000, 'diesel', 'available', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440001',
     'VH-002', '34 DEF 456', 'van', 'Ford', 'Transit', 2021, 1200, 1200, 'diesel', 'in_use', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440001',
     'VH-003', '34 GHI 789', 'truck', 'Volvo', 'FH16', 2023, 25000, 25000, 'diesel', 'available', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440001',
     'VH-004', '34 JKL 012', 'car', 'Toyota', 'Corolla', 2020, 500, 500, 'gasoline', 'maintenance', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440001',
     'VH-005', '34 MNO 345', 'van', 'Volkswagen', 'Crafter', 2022, 1500, 1500, 'electric', 'available', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DRIVERS (Driver information)
-- ============================================

INSERT INTO tms_drivers (id, tenant_id, driver_number, first_name, last_name, phone, email, license_number, license_expiry, status, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440700', '550e8400-e29b-41d4-a716-446655440001',
     'DRV-001', 'Hasan', 'Aksoy', '+90 533 111 1111', 'hasan.aksoy@ayazlogistics.com', 'SRC-123456789', '2026-12-31', 'available', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440001',
     'DRV-002', 'Ayşe', 'Kara', '+90 533 222 2222', 'ayse.kara@ayazlogistics.com', 'SRC-987654321', '2025-08-15', 'busy', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440702', '550e8400-e29b-41d4-a716-446655440001',
     'DRV-003', 'Mehmet', 'Yıldız', '+90 533 333 3333', 'mehmet.yildiz@ayazlogistics.com', 'SRC-555666777', '2027-03-20', 'available', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440703', '550e8400-e29b-41d4-a716-446655440001',
     'DRV-004', 'Fatma', 'Çelik', '+90 533 444 4444', 'fatma.celik@ayazlogistics.com', 'SRC-888999000', '2025-11-10', 'off_duty', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ROUTES (Delivery routes)
-- ============================================

INSERT INTO tms_routes (id, tenant_id, route_number, vehicle_id, driver_id, route_date, status, total_distance, estimated_duration, total_stops, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440800', '550e8400-e29b-41d4-a716-446655440001',
     'RT-2024-001', '550e8400-e29b-41d4-a716-446655440600', '550e8400-e29b-41d4-a716-446655440700',
     CURRENT_DATE, 'completed', 245.5, 480, 8, NOW() - INTERVAL '1 day', NOW()),

    ('550e8400-e29b-41d4-a716-446655440801', '550e8400-e29b-41d4-a716-446655440001',
     'RT-2024-002', '550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440701',
     CURRENT_DATE, 'in_progress', 156.8, 320, 5, NOW() - INTERVAL '2 hours', NOW()),

    ('550e8400-e29b-41d4-a716-446655440802', '550e8400-e29b-41d4-a716-446655440001',
     'RT-2024-003', '550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440702',
     CURRENT_DATE + INTERVAL '1 day', 'planned', 89.3, 180, 3, NOW() - INTERVAL '30 minutes', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ROUTE STOPS (Delivery points)
-- ============================================

INSERT INTO tms_route_stops (id, route_id, stop_sequence, stop_type, customer_name, address, latitude, longitude, status, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440900', '550e8400-e29b-41d4-a716-446655440800', 1, 'pickup', 'Ana Depo A', 'İstanbul Caddesi No:123, İstanbul', 41.0082, 28.9784, 'completed', NOW()),
    ('550e8400-e29b-41d4-a716-446655440901', '550e8400-e29b-41d4-a716-446655440800', 2, 'delivery', 'ABC Tekstil Ltd. Şti.', 'Bağdat Caddesi No:100, İstanbul', 40.9898, 29.0307, 'completed', NOW()),
    ('550e8400-e29b-41d4-a716-446655440902', '550e8400-e29b-41d4-a716-446655440800', 3, 'delivery', 'XYZ Elektronik A.Ş.', 'Kızılay Meydanı No:50, Ankara', 39.9208, 32.8541, 'completed', NOW()),

    ('550e8400-e29b-41d4-a716-446655440903', '550e8400-e29b-41d4-a716-446655440801', 1, 'pickup', 'Ana Depo B', 'Ankara Bulvarı No:456, Ankara', 39.9334, 32.8597, 'completed', NOW()),
    ('550e8400-e29b-41d4-a716-446655440904', '550e8400-e29b-41d4-a716-446655440801', 2, 'delivery', 'Demo Müşteri', 'Atatürk Mah. No:25, İzmir', 38.4237, 27.1428, 'in_progress', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- GPS TRACKING (Vehicle positions)
-- ============================================

INSERT INTO tms_gps_tracking (id, tenant_id, vehicle_id, latitude, longitude, speed, heading, timestamp, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440910', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440600', 41.0082, 28.9784, 0, 0, NOW() - INTERVAL '1 hour', NOW()),

    ('550e8400-e29b-41d4-a716-446655440911', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440601', 40.9898, 29.0307, 45.5, 180, NOW() - INTERVAL '30 minutes', NOW()),

    ('550e8400-e29b-41d4-a716-446655440912', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440602', 39.9208, 32.8541, 0, 0, NOW() - INTERVAL '15 minutes', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- BILLING CONTRACTS (Customer agreements)
-- ============================================

INSERT INTO billing_contracts (id, tenant_id, contract_number, customer_id, contract_type, start_date, end_date, status, billing_cycle, payment_terms, currency, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440920', '550e8400-e29b-41d4-a716-446655440001',
     'CONT-2024-001', '550e8400-e29b-41d4-a716-446655440200', 'storage_contract',
     '2024-01-01', '2024-12-31', 'active', 'monthly', '30_days', 'TRY', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440921', '550e8400-e29b-41d4-a716-446655440001',
     'CONT-2024-002', '550e8400-e29b-41d4-a716-446655440201', 'logistics_contract',
     '2024-03-01', '2025-02-28', 'active', 'monthly', '15_days', 'TRY', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- BILLING RATES (Pricing structures)
-- ============================================

INSERT INTO billing_rates (id, contract_id, rate_type, rate_name, unit_of_measure, rate_amount, minimum_charge, currency, valid_from, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440930', '550e8400-e29b-41d4-a716-446655440920',
     'storage', 'Palet Depolama', 'pallet_month', 150.00, 150.00, 'TRY', '2024-01-01', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440931', '550e8400-e29b-41d4-a716-446655440920',
     'handling', 'Mal Kabul/Çıkış', 'movement', 25.00, 25.00, 'TRY', '2024-01-01', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440932', '550e8400-e29b-41d4-a716-446655440921',
     'transportation', 'Şehir İçi Nakliye', 'km', 5.50, 50.00, 'TRY', '2024-03-01', NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440933', '550e8400-e29b-41d4-a716-446655440921',
     'express_delivery', 'Hızlı Teslimat', 'delivery', 75.00, 75.00, 'TRY', '2024-03-01', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- AI MODELS (Machine learning models)
-- ============================================

INSERT INTO ai_models (id, name, type, algorithm, version, status, performance, endpoints, metadata, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440940', 'LSTM Demand Forecaster', 'forecasting', 'lstm', '1.0.0', 'active',
     '{"latency": 150, "throughput": 100, "memoryUsage": 512}',
     '{"inference": "http://localhost:8001/predict", "health": "http://localhost:8001/health"}',
     '{"description": "LSTM-based demand forecasting model", "features": ["historical_sales", "seasonality", "trends"]}',
     NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440941', 'Route Optimizer GA', 'optimization', 'genetic_algorithm', '2.1.0', 'active',
     '{"latency": 300, "throughput": 50, "memoryUsage": 1024}',
     '{"inference": "http://localhost:8002/optimize", "health": "http://localhost:8002/health"}',
     '{"description": "Multi-objective route optimization", "constraints": ["time_windows", "vehicle_capacity", "driver_hours"]}',
     NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440942', 'Fraud Detector RF', 'classification', 'random_forest', '1.5.0', 'active',
     '{"latency": 50, "throughput": 200, "memoryUsage": 256}',
     '{"inference": "http://localhost:8003/detect", "health": "http://localhost:8003/health"}',
     '{"description": "Fraud detection using ensemble methods", "features": ["transaction_amount", "location", "time", "user_behavior"]}',
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SYSTEM SETTINGS (Configuration)
-- ============================================

INSERT INTO system_settings (id, tenant_id, category, key, value, description, is_public, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440950', '550e8400-e29b-41d4-a716-446655440001',
     'general', 'company_name', 'Ayaz Logistics', 'Company name for branding', true, NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440951', '550e8400-e29b-41d4-a716-446655440001',
     'general', 'default_currency', 'TRY', 'Default currency for all transactions', true, NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440952', '550e8400-e29b-41d4-a716-446655440001',
     'general', 'timezone', 'Europe/Istanbul', 'Default timezone', true, NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440953', '550e8400-e29b-41d4-a716-446655440001',
     'warehouse', 'default_warehouse_id', '550e8400-e29b-41d4-a716-446655440100', 'Default warehouse for operations', true, NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440954', '550e8400-e29b-41d4-a716-446655440001',
     'billing', 'tax_rate', '0.18', 'Default VAT rate (18%)', false, NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440955', '550e8400-e29b-41d4-a716-446655440001',
     'notifications', 'email_enabled', 'true', 'Enable email notifications', true, NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440956', '550e8400-e29b-41d4-a716-446655440001',
     'security', 'session_timeout', '3600', 'Session timeout in seconds', false, NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440957', '550e8400-e29b-41d4-a716-446655440001',
     'ai', 'enable_predictions', 'true', 'Enable AI predictions', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ACTIVITY LOGS (Audit trail)
-- ============================================

INSERT INTO audit_logs (id, tenant_id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440960', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440010', 'USER_LOGIN', 'users', '550e8400-e29b-41d4-a716-446655440010',
     NULL, '{"last_login_at": "' || NOW() || '"}', '192.168.1.100', 'Mozilla/5.0', NOW()),

    ('550e8400-e29b-41d4-a716-446655440961', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440020', 'INVENTORY_UPDATE', 'inventory_items', '550e8400-e29b-41d4-a716-446655440300',
     '{"quantity": 1600}', '{"quantity": 1500}', '192.168.1.101', 'AyazLogistics-App/1.0', NOW() - INTERVAL '1 hour'),

    ('550e8400-e29b-41d4-a716-446655440962', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440050', 'ORDER_CREATE', 'orders', '550e8400-e29b-41d4-a716-446655440403',
     NULL, '{"order_number": "ORD-2024-004", "status": "confirmed"}', '192.168.1.102', 'Chrome/120.0', NOW() - INTERVAL '2 hours'),

    ('550e8400-e29b-41d4-a716-446655440963', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440040', 'SHIPMENT_UPDATE', 'shipments', '550e8400-e29b-41d4-a716-446655440501',
     '{"status": "picked_up"}', '{"status": "in_transit"}', '192.168.1.103', 'Mobile-App/2.1', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- NOTIFICATIONS (System notifications)
-- ============================================

INSERT INTO notifications (id, tenant_id, user_id, type, title, message, priority, is_read, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440970', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440020', 'inventory', 'Düşük Stok Uyarısı',
     'TXT-001 ürününün stok seviyesi minimum seviyenin altına düştü.', 'high', false, NOW() - INTERVAL '30 minutes'),

    ('550e8400-e29b-41d4-a716-446655440971', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440050', 'order', 'Yeni Sipariş',
     'ORD-2024-004 numaralı sipariş onaylandı.', 'medium', false, NOW() - INTERVAL '2 hours'),

    ('550e8400-e29b-41d4-a716-446655440972', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440040', 'shipment', 'Teslimat Tamamlandı',
     'TRK-2024-001 numaralı sevkiyat başarıyla teslim edildi.', 'low', true, NOW() - INTERVAL '1 day'),

    ('550e8400-e29b-41d4-a716-446655440973', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440010', 'system', 'Sistem Bakımı',
     'Bu akşam 02:00-04:00 saatleri arasında planlı bakım yapılacaktır.', 'medium', false, NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PORTAL USERS (Customer portal)
-- ============================================

INSERT INTO portal_users (id, tenant_id, customer_id, email, password, first_name, last_name, phone, role, is_active, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440980', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440200', 'portal@abctekstil.com', '$2b$10$example.hash.for.portal',
     'Portal', 'Kullanıcı', '+90 216 555 0101', 'customer_user', true, NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440981', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440201', 'portal@xyzelektronik.com', '$2b$10$example.hash.for.portal2',
     'Elektronik', 'Portal', '+90 312 555 0102', 'customer_admin', true, NOW(), NOW()),

    ('550e8400-e29b-41d4-a716-446655440982', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440202', 'demo@musteri.com', '$2b$10$example.hash.for.demo',
     'Demo', 'Müşteri', '+90 533 555 0103', 'customer_user', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MOBILE TASKS (Warehouse tasks)
-- ============================================

INSERT INTO wms_tasks (id, tenant_id, task_type, title, description, assigned_to, priority, status, location, estimated_duration, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440990', '550e8400-e29b-41d4-a716-446655440001',
     'picking', 'Sipariş Toplama', 'ORD-2024-004 için malzeme toplama', '550e8400-e29b-41d4-a716-446655440030', 'high', 'pending',
     'DEP-A-R01-S01', 30, NOW() - INTERVAL '1 hour', NOW()),

    ('550e8400-e29b-41d4-a716-446655440991', '550e8400-e29b-41d4-a716-446655440001',
     'putaway', 'Raf Düzenleme', 'Yeni gelen malların raflara yerleştirilmesi', '550e8400-e29b-41d4-a716-446655440031', 'medium', 'in_progress',
     'DEP-A-R02-S03', 45, NOW() - INTERVAL '2 hours', NOW()),

    ('550e8400-e29b-41d4-a716-446655440992', '550e8400-e29b-41d4-a716-446655440001',
     'cycle_count', 'Dönemsel Sayım', 'A koridoru sayım işlemi', '550e8400-e29b-41d4-a716-446655440020', 'low', 'completed',
     'DEP-A-R01', 60, NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- QUALITY CHECKS (Product quality)
-- ============================================

INSERT INTO wms_quality_checks (id, tenant_id, item_id, check_type, result, checked_by, notes, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440995', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440300', 'incoming_inspection', 'passed',
     '550e8400-e29b-41d4-a716-446655440020', 'Ürünler iyi durumda, ambalaj tam', NOW() - INTERVAL '3 hours'),

    ('550e8400-e29b-41d4-a716-446655440996', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440301', 'outgoing_inspection', 'passed',
     '550e8400-e29b-41d4-a716-446655440021', 'Sevkiyata hazır, hasar yok', NOW() - INTERVAL '1 hour'),

    ('550e8400-e29b-41d4-a716-446655440997', '550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440302', 'cycle_count', 'failed',
     '550e8400-e29b-41d4-a716-446655440020', 'Eksik ürün tespit edildi, sayım tekrarlanacak', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- REFRESH MATERIALIZED VIEWS
-- ============================================

-- Refresh materialized views with new data
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_order_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY weekly_inventory_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_shipment_performance;

-- ============================================
-- UPDATE STATISTICS
-- ============================================

ANALYZE;

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Seed data migration completed successfully at %', NOW();
    RAISE NOTICE 'Created % tenants, % users, % customers, % orders, % shipments', 3, 12, 4, 5, 4;
    RAISE NOTICE 'Demo credentials available in mobile app login screen';
END $$;
