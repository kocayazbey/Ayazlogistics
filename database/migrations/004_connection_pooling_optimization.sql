-- Database Connection Pooling and Performance Optimization Migration
-- This migration optimizes database settings for better connection pooling and performance

-- Set connection limits based on environment
-- Production: Higher limits for more concurrent connections
-- Development: Lower limits to save resources
-- Test: Minimal limits for fast testing

DO $$
BEGIN
    -- Production settings
    IF current_setting('custom.environment', true) = 'production' THEN
        -- Set higher connection limits for production
        PERFORM set_config('max_connections', '200', false);
        PERFORM set_config('shared_preload_libraries', 'pg_stat_statements,pg_buffercache', false);
        PERFORM set_config('work_mem', '128MB', false);
        PERFORM set_config('maintenance_work_mem', '256MB', false);
        PERFORM set_config('effective_cache_size', '4GB', false);
        PERFORM set_config('random_page_cost', '1.1', false);

    -- Development settings
    ELSIF current_setting('custom.environment', true) = 'development' THEN
        -- Set moderate limits for development
        PERFORM set_config('max_connections', '50', false);
        PERFORM set_config('shared_preload_libraries', 'pg_stat_statements', false);
        PERFORM set_config('work_mem', '64MB', false);
        PERFORM set_config('maintenance_work_mem', '128MB', false);
        PERFORM set_config('effective_cache_size', '1GB', false);

    -- Test settings
    ELSIF current_setting('custom.environment', true) = 'test' THEN
        -- Set minimal limits for fast testing
        PERFORM set_config('max_connections', '10', false);
        PERFORM set_config('work_mem', '32MB', false);
        PERFORM set_config('maintenance_work_mem', '64MB', false);
        PERFORM set_config('effective_cache_size', '256MB', false);

    -- Default settings (fallback)
    ELSE
        -- Set safe defaults
        PERFORM set_config('max_connections', '20', false);
        PERFORM set_config('work_mem', '32MB', false);
        PERFORM set_config('maintenance_work_mem', '64MB', false);
        PERFORM set_config('effective_cache_size', '512MB', false);
    END IF;
END $$;

-- Create database configuration table for runtime settings
CREATE TABLE IF NOT EXISTS database_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration values
INSERT INTO database_config (key, value, description) VALUES
    ('connection.pool.min', '2', 'Minimum number of connections in pool'),
    ('connection.pool.max', '20', 'Maximum number of connections in pool'),
    ('connection.pool.idle_timeout', '30', 'Idle timeout in seconds'),
    ('connection.pool.connect_timeout', '10', 'Connection timeout in seconds'),
    ('connection.pool.acquire_timeout', '30', 'Acquire timeout in seconds'),
    ('query.timeout', '30', 'Query timeout in seconds'),
    ('query.slow_threshold', '1000', 'Slow query threshold in milliseconds'),
    ('monitoring.enabled', 'true', 'Enable database monitoring'),
    ('monitoring.interval', '30', 'Monitoring interval in seconds')
ON CONFLICT (key) DO NOTHING;

-- Create function to get configuration value
CREATE OR REPLACE FUNCTION get_db_config(config_key TEXT, default_value TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT value INTO result FROM database_config WHERE key = config_key;

    IF result IS NULL THEN
        RETURN default_value;
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to update configuration
CREATE OR REPLACE FUNCTION set_db_config(config_key TEXT, config_value TEXT, config_description TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO database_config (key, value, description, updated_at)
    VALUES (config_key, config_value, config_description, NOW())
    ON CONFLICT (key)
    DO UPDATE SET
        value = EXCLUDED.value,
        description = EXCLUDED.description,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create connection monitoring view
CREATE OR REPLACE VIEW connection_stats AS
SELECT
    COUNT(*) as total_connections,
    COUNT(*) FILTER (WHERE state = 'active') as active_connections,
    COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
    COUNT(*) FILTER (WHERE state = 'fastpath function call') as fastpath_calls,
    MAX(query_start) as oldest_query_start,
    AVG(EXTRACT(EPOCH FROM (NOW() - query_start))) as avg_query_age_seconds
FROM pg_stat_activity
WHERE datname = current_database();

-- Create query performance monitoring view
CREATE OR REPLACE VIEW query_performance AS
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows,
    shared_blks_hit,
    shared_blks_read,
    shared_blks_written,
    temp_blks_read,
    temp_blks_written,
    blk_read_time,
    blk_write_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC;

-- Create index for better query performance on configuration table
CREATE INDEX IF NOT EXISTS idx_database_config_key ON database_config(key);

-- Create index for audit logs if they exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC) WHERE created_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action) WHERE action IS NOT NULL;

-- Create indexes for common logistics queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC) WHERE created_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id) WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC) WHERE created_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number) WHERE tracking_number IS NOT NULL;

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at DESC) WHERE status IS NOT NULL AND created_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_status_created_at ON shipments(status, created_at DESC) WHERE status IS NOT NULL AND created_at IS NOT NULL;

