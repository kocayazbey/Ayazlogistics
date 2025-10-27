# Database Schema Documentation

## Naming Conventions

### Table Names
- Use lowercase with underscores: `users`, `user_permissions`, `order_items`
- Prefix with module name: `tms_vehicles`, `billing_invoices`, `crm_customers`
- Use plural form for entity tables: `orders`, `shipments`, `customers`

### Column Names
- Use lowercase with underscores: `first_name`, `created_at`, `updated_at`
- Primary keys: `id` (UUID)
- Foreign keys: `{table_name}_id` (e.g., `user_id`, `tenant_id`)
- Timestamps: `{action}_at` (e.g., `created_at`, `updated_at`, `deleted_at`)
- Status fields: `status` with enum constraints
- Boolean fields: `is_{adjective}` (e.g., `is_active`, `is_verified`)

### Index Names
- Prefix with `idx_`: `idx_users_email`, `idx_orders_tenant_status`
- Include table name and columns: `idx_{table}_{column1}_{column2}`
- For composite indexes: `idx_{table}_{columns}_composite`

### Constraint Names
- Primary keys: `pk_{table}`
- Foreign keys: `fk_{table}_{referenced_table}`
- Check constraints: `chk_{table}_{condition}`
- Unique constraints: `uk_{table}_{columns}`

### Enum Types
- Use descriptive names: `user_role`, `order_status`, `payment_method`
- Values in lowercase with underscores: `pending`, `in_transit`, `credit_card`

## Schema Organization

### Core Tables
- `tenants` - Multi-tenant isolation
- `users` - User management and authentication
- `roles` - Role-based access control
- `permissions` - Granular permissions
- `audit_logs` - System audit trail

### Business Modules

#### Logistics Management (LMS)
- `orders` - Customer orders
- `shipments` - Shipment tracking
- `inventory_items` - Inventory management
- `warehouses` - Warehouse locations

#### Transportation Management (TMS)
- `tms_vehicles` - Fleet management
- `tms_drivers` - Driver information
- `tms_routes` - Route planning
- `tms_route_stops` - Route stops

#### Customer Relationship (CRM)
- `customers` - Customer data
- `leads` - Lead management
- `activities` - Customer activities
- `contacts` - Customer contacts

#### Billing & Invoicing
- `billing_contracts` - Customer contracts
- `billing_rates` - Pricing structures
- `billing_usage_tracking` - Usage monitoring
- `billing_invoices` - Invoice generation

#### Warehouse Management (WMS)
- `wms_locations` - Storage locations
- `wms_zones` - Warehouse zones
- `wms_picking_routes` - Picking optimization

### System Tables
- `system_settings` - Configuration
- `system_jobs` - Background jobs
- `system_health` - Health monitoring
- `system_metrics` - Performance metrics

## Data Types

### Common Types
- `uuid` - Primary keys and foreign keys
- `varchar(n)` - Text fields with length limits
- `text` - Long text fields
- `timestamp` - Date and time with timezone
- `date` - Date only
- `decimal(p,s)` - Precise decimal numbers
- `integer` - Whole numbers
- `boolean` - True/false values
- `jsonb` - JSON data with indexing

### Specific Constraints

#### User Management
```sql
-- User roles enum
CREATE TYPE user_role AS ENUM (
    'admin', 'manager', 'operator', 'driver', 'customer', 'guest'
);

-- User status enum
CREATE TYPE user_status AS ENUM (
    'active', 'inactive', 'suspended', 'pending'
);
```

#### Order Management
```sql
-- Order status enum
CREATE TYPE order_status AS ENUM (
    'draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
);

-- Payment status enum
CREATE TYPE payment_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'refunded'
);
```

#### Shipment Management
```sql
-- Shipment status enum
CREATE TYPE shipment_status AS ENUM (
    'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed'
);

-- Delivery priority enum
CREATE TYPE delivery_priority AS ENUM (
    'standard', 'express', 'urgent', 'same_day'
);
```

## Relationships

### One-to-Many
- `tenants` → `users` (tenant_id)
- `customers` → `orders` (customer_id)
- `orders` → `shipments` (order_id)
- `vehicles` → `drivers` (vehicle_id)

### Many-to-Many
- `users` ↔ `roles` (user_roles junction table)
- `users` ↔ `permissions` (user_permissions junction table)
- `orders` ↔ `products` (order_items junction table)

### Self-Referential
- `users` → `users` (manager_id for hierarchy)
- `categories` → `categories` (parent_id for hierarchy)

