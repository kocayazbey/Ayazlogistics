-- Seed data migration
-- This migration populates the database with initial test data

-- Insert sample tenant
INSERT INTO tenants (id, name, domain, settings) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Ayaz Logistics', 'ayazlogistics.com', '{"timezone": "Europe/Istanbul", "currency": "TRY"}');

-- Insert sample warehouse
INSERT INTO warehouses (id, name, code, address, city, country, coordinates, tenant_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Main Warehouse', 'WH001', 'Atatürk Mahallesi, Lojistik Caddesi No:1', 'İstanbul', 'Turkey', ST_Point(28.9784, 41.0082), '550e8400-e29b-41d4-a716-446655440000');

-- Insert sample zones
INSERT INTO zones (id, name, code, description, warehouse_id, capacity, temperature_range, humidity_range, tenant_id) VALUES 
('550e8400-e29b-41d4-a716-446655440002', 'Electronics Zone', 'A', 'Electronics and technology products', '550e8400-e29b-41d4-a716-446655440001', 1000, '18-22°C', '45-55%', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440003', 'Food Zone', 'B', 'Food and perishable products', '550e8400-e29b-41d4-a716-446655440001', 800, '2-8°C', '40-50%', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440004', 'Textile Zone', 'C', 'Clothing and textile products', '550e8400-e29b-41d4-a716-446655440001', 1200, '20-25°C', '50-60%', '550e8400-e29b-41d4-a716-446655440000');

-- Insert sample locations
INSERT INTO locations (id, code, name, type, warehouse_id, zone_id, capacity, tenant_id) VALUES 
('550e8400-e29b-41d4-a716-446655440005', 'A1-01', 'Electronics Shelf A1-01', 'shelf', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 100, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440006', 'A1-02', 'Electronics Shelf A1-02', 'shelf', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 100, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440007', 'B1-01', 'Food Shelf B1-01', 'shelf', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 80, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440008', 'C1-01', 'Textile Shelf C1-01', 'shelf', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 120, '550e8400-e29b-41d4-a716-446655440000');

-- Insert sample products
INSERT INTO products (id, sku, name, description, category, supplier_id, unit_cost, unit_price, weight, height, width, length, tenant_id) VALUES 
('550e8400-e29b-41d4-a716-446655440009', 'LAPTOP001', 'Dell Laptop XPS 13', 'High-performance laptop for business use', 'Electronics', 'SUP001', 8000.00, 12000.00, 1.3, 30, 20, 2, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440010', 'PHONE001', 'iPhone 15 Pro', 'Latest iPhone model with advanced features', 'Electronics', 'SUP001', 25000.00, 35000.00, 0.2, 15, 7, 1, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440011', 'FOOD001', 'Organic Olive Oil', 'Premium quality organic olive oil', 'Food', 'SUP002', 50.00, 80.00, 0.5, 25, 8, 8, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440012', 'TEXTILE001', 'Cotton T-Shirt', '100% cotton comfortable t-shirt', 'Textile', 'SUP003', 25.00, 45.00, 0.2, 30, 25, 1, '550e8400-e29b-41d4-a716-446655440000');

-- Insert sample inventory
INSERT INTO inventory (id, product_id, location_id, zone_id, quantity_on_hand, min_quantity, max_quantity, unit_cost, status, batch_number, tenant_id, warehouse_id) VALUES 
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 50, 10, 100, 8000.00, 'available', 'BATCH001', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 25, 5, 50, 25000.00, 'available', 'BATCH002', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003', 100, 20, 200, 50.00, 'available', 'BATCH003', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440004', 200, 50, 500, 25.00, 'available', 'BATCH004', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001');

-- Insert sample users
INSERT INTO users (id, email, name, password, role, tenant_id, warehouse_id, is_active, permissions) VALUES 
('550e8400-e29b-41d4-a716-446655440017', 'admin@ayazlogistics.com', 'Admin User', '$2b$10$rQZ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8K', 'admin', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', true, '{"all"}'),
('550e8400-e29b-41d4-a716-446655440018', 'manager@ayazlogistics.com', 'Warehouse Manager', '$2b$10$rQZ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8K', 'warehouse_manager', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', true, '{"wms"}'),
('550e8400-e29b-41d4-a716-446655440019', 'driver@ayazlogistics.com', 'Driver User', '$2b$10$rQZ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8K', 'driver', '550e8400-e29b-41d4-a716-446655440000', null, true, '{"tms"}');

-- Insert sample vehicles
INSERT INTO vehicles (id, plate_number, make, model, year, capacity, status, tenant_id) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '34ABC123', 'Mercedes', 'Sprinter', 2023, 3500.00, 'available', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440021', '34DEF456', 'Ford', 'Transit', 2022, 2500.00, 'available', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440022', '34GHI789', 'Volkswagen', 'Crafter', 2023, 4000.00, 'in_use', '550e8400-e29b-41d4-a716-446655440000');

-- Insert sample drivers
INSERT INTO drivers (id, name, email, phone, license_number, license_expiry, status, tenant_id) VALUES 
('550e8400-e29b-41d4-a716-446655440023', 'Ahmet Yılmaz', 'ahmet.yilmaz@ayazlogistics.com', '+905551234567', 'DL123456', '2025-12-31', 'active', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440024', 'Mehmet Demir', 'mehmet.demir@ayazlogistics.com', '+905559876543', 'DL789012', '2026-06-30', 'active', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440025', 'Ayşe Kaya', 'ayse.kaya@ayazlogistics.com', '+905556543210', 'DL345678', '2025-09-15', 'active', '550e8400-e29b-41d4-a716-446655440000');

-- Insert sample routes
INSERT INTO routes (id, route_number, vehicle_id, driver_id, status, distance, duration, start_latitude, start_longitude, end_latitude, end_longitude, planned_duration, tenant_id, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440026', 'RT001', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440023', 'planned', 150.5, 120, 28.9784, 41.0082, 29.0000, 41.1000, 120, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440017'),
('550e8400-e29b-41d4-a716-446655440027', 'RT002', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440024', 'in_progress', 200.0, 180, 28.9784, 41.0082, 29.2000, 41.2000, 180, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440017'),
('550e8400-e29b-41d4-a716-446655440028', 'RT003', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440025', 'completed', 300.0, 240, 28.9784, 41.0082, 29.4000, 41.3000, 240, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440017');

-- Insert sample route stops
INSERT INTO route_stops (id, route_id, name, address, city, latitude, longitude, sequence, status, planned_arrival, planned_departure) VALUES 
('550e8400-e29b-41d4-a716-446655440029', '550e8400-e29b-41d4-a716-446655440026', 'Stop 1 - Kadıköy', 'Kadıköy Merkez, İstanbul', 'İstanbul', 29.0275, 40.9900, 1, 'pending', '2025-01-01 09:00:00', '2025-01-01 09:30:00'),
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440026', 'Stop 2 - Beşiktaş', 'Beşiktaş Merkez, İstanbul', 'İstanbul', 29.0100, 41.0400, 2, 'pending', '2025-01-01 10:00:00', '2025-01-01 10:30:00'),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440027', 'Stop 1 - Şişli', 'Şişli Merkez, İstanbul', 'İstanbul', 28.9870, 41.0600, 1, 'arrived', '2025-01-01 08:00:00', '2025-01-01 08:30:00'),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440027', 'Stop 2 - Mecidiyeköy', 'Mecidiyeköy Merkez, İstanbul', 'İstanbul', 28.9800, 41.0700, 2, 'completed', '2025-01-01 09:00:00', '2025-01-01 09:30:00');

-- Insert sample receipts
INSERT INTO receipts (id, receipt_number, supplier, status, total_value, tenant_id, warehouse_id) VALUES 
('550e8400-e29b-41d4-a716-446655440033', 'REC001', 'Tech Supplier Inc.', 'pending', 50000.00, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440034', 'REC002', 'Food Supplier Ltd.', 'approved', 25000.00, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440035', 'REC003', 'Textile Supplier Co.', 'in_progress', 15000.00, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001');

-- Insert sample picks
INSERT INTO picks (id, pick_number, order_id, customer, status, priority, assigned_to, total_value, tenant_id, warehouse_id) VALUES 
('550e8400-e29b-41d4-a716-446655440036', 'PICK001', 'ORD001', 'ABC Company', 'pending', 'high', null, 15000.00, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440037', 'PICK002', 'ORD002', 'XYZ Corp', 'assigned', 'normal', 'operator001', 8500.00, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440038', 'PICK003', 'ORD003', 'DEF Industries', 'in_progress', 'urgent', 'operator002', 12000.00, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001');

-- Insert sample shipments
INSERT INTO shipments (id, shipment_number, order_id, customer, status, priority, driver_id, vehicle_id, total_value, destination, carrier, tenant_id, warehouse_id) VALUES 
('550e8400-e29b-41d4-a716-446655440039', 'SHP001', 'ORD001', 'ABC Company', 'ready', 'high', '550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440020', 15000.00, 'İstanbul', 'Ayaz Logistics', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440040', 'SHP002', 'ORD002', 'XYZ Corp', 'in_transit', 'normal', '550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440021', 8500.00, 'Ankara', 'Ayaz Logistics', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440041', 'SHP003', 'ORD003', 'DEF Industries', 'delivered', 'urgent', '550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440022', 12000.00, 'İzmir', 'Ayaz Logistics', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001');

-- Insert sample operations
INSERT INTO operations (id, operation_number, type, status, description, operator, items_count, duration, tenant_id, warehouse_id) VALUES 
('550e8400-e29b-41d4-a716-446655440042', 'OP001', 'receiving', 'completed', 'Mal kabul işlemi', 'Ahmet Yılmaz', 15, 120, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440043', 'OP002', 'picking', 'in_progress', 'Toplama işlemi', 'Mehmet Demir', 8, 45, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440044', 'OP003', 'shipping', 'pending', 'Sevkiyat işlemi', 'Ayşe Kaya', 12, 90, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001');