-- Create partial indexes for active records (space optimization)
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(id, updated_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_active ON shipments(id, updated_at) WHERE deleted_at IS NULL;

-- Create function to analyze table bloat
CREATE OR REPLACE FUNCTION analyze_table_bloat()
RETURNS TABLE(
    table_name TEXT,
    estimated_bloat BIGINT,
    estimated_wasted_space BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || tablename as table_name,
        n_dead_tup::bigint as estimated_bloat,
        n_dead_tup::bigint * current_setting('block_size')::bigint as estimated_wasted_space
    FROM pg_stat_user_tables
    WHERE n_dead_tup > 0
    ORDER BY n_dead_tup DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to optimize database performance
CREATE OR REPLACE FUNCTION optimize_database_performance()
RETURNS JSON AS $$
DECLARE
    result JSON;
    vacuum_count INTEGER;
    analyze_count INTEGER;
    reindex_count INTEGER;
BEGIN
    -- Run VACUUM on tables with high dead tuples
    SELECT COUNT(*) INTO vacuum_count
    FROM analyze_table_bloat()
    WHERE estimated_bloat > 1000;

    -- Run ANALYZE on all tables
    SELECT COUNT(*) INTO analyze_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

    -- Reindex tables with high bloat
    SELECT COUNT(*) INTO reindex_count
    FROM analyze_table_bloat()
    WHERE estimated_wasted_space > 1000000; -- 1MB

    -- Execute maintenance commands
    EXECUTE 'VACUUM';
    EXECUTE 'ANALYZE';

    -- Reindex if needed
    IF reindex_count > 0 THEN
        EXECUTE 'REINDEX DATABASE ' || current_database();
    END IF;

    result := json_build_object(
        'vacuum_count', vacuum_count,
        'analyze_count', analyze_count,
        'reindex_count', reindex_count,
        'message', 'Database optimization completed'
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update configuration updated_at timestamp
CREATE OR REPLACE FUNCTION update_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_database_config_updated_at
    BEFORE UPDATE ON database_config
    FOR EACH ROW
    EXECUTE FUNCTION update_config_updated_at();

-- Create function to monitor connection pool health
CREATE OR REPLACE FUNCTION get_connection_pool_health()
RETURNS JSON AS $$
DECLARE
    result JSON;
    stats RECORD;
BEGIN
    SELECT * INTO stats FROM connection_stats LIMIT 1;

    result := json_build_object(
        'total_connections', stats.total_connections,
        'active_connections', stats.active_connections,
        'idle_connections', stats.idle_connections,
        'idle_in_transaction', stats.idle_in_transaction,
        'fastpath_calls', stats.fastpath_calls,
        'oldest_query_start', stats.oldest_query_start,
        'avg_query_age_seconds', stats.avg_query_age_seconds,
        'connection_utilization_percent',
            CASE
                WHEN stats.total_connections > 0
                THEN (stats.active_connections::decimal / stats.total_connections::decimal) * 100
                ELSE 0
            END,
        'health_status',
            CASE
                WHEN (stats.active_connections::decimal / NULLIF(stats.total_connections, 0)) > 0.9
                THEN 'CRITICAL'
                WHEN (stats.active_connections::decimal / NULLIF(stats.total_connections, 0)) > 0.7
                THEN 'WARNING'
                ELSE 'HEALTHY'
            END
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for monitoring functions
GRANT EXECUTE ON FUNCTION get_db_config(TEXT, TEXT) TO authenticated_users;
GRANT EXECUTE ON FUNCTION set_db_config(TEXT, TEXT, TEXT) TO authenticated_users;
GRANT EXECUTE ON FUNCTION analyze_table_bloat() TO authenticated_users;
GRANT EXECUTE ON FUNCTION optimize_database_performance() TO authenticated_users;
GRANT EXECUTE ON FUNCTION get_connection_pool_health() TO authenticated_users;
GRANT SELECT ON connection_stats TO authenticated_users;
GRANT SELECT ON query_performance TO authenticated_users;

-- Add comments for documentation
COMMENT ON TABLE database_config IS 'Runtime database configuration settings';
COMMENT ON FUNCTION get_db_config(TEXT, TEXT) IS 'Get database configuration value with default fallback';
COMMENT ON FUNCTION set_db_config(TEXT, TEXT, TEXT) IS 'Set database configuration value';
COMMENT ON VIEW connection_stats IS 'Real-time connection pool statistics';
COMMENT ON VIEW query_performance IS 'Query performance statistics from pg_stat_statements';
COMMENT ON FUNCTION analyze_table_bloat() IS 'Analyze table bloat and wasted space';
COMMENT ON FUNCTION optimize_database_performance() IS 'Run database optimization maintenance tasks';
COMMENT ON FUNCTION get_connection_pool_health() IS 'Get comprehensive connection pool health metrics';
