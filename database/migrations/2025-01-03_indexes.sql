-- Indexes migration
-- This migration creates indexes for better query performance

-- WMS indexes
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_location_id ON inventory(location_id);
CREATE INDEX idx_inventory_zone_id ON inventory(zone_id);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);
CREATE INDEX idx_inventory_tenant_id ON inventory(tenant_id);
CREATE INDEX idx_inventory_status ON inventory(status);
CREATE INDEX idx_inventory_batch_number ON inventory(batch_number);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);

CREATE INDEX idx_locations_warehouse_id ON locations(warehouse_id);
CREATE INDEX idx_locations_zone_id ON locations(zone_id);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_tenant_id ON locations(tenant_id);

CREATE INDEX idx_zones_warehouse_id ON zones(warehouse_id);
CREATE INDEX idx_zones_tenant_id ON zones(tenant_id);

CREATE INDEX idx_receipts_warehouse_id ON receipts(warehouse_id);
CREATE INDEX idx_receipts_tenant_id ON receipts(tenant_id);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_receipts_supplier ON receipts(supplier);

CREATE INDEX idx_picks_warehouse_id ON picks(warehouse_id);
CREATE INDEX idx_picks_tenant_id ON picks(tenant_id);
CREATE INDEX idx_picks_status ON picks(status);
CREATE INDEX idx_picks_priority ON picks(priority);
CREATE INDEX idx_picks_assigned_to ON picks(assigned_to);

CREATE INDEX idx_shipments_warehouse_id ON shipments(warehouse_id);
CREATE INDEX idx_shipments_tenant_id ON shipments(tenant_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_priority ON shipments(priority);
CREATE INDEX idx_shipments_driver_id ON shipments(driver_id);
CREATE INDEX idx_shipments_vehicle_id ON shipments(vehicle_id);

CREATE INDEX idx_operations_warehouse_id ON operations(warehouse_id);
CREATE INDEX idx_operations_tenant_id ON operations(tenant_id);
CREATE INDEX idx_operations_type ON operations(type);
CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_operator ON operations(operator);

-- TMS indexes
CREATE INDEX idx_routes_vehicle_id ON routes(vehicle_id);
CREATE INDEX idx_routes_driver_id ON routes(driver_id);
CREATE INDEX idx_routes_tenant_id ON routes(tenant_id);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_routes_created_by ON routes(created_by);

CREATE INDEX idx_route_stops_route_id ON route_stops(route_id);
CREATE INDEX idx_route_stops_status ON route_stops(status);
CREATE INDEX idx_route_stops_sequence ON route_stops(sequence);

CREATE INDEX idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);

CREATE INDEX idx_drivers_tenant_id ON drivers(tenant_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_license_number ON drivers(license_number);

-- User and tenant indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_warehouse_id ON users(warehouse_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_tenants_domain ON tenants(domain);

-- Composite indexes for common queries
CREATE INDEX idx_inventory_warehouse_status ON inventory(warehouse_id, status);
CREATE INDEX idx_inventory_zone_status ON inventory(zone_id, status);
CREATE INDEX idx_picks_warehouse_status ON picks(warehouse_id, status);
CREATE INDEX idx_shipments_warehouse_status ON shipments(warehouse_id, status);
CREATE INDEX idx_routes_tenant_status ON routes(tenant_id, status);
CREATE INDEX idx_route_stops_route_sequence ON route_stops(route_id, sequence);

-- Full text search indexes
CREATE INDEX idx_products_name_fts ON products USING gin(to_tsvector('turkish', name));
CREATE INDEX idx_products_description_fts ON products USING gin(to_tsvector('turkish', description));
CREATE INDEX idx_customers_name_fts ON customers USING gin(to_tsvector('turkish', name));
CREATE INDEX idx_customers_company_fts ON customers USING gin(to_tsvector('turkish', company));
