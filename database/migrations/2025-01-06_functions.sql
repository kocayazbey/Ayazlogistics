-- Functions migration
-- This migration creates stored procedures and functions for complex business logic

-- Function to get inventory by location
CREATE OR REPLACE FUNCTION get_inventory_by_location(
    p_location_id UUID,
    p_tenant_id UUID
)
RETURNS TABLE (
    id UUID,
    sku VARCHAR,
    product_name VARCHAR,
    quantity_on_hand INTEGER,
    min_quantity INTEGER,
    max_quantity INTEGER,
    status VARCHAR,
    location_code VARCHAR,
    zone_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        p.sku,
        p.name as product_name,
        i.quantity_on_hand,
        i.min_quantity,
        i.max_quantity,
        i.status,
        l.code as location_code,
        z.name as zone_name
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    JOIN locations l ON i.location_id = l.id
    JOIN zones z ON i.zone_id = z.id
    WHERE i.location_id = p_location_id 
      AND i.tenant_id = p_tenant_id
    ORDER BY p.sku;
END;
$$ LANGUAGE plpgsql;

-- Function to get low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items(
    p_warehouse_id UUID,
    p_tenant_id UUID
)
RETURNS TABLE (
    id UUID,
    sku VARCHAR,
    product_name VARCHAR,
    quantity_on_hand INTEGER,
    min_quantity INTEGER,
    location_code VARCHAR,
    zone_name VARCHAR,
    days_until_empty INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        p.sku,
        p.name as product_name,
        i.quantity_on_hand,
        i.min_quantity,
        l.code as location_code,
        z.name as zone_name,
        CASE 
            WHEN i.quantity_on_hand > 0 AND i.min_quantity > 0 THEN
                (i.quantity_on_hand / i.min_quantity)::INTEGER
            ELSE 0
        END as days_until_empty
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    JOIN locations l ON i.location_id = l.id
    JOIN zones z ON i.zone_id = z.id
    WHERE i.warehouse_id = p_warehouse_id 
      AND i.tenant_id = p_tenant_id
      AND i.quantity_on_hand <= i.min_quantity
    ORDER BY i.quantity_on_hand ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get route statistics
CREATE OR REPLACE FUNCTION get_route_statistics(
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_routes INTEGER,
    completed_routes INTEGER,
    in_progress_routes INTEGER,
    cancelled_routes INTEGER,
    total_distance NUMERIC,
    total_duration INTEGER,
    avg_efficiency NUMERIC,
    total_fuel_consumption NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_routes,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_routes,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::INTEGER as in_progress_routes,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::INTEGER as cancelled_routes,
        COALESCE(SUM(distance), 0) as total_distance,
        COALESCE(SUM(duration), 0)::INTEGER as total_duration,
        COALESCE(AVG(efficiency), 0) as avg_efficiency,
        COALESCE(SUM(fuel_consumption), 0) as total_fuel_consumption
    FROM routes
    WHERE tenant_id = p_tenant_id
      AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get warehouse performance
CREATE OR REPLACE FUNCTION get_warehouse_performance(
    p_warehouse_id UUID,
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_operations INTEGER,
    completed_operations INTEGER,
    total_items_processed INTEGER,
    avg_operation_duration NUMERIC,
    total_receipts INTEGER,
    total_picks INTEGER,
    total_shipments INTEGER,
    efficiency_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_operations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_operations,
        COALESCE(SUM(items_count), 0)::INTEGER as total_items_processed,
        COALESCE(AVG(duration), 0) as avg_operation_duration,
        (SELECT COUNT(*) FROM receipts WHERE warehouse_id = p_warehouse_id AND tenant_id = p_tenant_id)::INTEGER as total_receipts,
        (SELECT COUNT(*) FROM picks WHERE warehouse_id = p_warehouse_id AND tenant_id = p_tenant_id)::INTEGER as total_picks,
        (SELECT COUNT(*) FROM shipments WHERE warehouse_id = p_warehouse_id AND tenant_id = p_tenant_id)::INTEGER as total_shipments,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100
            ELSE 0
        END as efficiency_score
    FROM operations
    WHERE warehouse_id = p_warehouse_id 
      AND tenant_id = p_tenant_id
      AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get driver performance
CREATE OR REPLACE FUNCTION get_driver_performance(
    p_driver_id UUID,
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_routes INTEGER,
    completed_routes INTEGER,
    total_distance NUMERIC,
    total_duration INTEGER,
    avg_efficiency NUMERIC,
    total_fuel_consumption NUMERIC,
    on_time_percentage NUMERIC,
    performance_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_routes,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_routes,
        COALESCE(SUM(distance), 0) as total_distance,
        COALESCE(SUM(duration), 0)::INTEGER as total_duration,
        COALESCE(AVG(efficiency), 0) as avg_efficiency,
        COALESCE(SUM(fuel_consumption), 0) as total_fuel_consumption,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN actual_duration <= planned_duration THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100
            ELSE 0
        END as on_time_percentage,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ((COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 0.4 +
                 (COUNT(CASE WHEN actual_duration <= planned_duration THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 0.3 +
                 COALESCE(AVG(efficiency), 0) * 0.3) * 100
            ELSE 0
        END as performance_score
    FROM routes
    WHERE driver_id = p_driver_id 
      AND tenant_id = p_tenant_id
      AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get vehicle utilization
CREATE OR REPLACE FUNCTION get_vehicle_utilization(
    p_vehicle_id UUID,
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_routes INTEGER,
    total_distance NUMERIC,
    total_duration INTEGER,
    utilization_percentage NUMERIC,
    avg_efficiency NUMERIC,
    total_fuel_consumption NUMERIC,
    fuel_efficiency NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_routes,
        COALESCE(SUM(distance), 0) as total_distance,
        COALESCE(SUM(duration), 0)::INTEGER as total_duration,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100
            ELSE 0
        END as utilization_percentage,
        COALESCE(AVG(efficiency), 0) as avg_efficiency,
        COALESCE(SUM(fuel_consumption), 0) as total_fuel_consumption,
        CASE 
            WHEN SUM(distance) > 0 THEN 
                SUM(fuel_consumption) / SUM(distance)
            ELSE 0
        END as fuel_efficiency
    FROM routes
    WHERE vehicle_id = p_vehicle_id 
      AND tenant_id = p_tenant_id
      AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer order history
CREATE OR REPLACE FUNCTION get_customer_order_history(
    p_customer_id UUID,
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_orders INTEGER,
    total_value NUMERIC,
    avg_order_value NUMERIC,
    last_order_date TIMESTAMP,
    order_frequency NUMERIC,
    customer_satisfaction NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_orders,
        COALESCE(SUM(total_value), 0) as total_value,
        COALESCE(AVG(total_value), 0) as avg_order_value,
        MAX(created_at) as last_order_date,
        CASE 
            WHEN COUNT(*) > 0 AND (p_end_date - p_start_date) > 0 THEN
                COUNT(*)::NUMERIC / (p_end_date - p_start_date)::NUMERIC
            ELSE 0
        END as order_frequency,
        COALESCE(AVG(satisfaction_score), 0) as customer_satisfaction
    FROM picks
    WHERE customer_id = p_customer_id 
      AND tenant_id = p_tenant_id
      AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get inventory valuation
CREATE OR REPLACE FUNCTION get_inventory_valuation(
    p_warehouse_id UUID,
    p_tenant_id UUID
)
RETURNS TABLE (
    total_items INTEGER,
    total_value NUMERIC,
    avg_item_value NUMERIC,
    category_breakdown JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_items,
        COALESCE(SUM(i.quantity_on_hand * p.unit_cost), 0) as total_value,
        COALESCE(AVG(i.quantity_on_hand * p.unit_cost), 0) as avg_item_value,
        (
            SELECT json_agg(
                json_build_object(
                    'category', p2.category,
                    'item_count', COUNT(*),
                    'total_value', SUM(i2.quantity_on_hand * p2.unit_cost)
                )
            )
            FROM inventory i2
            JOIN products p2 ON i2.product_id = p2.id
            WHERE i2.warehouse_id = p_warehouse_id 
              AND i2.tenant_id = p_tenant_id
            GROUP BY p2.category
        ) as category_breakdown
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    WHERE i.warehouse_id = p_warehouse_id 
      AND i.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get operational efficiency metrics
CREATE OR REPLACE FUNCTION get_operational_efficiency_metrics(
    p_warehouse_id UUID,
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_operations INTEGER,
    completed_operations INTEGER,
    total_items_processed INTEGER,
    avg_operation_duration NUMERIC,
    operations_per_hour NUMERIC,
    items_per_hour NUMERIC,
    efficiency_score NUMERIC,
    productivity_trend JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_operations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_operations,
        COALESCE(SUM(items_count), 0)::INTEGER as total_items_processed,
        COALESCE(AVG(duration), 0) as avg_operation_duration,
        CASE 
            WHEN SUM(duration) > 0 THEN 
                (COUNT(*)::NUMERIC / (SUM(duration)::NUMERIC / 60))
            ELSE 0
        END as operations_per_hour,
        CASE 
            WHEN SUM(duration) > 0 THEN 
                (SUM(items_count)::NUMERIC / (SUM(duration)::NUMERIC / 60))
            ELSE 0
        END as items_per_hour,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100
            ELSE 0
        END as efficiency_score,
        (
            SELECT json_agg(
                json_build_object(
                    'date', DATE(o.created_at),
                    'operations', COUNT(*),
                    'items_processed', SUM(o.items_count),
                    'avg_duration', AVG(o.duration)
                )
            )
            FROM operations o
            WHERE o.warehouse_id = p_warehouse_id 
              AND o.tenant_id = p_tenant_id
              AND DATE(o.created_at) BETWEEN p_start_date AND p_end_date
            GROUP BY DATE(o.created_at)
            ORDER BY DATE(o.created_at)
        ) as productivity_trend
    FROM operations
    WHERE warehouse_id = p_warehouse_id 
      AND tenant_id = p_tenant_id
      AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get real-time dashboard data
CREATE OR REPLACE FUNCTION get_dashboard_data(
    p_tenant_id UUID
)
RETURNS TABLE (
    total_warehouses INTEGER,
    total_products INTEGER,
    total_routes INTEGER,
    active_routes INTEGER,
    total_vehicles INTEGER,
    available_vehicles INTEGER,
    total_drivers INTEGER,
    active_drivers INTEGER,
    low_stock_items INTEGER,
    pending_operations INTEGER,
    today_operations INTEGER,
    today_shipments INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM warehouses WHERE tenant_id = p_tenant_id)::INTEGER as total_warehouses,
        (SELECT COUNT(*) FROM inventory WHERE tenant_id = p_tenant_id)::INTEGER as total_products,
        (SELECT COUNT(*) FROM routes WHERE tenant_id = p_tenant_id)::INTEGER as total_routes,
        (SELECT COUNT(*) FROM routes WHERE tenant_id = p_tenant_id AND status = 'in_progress')::INTEGER as active_routes,
        (SELECT COUNT(*) FROM vehicles WHERE tenant_id = p_tenant_id)::INTEGER as total_vehicles,
        (SELECT COUNT(*) FROM vehicles WHERE tenant_id = p_tenant_id AND status = 'available')::INTEGER as available_vehicles,
        (SELECT COUNT(*) FROM drivers WHERE tenant_id = p_tenant_id)::INTEGER as total_drivers,
        (SELECT COUNT(*) FROM drivers WHERE tenant_id = p_tenant_id AND status = 'active')::INTEGER as active_drivers,
        (SELECT COUNT(*) FROM inventory WHERE tenant_id = p_tenant_id AND quantity_on_hand <= min_quantity)::INTEGER as low_stock_items,
        (SELECT COUNT(*) FROM operations WHERE tenant_id = p_tenant_id AND status = 'pending')::INTEGER as pending_operations,
        (SELECT COUNT(*) FROM operations WHERE tenant_id = p_tenant_id AND DATE(created_at) = CURRENT_DATE)::INTEGER as today_operations,
        (SELECT COUNT(*) FROM shipments WHERE tenant_id = p_tenant_id AND DATE(created_at) = CURRENT_DATE)::INTEGER as today_shipments;
END;
$$ LANGUAGE plpgsql;
