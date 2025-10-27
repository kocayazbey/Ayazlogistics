-- Performance Index Migration
-- Created: 2025-01-27
-- Description: Critical performance indexes for high-traffic tables

-- =============================================
-- WMS TABLES INDEXES
-- =============================================

-- Inventory table indexes (high frequency queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_tenant_sku ON inventory(tenant_id, sku);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_warehouse_status ON inventory(warehouse_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_product_location ON inventory(product_id, location_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_quantity_status ON inventory(tenant_id, quantity, status) WHERE status = 'available';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_category ON inventory(tenant_id, category);

-- Shipments table indexes (real-time tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_tenant_number ON shipments(tenant_id, shipment_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_status_dates ON shipments(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_driver_dates ON shipments(driver_id, created_at DESC) WHERE driver_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_warehouse_status ON shipments(warehouse_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_customer_status ON shipments(tenant_id, status, created_at DESC);

-- Receiving orders indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receiving_orders_tenant_number ON receiving_orders(tenant_id, receiving_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receiving_orders_warehouse_status ON receiving_orders(warehouse_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receiving_orders_dates ON receiving_orders(expected_date, received_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receiving_orders_status_dates ON receiving_orders(status, created_at DESC);

-- Picking orders indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_picking_orders_tenant_number ON picking_orders(tenant_id, picking_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_picking_orders_warehouse_status ON picking_orders(warehouse_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_picking_orders_picker_status ON picking_orders(picker_id, status) WHERE picker_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_picking_orders_priority_dates ON picking_orders(priority, created_at DESC);

-- =============================================
-- TMS TABLES INDEXES
-- =============================================

-- Routes table indexes (route optimization)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_tenant_date_status ON routes(tenant_id, route_date, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_driver_date ON routes(driver_id, route_date) WHERE driver_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_vehicle_date ON routes(vehicle_id, route_date) WHERE vehicle_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_status_dates ON routes(status, started_at, completed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_optimization ON routes(tenant_id, route_date, optimization_algorithm) WHERE optimization_algorithm IS NOT NULL;

-- Route stops indexes (stop sequence queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_route_stops_route_sequence ON route_stops(route_id, stop_sequence);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_route_stops_status_sequence ON route_stops(status, stop_sequence);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_route_stops_location ON route_stops(latitude, longitude);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_route_stops_customer ON route_stops(tenant_id, customer_name) WHERE customer_name IS NOT NULL;

-- Vehicles table indexes (fleet management)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_tenant_status ON vehicles(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_gps ON vehicles(gps_device) WHERE gps_device IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_maintenance ON vehicles(tenant_id, status) WHERE status = 'maintenance';

-- Drivers table indexes (driver assignment)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_tenant_status ON drivers(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_license_expiry ON drivers(license_expiry) WHERE license_expiry > CURRENT_DATE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_phone ON drivers(phone);

-- =============================================
-- TRACKING TABLES INDEXES
-- =============================================

-- Vehicle tracking indexes (real-time GPS data)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_tracking_tenant_timestamp ON vehicle_tracking(tenant_id, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_tracking_vehicle_timestamp ON vehicle_tracking(vehicle_id, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_tracking_location ON vehicle_tracking(latitude, longitude, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_tracking_speed ON vehicle_tracking(vehicle_id, speed DESC) WHERE speed > 0;

-- Shipment tracking indexes (package tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipment_tracking_tenant_timestamp ON shipment_tracking(tenant_id, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipment_tracking_shipment_status ON shipment_tracking(shipment_id, status, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipment_tracking_location ON shipment_tracking(latitude, longitude, timestamp DESC) WHERE latitude IS NOT NULL;

-- Geofences indexes (location-based alerts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_geofences_tenant_active ON geofences(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_geofences_location ON geofences(center_lat, center_lng, radius) WHERE geofence_type = 'circle';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_geofences_polygon ON geofences USING GIN (polygon) WHERE polygon IS NOT NULL;

-- SLA metrics indexes (performance reporting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sla_metrics_tenant_customer ON sla_metrics(tenant_id, customer_id, period_start DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sla_metrics_type_period ON sla_metrics(metric_type, period_start DESC, period_end DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sla_metrics_achievement ON sla_metrics(achievement_rate DESC) WHERE achievement_rate < 95;

-- =============================================
-- SHARED TABLES INDEXES
-- =============================================

-- Orders table indexes (order management)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_dates ON orders(customer_id, created_at DESC) WHERE customer_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tracking_code ON orders(tracking_code) WHERE tracking_code IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_priority_dates ON orders(priority, created_at DESC);

-- Products table indexes (product search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_name ON products(tenant_id, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category ON products(tenant_id, category) WHERE category IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- =============================================
-- FULL-TEXT SEARCH INDEXES
-- =============================================

-- GIN indexes for JSONB and text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_search ON inventory USING GIN (to_tsvector('english', name || ' ' || description || ' ' || sku));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search ON products USING GIN (to_tsvector('english', name || ' ' || description));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_search ON customers USING GIN (to_tsvector('english', company_name || ' ' || contact_name || ' ' || email));

-- =============================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- =============================================

-- Active records only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_active ON inventory(tenant_id, warehouse_id, updated_at DESC) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_active_today ON routes(tenant_id, driver_id, route_date) WHERE status IN ('planned', 'in_progress') AND route_date = CURRENT_DATE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_in_transit ON shipments(tenant_id, status, updated_at DESC) WHERE status = 'in_transit';

-- Recent records (last 30 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_tracking_recent ON vehicle_tracking(vehicle_id, timestamp DESC) WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipment_tracking_recent ON shipment_tracking(shipment_id, timestamp DESC) WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- =============================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =============================================

-- Multi-column indexes for filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_warehouse_product ON inventory(warehouse_id, product_id, quantity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_driver_vehicle_date ON routes(driver_id, vehicle_id, route_date, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_location_time ON vehicle_tracking(latitude, longitude, timestamp DESC);

-- Covering indexes (include all needed columns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_covering ON orders(tenant_id, status, priority, customer_id) INCLUDE (id, order_number, total_amount, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_covering ON shipments(tenant_id, status, warehouse_id, driver_id) INCLUDE (id, shipment_number, tracking_number, total_value, created_at);

-- =============================================
-- UNIQUE CONSTRAINTS ENHANCEMENT
-- =============================================

-- Ensure unique tracking codes across tenants
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tracking_code_unique ON orders(tracking_code) WHERE tracking_code IS NOT NULL;

-- Ensure unique vehicle license plates per tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_license_tenant ON vehicles(tenant_id, license_plate);

-- Ensure unique driver license numbers per tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_license_tenant ON drivers(tenant_id, license_number);

-- =============================================
-- PERFORMANCE MONITORING INDEXES
-- =============================================

-- Indexes for audit and monitoring queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_timestamp ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);

-- =============================================
-- MIGRATION METADATA
-- =============================================

COMMENT ON INDEX idx_inventory_tenant_sku IS 'Critical for inventory lookups by SKU';
COMMENT ON INDEX idx_shipments_tracking_number IS 'Essential for real-time package tracking';
COMMENT ON INDEX idx_routes_tenant_date_status IS 'Core for route planning and optimization';
COMMENT ON INDEX idx_vehicle_tracking_tenant_timestamp IS 'High-frequency GPS data queries';
COMMENT ON INDEX idx_orders_tracking_code_unique IS 'Business rule enforcement';

-- Performance statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 10;
