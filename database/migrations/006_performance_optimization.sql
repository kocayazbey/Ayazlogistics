-- Performance Optimization Migration
-- This migration adds database constraints, indexes, and optimizations for better performance

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- BUSINESS LOGIC CONSTRAINTS
-- ============================================

-- Orders table constraints
ALTER TABLE orders ADD CONSTRAINT chk_orders_status
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));

ALTER TABLE orders ADD CONSTRAINT chk_orders_payment_status
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE orders ADD CONSTRAINT chk_orders_total_amount
    CHECK (total_amount >= 0);

-- Shipments table constraints
ALTER TABLE shipments ADD CONSTRAINT chk_shipments_status
    CHECK (status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled'));

ALTER TABLE shipments ADD CONSTRAINT chk_shipments_weight
    CHECK (weight_kg > 0);

ALTER TABLE shipments ADD CONSTRAINT chk_shipments_dimensions
    CHECK (length_cm > 0 AND width_cm > 0 AND height_cm > 0);

-- Inventory constraints
ALTER TABLE inventory_items ADD CONSTRAINT chk_inventory_quantity
    CHECK (quantity >= 0);

ALTER TABLE inventory_items ADD CONSTRAINT chk_inventory_min_stock
    CHECK (min_stock_level >= 0);

ALTER TABLE inventory_items ADD CONSTRAINT chk_inventory_unit_cost
    CHECK (unit_cost >= 0);

-- Users table constraints
ALTER TABLE users ADD CONSTRAINT chk_users_role
    CHECK (role IN ('admin', 'warehouse_operator', 'forklift_operator', 'driver', 'customer', 'accountant', 'sales_representative', 'hr_manager', 'supervisor'));

ALTER TABLE users ADD CONSTRAINT chk_users_status
    CHECK (status IN ('active', 'inactive', 'suspended', 'pending'));

-- Vehicles constraints
ALTER TABLE vehicles ADD CONSTRAINT chk_vehicles_status
    CHECK (status IN ('active', 'inactive', 'maintenance', 'out_of_service'));

ALTER TABLE vehicles ADD CONSTRAINT chk_vehicles_fuel_type
    CHECK (fuel_type IN ('diesel', 'gasoline', 'electric', 'hybrid'));

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Primary key indexes (automatically created, but ensuring they exist)
-- Composite indexes for common query patterns

-- Orders indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_status_created
    ON orders (tenant_id, status, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_id
    ON orders (customer_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tracking_number
    ON orders (tracking_number)
    WHERE tracking_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_date_range
    ON orders (created_at DESC)
    WHERE created_at >= NOW() - INTERVAL '1 year';

-- Shipments indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_tenant_status
    ON shipments (tenant_id, status, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_tracking_number
    ON shipments (tracking_number)
    WHERE tracking_number IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_order_id
    ON shipments (order_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_driver_id
    ON shipments (driver_id, status, created_at DESC)
    WHERE driver_id IS NOT NULL AND deleted_at IS NULL;

-- Inventory indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_tenant_location
    ON inventory_items (tenant_id, warehouse_location, quantity)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock
    ON inventory_items (tenant_id, quantity, min_stock_level)
    WHERE quantity <= min_stock_level AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_sku_search
    ON inventory_items USING gin (sku gin_trgm_ops)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_category
    ON inventory_items (tenant_id, category, quantity DESC)
    WHERE deleted_at IS NULL;

-- Users indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_role
    ON users (tenant_id, role, status)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_tenant
    ON users (tenant_id, email)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login
    ON users (tenant_id, last_login_at DESC)
    WHERE last_login_at IS NOT NULL AND deleted_at IS NULL;

-- Vehicles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_tenant_status
    ON vehicles (tenant_id, status, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_plate_number
    ON vehicles (tenant_id, plate_number)
    WHERE plate_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_driver_id
    ON vehicles (driver_id, status)
    WHERE driver_id IS NOT NULL AND deleted_at IS NULL;

-- GPS indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gps_positions_vehicle_time
    ON gps_positions (vehicle_id, timestamp DESC)
    WHERE timestamp >= NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gps_positions_device_time
    ON gps_positions (device_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gps_positions_location
    ON gps_positions (latitude, longitude, timestamp DESC)
    WHERE timestamp >= NOW() - INTERVAL '7 days';

-- AI/ML indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_models_status_type
    ON ai_models (status, type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_training_jobs_model_status
    ON ai_training_jobs (model_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_business_insights_type_impact
    ON ai_business_insights (type, impact, created_at DESC)
    WHERE expires_at IS NULL OR expires_at > NOW();

-- ============================================
-- PARTIAL INDEXES (Space optimization)
-- ============================================

-- Active records only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_active_only
    ON orders (tenant_id, status, updated_at DESC)
    WHERE deleted_at IS NULL AND status IN ('pending', 'confirmed', 'processing');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_active_only
    ON shipments (tenant_id, status, updated_at DESC)
    WHERE deleted_at IS NULL AND status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_active_critical
    ON inventory_items (tenant_id, updated_at DESC)
    WHERE deleted_at IS NULL AND quantity <= min_stock_level;

-- Recent data only (last 90 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_recent
    ON orders (tenant_id, status, created_at DESC)
    WHERE created_at >= NOW() - INTERVAL '90 days' AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_recent
    ON shipments (tenant_id, status, created_at DESC)
    WHERE created_at >= NOW() - INTERVAL '90 days' AND deleted_at IS NULL;

-- ============================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================

-- Product search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_fts
    ON inventory_items USING gin (to_tsvector('turkish', coalesce(name, '') || ' ' || coalesce(description, '')))
    WHERE deleted_at IS NULL;

-- Customer search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_fts
    ON customers USING gin (to_tsvector('turkish', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '')))
    WHERE deleted_at IS NULL;

-- Order notes search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_notes_fts
    ON orders USING gin (to_tsvector('turkish', coalesce(notes, '')))
    WHERE notes IS NOT NULL AND deleted_at IS NULL;

-- ============================================
-- GEOSPATIAL INDEXES
-- ============================================

-- GPS positions spatial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gps_positions_spatial
    ON gps_positions USING gist (st_point(longitude, latitude))
    WHERE timestamp >= NOW() - INTERVAL '30 days';

-- Warehouse locations spatial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warehouses_spatial
    ON warehouses USING gist (location)
    WHERE deleted_at IS NULL;

-- Customer addresses spatial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_spatial
    ON customers USING gist (delivery_address)
    WHERE deleted_at IS NULL;

-- ============================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- ============================================

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION analyze_table_performance()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    index_count INTEGER,
    last_analyze TIMESTAMP WITH TIME ZONE,
    table_size TEXT,
    index_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::TEXT,
        t.row_count,
        t.index_count,
        t.last_analyze,
        pg_size_pretty(t.table_size) as table_size,
        pg_size_pretty(t.index_size) as index_size
    FROM (
        SELECT
            schemaname || '.' || tablename as table_name,
            n_tup_ins - n_tup_del as row_count,
            (SELECT count(*) FROM pg_indexes WHERE schemaname = p.schemaname AND tablename = p.tablename) as index_count,
            COALESCE(last_analyze, last_autoanalyze) as last_analyze,
            pg_total_relation_size(schemaname || '.' || tablename) as table_size,
            pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename) as index_size
        FROM pg_stat_user_tables p
        WHERE schemaname = 'public'
    ) t
    ORDER BY table_size DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find unused indexes
CREATE OR REPLACE FUNCTION find_unused_indexes(threshold_days INTEGER DEFAULT 7)
RETURNS TABLE(
    index_name TEXT,
    table_name TEXT,
    index_size TEXT,
    last_used TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || indexname as index_name,
        schemaname || '.' || tablename as table_name,
        pg_size_pretty(pg_relation_size(schemaname || '.' || indexrelname)) as index_size,
        NULL::TIMESTAMP WITH TIME ZONE as last_used
    FROM pg_stat_user_indexes
    JOIN pg_indexes ON pg_stat_user_indexes.schemaname = pg_indexes.schemaname
                   AND pg_stat_user_indexes.indexname = pg_indexes.indexname
    WHERE pg_stat_user_indexes.idx_scan = 0
    AND pg_stat_user_indexes.schemaname = 'public'
    AND pg_indexes.indexname NOT LIKE 'pg_%'
    ORDER BY pg_relation_size(schemaname || '.' || indexrelname) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to optimize query performance
CREATE OR REPLACE FUNCTION optimize_query_performance()
RETURNS JSON AS $$
DECLARE
    result JSON;
    analyze_count INTEGER;
    reindex_count INTEGER;
    vacuum_count INTEGER;
BEGIN
    -- Count tables that need optimization
    SELECT COUNT(*) INTO analyze_count
    FROM analyze_table_performance()
    WHERE last_analyze < NOW() - INTERVAL '1 day';

    SELECT COUNT(*) INTO reindex_count
    FROM find_unused_indexes()
    WHERE index_size > '1MB';

    SELECT COUNT(*) INTO vacuum_count
    FROM analyze_table_performance()
    WHERE row_count > 10000;

    -- Execute maintenance commands
    EXECUTE 'ANALYZE';

    -- Vacuum tables with high dead tuples (simplified check)
    EXECUTE 'VACUUM';

    -- Reindex if needed
    IF reindex_count > 0 THEN
        EXECUTE 'REINDEX DATABASE ' || current_database();
    END IF;

    result := json_build_object(
        'analyze_count', analyze_count,
        'reindex_count', reindex_count,
        'vacuum_count', vacuum_count,
        'message', 'Query performance optimization completed'
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(threshold_ms INTEGER DEFAULT 1000)
RETURNS TABLE(
    query TEXT,
    calls BIGINT,
    total_time DECIMAL,
    mean_time DECIMAL,
    rows BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        query,
        calls,
        total_time,
        mean_time,
        rows
    FROM pg_stat_statements
    WHERE mean_time > threshold_ms
    ORDER BY mean_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================

-- Daily order summary
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_order_summary AS
SELECT
    DATE(created_at) as order_date,
    tenant_id,
    status,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value
FROM orders
WHERE created_at >= NOW() - INTERVAL '90 days'
  AND deleted_at IS NULL
GROUP BY DATE(created_at), tenant_id, status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_order_summary_date_tenant
    ON daily_order_summary (order_date, tenant_id, status);

-- Weekly inventory summary
CREATE MATERIALIZED VIEW IF NOT EXISTS weekly_inventory_summary AS
SELECT
    DATE_TRUNC('week', updated_at) as week_date,
    tenant_id,
    warehouse_location,
    COUNT(*) as item_count,
    SUM(quantity) as total_quantity,
    SUM(quantity * unit_cost) as total_value,
    COUNT(*) FILTER (WHERE quantity <= min_stock_level) as low_stock_count
FROM inventory_items
WHERE updated_at >= NOW() - INTERVAL '12 weeks'
  AND deleted_at IS NULL
GROUP BY DATE_TRUNC('week', updated_at), tenant_id, warehouse_location;

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_inventory_summary_date_tenant_location
    ON weekly_inventory_summary (week_date, tenant_id, warehouse_location);

-- Monthly shipment performance
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_shipment_performance AS
SELECT
    DATE_TRUNC('month', created_at) as month_date,
    tenant_id,
    status,
    COUNT(*) as shipment_count,
    AVG(EXTRACT(EPOCH FROM (delivered_at - created_at))/3600) as avg_delivery_hours,
    COUNT(*) FILTER (WHERE delivered_at <= estimated_delivery_date) as on_time_count
FROM shipments
WHERE created_at >= NOW() - INTERVAL '12 months'
  AND deleted_at IS NULL
GROUP BY DATE_TRUNC('month', created_at), tenant_id, status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_shipment_performance_date_tenant_status
    ON monthly_shipment_performance (month_date, tenant_id, status);

-- ============================================
-- REFRESH MATERIALIZED VIEWS
-- ============================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS JSON AS $$
DECLARE
    result JSON;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    start_time := clock_timestamp();

    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_order_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY weekly_inventory_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_shipment_performance;

    end_time := clock_timestamp();

    result := json_build_object(
        'message', 'All materialized views refreshed successfully',
        'duration_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
        'timestamp', end_time
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERFORMANCE MONITORING
-- ============================================

-- Function to get database performance metrics
CREATE OR REPLACE FUNCTION get_database_performance_metrics()
RETURNS JSON AS $$
DECLARE
    result JSON;
    connection_info JSON;
    cache_info JSON;
    lock_info JSON;
    slow_query_info JSON;
BEGIN
    -- Connection information
    SELECT json_build_object(
        'active_connections', COUNT(*),
        'max_connections', setting::int,
        'connection_utilization', (COUNT(*)::decimal / setting::decimal) * 100
    ) INTO connection_info
    FROM pg_stat_activity
    CROSS JOIN pg_settings
    WHERE name = 'max_connections';

    -- Cache information
    SELECT json_build_object(
        'buffer_cache_hit_ratio', hit_ratio,
        'index_cache_hit_ratio', idx_hit_ratio
    ) INTO cache_info
    FROM (
        SELECT
            (sum(blks_hit)::decimal / NULLIF(sum(blks_hit + blks_read), 0)) * 100 as hit_ratio,
            (sum(idx_blks_hit)::decimal / NULLIF(sum(idx_blks_hit + idx_blks_read), 0)) * 100 as idx_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
    ) cache_stats;

    -- Lock information
    SELECT json_build_object(
        'total_locks', COUNT(*),
        'waiting_locks', COUNT(*) FILTER (WHERE granted = false),
        'exclusive_locks', COUNT(*) FILTER (WHERE mode = 'ExclusiveLock')
    ) INTO lock_info
    FROM pg_locks;

    -- Slow queries
    SELECT json_agg(
        json_build_object(
            'query', query,
            'calls', calls,
            'mean_time', mean_time,
            'total_time', total_time
        )
    ) INTO slow_query_info
    FROM get_slow_queries(1000)
    LIMIT 5;

    result := json_build_object(
        'timestamp', NOW(),
        'connections', connection_info,
        'cache', cache_info,
        'locks', lock_info,
        'slow_queries', COALESCE(slow_query_info, '[]'::json)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AUTOMATIC MAINTENANCE
-- ============================================

-- Function to schedule automatic maintenance
CREATE OR REPLACE FUNCTION schedule_automatic_maintenance()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- This would typically be called by a cron job or scheduled task

    -- Refresh materialized views
    PERFORM refresh_materialized_views();

    -- Optimize query performance
    PERFORM optimize_query_performance();

    -- Update statistics
    EXECUTE 'ANALYZE';

    result := json_build_object(
        'message', 'Automatic maintenance completed',
        'timestamp', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANTS AND SECURITY
-- ============================================

-- Grant permissions for performance functions
GRANT EXECUTE ON FUNCTION analyze_table_performance() TO authenticated_users;
GRANT EXECUTE ON FUNCTION find_unused_indexes(INTEGER) TO authenticated_users;
GRANT EXECUTE ON FUNCTION optimize_query_performance() TO authenticated_users;
GRANT EXECUTE ON FUNCTION get_slow_queries(INTEGER) TO authenticated_users;
GRANT EXECUTE ON FUNCTION refresh_materialized_views() TO authenticated_users;
GRANT EXECUTE ON FUNCTION get_database_performance_metrics() TO authenticated_users;
GRANT EXECUTE ON FUNCTION schedule_automatic_maintenance() TO authenticated_users;

-- Grant permissions for materialized views
GRANT SELECT ON daily_order_summary TO authenticated_users;
GRANT SELECT ON weekly_inventory_summary TO authenticated_users;
GRANT SELECT ON monthly_shipment_performance TO authenticated_users;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION analyze_table_performance() IS 'Analyze table statistics and performance metrics';
COMMENT ON FUNCTION find_unused_indexes(INTEGER) IS 'Find indexes that are not being used';
COMMENT ON FUNCTION optimize_query_performance() IS 'Run query performance optimization tasks';
COMMENT ON FUNCTION get_slow_queries(INTEGER) IS 'Get slow queries above threshold';
COMMENT ON FUNCTION refresh_materialized_views() IS 'Refresh all materialized views';
COMMENT ON FUNCTION get_database_performance_metrics() IS 'Get comprehensive database performance metrics';
COMMENT ON FUNCTION schedule_automatic_maintenance() IS 'Run automatic database maintenance tasks';

-- Insert initial data for materialized views
INSERT INTO cron_jobs (name, schedule, command, enabled) VALUES
    ('refresh_materialized_views', '0 2 * * *', 'SELECT refresh_materialized_views();', true),
    ('optimize_query_performance', '0 3 * * *', 'SELECT optimize_query_performance();', true),
    ('analyze_database', '0 4 * * *', 'ANALYZE;', true)
ON CONFLICT (name) DO NOTHING;
