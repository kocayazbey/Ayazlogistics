-- Views migration
-- This migration creates views for common queries and reporting

-- View for inventory summary with product details
CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
    i.id,
    i.product_id,
    p.sku,
    p.name as product_name,
    p.description,
    p.category,
    p.supplier_id,
    p.unit_cost,
    p.unit_price,
    i.location_id,
    l.code as location_code,
    l.name as location_name,
    i.zone_id,
    z.name as zone_name,
    i.quantity_on_hand,
    i.min_quantity,
    i.max_quantity,
    i.status,
    i.batch_number,
    i.warehouse_id,
    w.name as warehouse_name,
    i.tenant_id,
    i.created_at,
    i.updated_at,
    (i.quantity_on_hand * p.unit_cost) as total_value,
    CASE 
        WHEN i.quantity_on_hand <= i.min_quantity THEN 'low_stock'
        WHEN i.quantity_on_hand >= i.max_quantity THEN 'overstock'
        ELSE 'normal'
    END as stock_status
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN locations l ON i.location_id = l.id
JOIN zones z ON i.zone_id = z.id
JOIN warehouses w ON i.warehouse_id = w.id;

-- View for route details with driver and vehicle info
CREATE OR REPLACE VIEW route_details AS
SELECT 
    r.id,
    r.route_number,
    r.vehicle_id,
    v.plate_number,
    v.make,
    v.model,
    v.capacity as vehicle_capacity,
    r.driver_id,
    d.name as driver_name,
    d.phone as driver_phone,
    d.license_number,
    r.status,
    r.distance,
    r.duration,
    r.start_latitude,
    r.start_longitude,
    r.end_latitude,
    r.end_longitude,
    r.planned_duration,
    r.actual_duration,
    r.fuel_consumption,
    r.efficiency,
    r.tenant_id,
    r.created_by,
    r.created_at,
    r.updated_at,
    COUNT(rs.id) as total_stops,
    COUNT(CASE WHEN rs.status = 'completed' THEN 1 END) as completed_stops,
    COUNT(CASE WHEN rs.status = 'in_progress' THEN 1 END) as in_progress_stops,
    COUNT(CASE WHEN rs.status = 'pending' THEN 1 END) as pending_stops
FROM routes r
LEFT JOIN vehicles v ON r.vehicle_id = v.id
LEFT JOIN drivers d ON r.driver_id = d.id
LEFT JOIN route_stops rs ON r.id = rs.route_id
GROUP BY r.id, v.id, d.id;

-- View for warehouse operations summary
CREATE OR REPLACE VIEW warehouse_operations_summary AS
SELECT 
    w.id as warehouse_id,
    w.name as warehouse_name,
    w.code as warehouse_code,
    COUNT(DISTINCT i.id) as total_products,
    COUNT(DISTINCT CASE WHEN i.status = 'available' THEN i.id END) as available_products,
    COUNT(DISTINCT CASE WHEN i.status = 'reserved' THEN i.id END) as reserved_products,
    COUNT(DISTINCT CASE WHEN i.status = 'damaged' THEN i.id END) as damaged_products,
    SUM(i.quantity_on_hand) as total_quantity,
    SUM(i.quantity_on_hand * p.unit_cost) as total_value,
    COUNT(DISTINCT r.id) as total_receipts,
    COUNT(DISTINCT CASE WHEN r.status = 'pending' THEN r.id END) as pending_receipts,
    COUNT(DISTINCT CASE WHEN r.status = 'approved' THEN r.id END) as approved_receipts,
    COUNT(DISTINCT p.id) as total_picks,
    COUNT(DISTINCT CASE WHEN p.status = 'pending' THEN p.id END) as pending_picks,
    COUNT(DISTINCT CASE WHEN p.status = 'in_progress' THEN p.id END) as in_progress_picks,
    COUNT(DISTINCT s.id) as total_shipments,
    COUNT(DISTINCT CASE WHEN s.status = 'ready' THEN s.id END) as ready_shipments,
    COUNT(DISTINCT CASE WHEN s.status = 'in_transit' THEN s.id END) as in_transit_shipments,
    COUNT(DISTINCT o.id) as total_operations,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_operations,
    COUNT(DISTINCT CASE WHEN o.status = 'in_progress' THEN o.id END) as in_progress_operations