## Indexes Strategy

### Performance Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_orders_tenant_status_date ON orders (tenant_id, status, created_at DESC);
CREATE INDEX idx_shipments_tenant_tracking ON shipments (tenant_id, tracking_number);
CREATE INDEX idx_inventory_tenant_location_quantity ON inventory_items (tenant_id, warehouse_location, quantity);

-- Partial indexes for active records
CREATE INDEX idx_users_active ON users (tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_pending ON orders (tenant_id, created_at DESC) WHERE status = 'pending';

-- Full-text search indexes
CREATE INDEX idx_customers_search ON customers USING gin (to_tsvector('turkish', name || ' ' || email));
CREATE INDEX idx_orders_notes_search ON orders USING gin (to_tsvector('turkish', notes));
```

### Spatial Indexes
```sql
-- GPS tracking spatial indexes
CREATE INDEX idx_gps_positions_spatial ON gps_positions USING gist (st_point(longitude, latitude));

-- Geofence spatial indexes
CREATE INDEX idx_geofences_spatial ON geofences USING gist (geometry);
```

## Constraints

### Business Logic Constraints
```sql
-- Check constraints
ALTER TABLE orders ADD CONSTRAINT chk_orders_amount_positive CHECK (total_amount > 0);
ALTER TABLE inventory_items ADD CONSTRAINT chk_inventory_quantity_non_negative CHECK (quantity >= 0);
ALTER TABLE users ADD CONSTRAINT chk_users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Unique constraints
ALTER TABLE users ADD CONSTRAINT uk_users_tenant_email UNIQUE (tenant_id, email);
ALTER TABLE orders ADD CONSTRAINT uk_orders_tenant_number UNIQUE (tenant_id, order_number);
```

### Referential Integrity
```sql
-- Cascade deletes for cleanup
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Set null for optional relationships
ALTER TABLE users ADD CONSTRAINT fk_users_manager
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
```

## Migration Strategy

### Version Control
- Use sequential migration files: `001_initial_schema.sql`, `002_add_indexes.sql`
- Include rollback statements for each migration
- Test migrations on staging before production

### Rollback Strategy
```sql
-- Example rollback migration
BEGIN;

-- Drop new indexes
DROP INDEX IF EXISTS idx_orders_tenant_status_date;
DROP INDEX IF EXISTS idx_shipments_tenant_tracking;

-- Drop new constraints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_amount_positive;

-- Remove new columns (with data migration if needed)
ALTER TABLE orders DROP COLUMN IF EXISTS estimated_delivery_date;

COMMIT;
```

## Performance Considerations

### Partitioning Strategy
```sql
-- Time-based partitioning for large tables
CREATE TABLE orders_y2024 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE orders_y2025 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### Materialized Views
```sql
-- Pre-computed aggregates for reporting
CREATE MATERIALIZED VIEW daily_order_summary AS
SELECT
    DATE(created_at) as order_date,
    tenant_id,
    status,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at), tenant_id, status;
```

## Security Considerations

### Row Level Security (RLS)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY tenant_isolation ON orders
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY user_data_access ON customers
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)
        OR id = current_setting('app.current_user_id', TRUE)
    );
```

### Audit Trail
```sql
-- Automatic audit logging
CREATE TRIGGER audit_orders_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Monitoring and Maintenance

### Health Check Functions
```sql
-- Database health monitoring
CREATE OR REPLACE FUNCTION get_database_health()
RETURNS JSON AS $$
    -- Returns connection counts, cache hit rates, slow queries, etc.
$$ LANGUAGE plpgsql;
```

### Cleanup Jobs
```sql
-- Automatic cleanup of old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS JSON AS $$
    -- Archives or deletes old records based on retention policies
$$ LANGUAGE plpgsql;
```

## Best Practices

1. **Consistent Naming**: Follow the established conventions throughout
2. **Proper Indexing**: Index foreign keys and frequently queried columns
3. **Constraint Validation**: Use check constraints for business rules
4. **Audit Trail**: Log all important changes for compliance
5. **Performance Monitoring**: Track query performance and optimize slow queries
6. **Security First**: Implement RLS and proper access controls
7. **Documentation**: Keep this document updated with schema changes

## Schema Evolution

When making schema changes:
1. Create a new migration file
2. Update this documentation
3. Test on staging environment
4. Plan rollback strategy
5. Update application code if needed
6. Monitor performance impact