FROM warehouses w
LEFT JOIN inventory i ON w.id = i.warehouse_id
LEFT JOIN products p ON i.product_id = p.id
LEFT JOIN receipts r ON w.id = r.warehouse_id
LEFT JOIN picks p ON w.id = p.warehouse_id
LEFT JOIN shipments s ON w.id = s.warehouse_id
LEFT JOIN operations o ON w.id = o.warehouse_id
GROUP BY w.id, w.name, w.code;

-- View for driver performance
CREATE OR REPLACE VIEW driver_performance AS
SELECT 
    d.id,
    d.name,
    d.email,
    d.phone,
    d.license_number,
    d.license_expiry,
    d.status,
    d.tenant_id,
    COUNT(DISTINCT r.id) as total_routes,
    COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_routes,
    COUNT(DISTINCT CASE WHEN r.status = 'in_progress' THEN r.id END) as in_progress_routes,
    COUNT(DISTINCT CASE WHEN r.status = 'cancelled' THEN r.id END) as cancelled_routes,
    COALESCE(SUM(r.distance), 0) as total_distance,
    COALESCE(SUM(r.duration), 0) as total_duration,
    COALESCE(AVG(r.efficiency), 0) as avg_efficiency,
    COALESCE(SUM(r.fuel_consumption), 0) as total_fuel_consumption,
    COALESCE(AVG(r.fuel_consumption / NULLIF(r.distance, 0)), 0) as avg_fuel_efficiency
FROM drivers d
LEFT JOIN routes r ON d.id = r.driver_id
GROUP BY d.id, d.name, d.email, d.phone, d.license_number, d.license_expiry, d.status, d.tenant_id;

-- View for vehicle utilization
CREATE OR REPLACE VIEW vehicle_utilization AS
SELECT 
    v.id,
    v.plate_number,
    v.make,
    v.model,
    v.year,
    v.capacity,
    v.status,
    v.tenant_id,
    COUNT(DISTINCT r.id) as total_routes,
    COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_routes,
    COUNT(DISTINCT CASE WHEN r.status = 'in_progress' THEN r.id END) as in_progress_routes,
    COALESCE(SUM(r.distance), 0) as total_distance,
    COALESCE(SUM(r.duration), 0) as total_duration,
    COALESCE(AVG(r.efficiency), 0) as avg_efficiency,
    COALESCE(SUM(r.fuel_consumption), 0) as total_fuel_consumption,
    COALESCE(AVG(r.fuel_consumption / NULLIF(r.distance, 0)), 0) as avg_fuel_efficiency,
    CASE 
        WHEN v.status = 'in_use' THEN 'active'
        WHEN v.status = 'available' THEN 'idle'
        ELSE 'inactive'
    END as utilization_status
FROM vehicles v
LEFT JOIN routes r ON v.id = r.vehicle_id
GROUP BY v.id, v.plate_number, v.make, v.model, v.year, v.capacity, v.status, v.tenant_id;

-- View for customer order summary
CREATE OR REPLACE VIEW customer_order_summary AS
SELECT 
    c.id,
    c.name,
    c.company,
    c.email,
    c.phone,
    c.address,
    c.city,
    c.country,
    c.tenant_id,
    COUNT(DISTINCT p.id) as total_picks,
    COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_picks,
    COUNT(DISTINCT CASE WHEN p.status = 'in_progress' THEN p.id END) as in_progress_picks,
    COUNT(DISTINCT s.id) as total_shipments,
    COUNT(DISTINCT CASE WHEN s.status = 'delivered' THEN s.id END) as delivered_shipments,
    COUNT(DISTINCT CASE WHEN s.status = 'in_transit' THEN s.id END) as in_transit_shipments,
    COALESCE(SUM(p.total_value), 0) as total_order_value,
    COALESCE(AVG(p.total_value), 0) as avg_order_value,
    MAX(p.created_at) as last_order_date
FROM customers c
LEFT JOIN picks p ON c.id = p.customer_id
LEFT JOIN shipments s ON c.id = s.customer_id
GROUP BY c.id, c.name, c.company, c.email, c.phone, c.address, c.city, c.country, c.tenant_id;

-- View for daily operations report
CREATE OR REPLACE VIEW daily_operations_report AS
SELECT 
    DATE(o.created_at) as operation_date,
    o.warehouse_id,
    w.name as warehouse_name,
    o.type as operation_type,
    COUNT(*) as operation_count,
    SUM(o.items_count) as total_items,
    SUM(o.duration) as total_duration,
    AVG(o.duration) as avg_duration,
    COUNT(DISTINCT o.operator) as unique_operators
FROM operations o
JOIN warehouses w ON o.warehouse_id = w.id
GROUP BY DATE(o.created_at), o.warehouse_id, w.name, o.type
ORDER BY operation_date DESC, warehouse_name, operation_type;

-- View for inventory alerts
CREATE OR REPLACE VIEW inventory_alerts AS
SELECT 
    i.id,
    i.product_id,
    p.sku,
    p.name as product_name,
    i.location_id,
    l.code as location_code,
    i.zone_id,
    z.name as zone_name,
    i.warehouse_id,
    w.name as warehouse_name,
    i.quantity_on_hand,
    i.min_quantity,
    i.max_quantity,
    i.status,
    i.tenant_id,
    CASE 
        WHEN i.quantity_on_hand <= i.min_quantity THEN 'low_stock'
        WHEN i.quantity_on_hand >= i.max_quantity THEN 'overstock'
        WHEN i.status = 'damaged' THEN 'damaged'
        WHEN i.status = 'expired' THEN 'expired'
        ELSE 'normal'
    END as alert_type,
    CASE 
        WHEN i.quantity_on_hand <= i.min_quantity THEN 'Critical: Stock below minimum threshold'
        WHEN i.quantity_on_hand >= i.max_quantity THEN 'Warning: Stock exceeds maximum capacity'
        WHEN i.status = 'damaged' THEN 'Alert: Product is damaged'
        WHEN i.status = 'expired' THEN 'Alert: Product has expired'
        ELSE 'Normal'
    END as alert_message
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN locations l ON i.location_id = l.id
JOIN zones z ON i.zone_id = z.id
JOIN warehouses w ON i.warehouse_id = w.id
WHERE i.quantity_on_hand <= i.min_quantity 
   OR i.quantity_on_hand >= i.max_quantity 
   OR i.status IN ('damaged', 'expired');

-- View for route performance metrics
CREATE OR REPLACE VIEW route_performance_metrics AS
SELECT 
    r.id,
    r.route_number,
    r.vehicle_id,
    v.plate_number,
    r.driver_id,
    d.name as driver_name,
    r.status,
    r.distance,
    r.duration,
    r.planned_duration,
    r.actual_duration,
    r.fuel_consumption,
    r.efficiency,
    r.tenant_id,
    r.created_at,
    r.updated_at,
    CASE 
        WHEN r.actual_duration IS NOT NULL AND r.planned_duration IS NOT NULL THEN
            ROUND(((r.actual_duration - r.planned_duration) / r.planned_duration::float) * 100, 2)
        ELSE NULL
    END as duration_variance_percent,
    CASE 
        WHEN r.distance > 0 THEN ROUND(r.fuel_consumption / r.distance, 2)
        ELSE NULL
    END as fuel_efficiency,
    CASE 
        WHEN r.actual_duration IS NOT NULL AND r.planned_duration IS NOT NULL THEN
            CASE 
                WHEN r.actual_duration <= r.planned_duration THEN 'on_time'
                WHEN r.actual_duration <= r.planned_duration * 1.1 THEN 'slightly_delayed'
                ELSE 'significantly_delayed'
            END
        ELSE 'unknown'
    END as performance_status
FROM routes r
LEFT JOIN vehicles v ON r.vehicle_id = v.id
LEFT JOIN drivers d ON r.driver_id = d.id;
