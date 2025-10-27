-- Triggers migration
-- This migration creates triggers for data consistency and audit trails

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        tenant_id,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        current_setting('app.current_user_id', true),
        current_setting('app.current_tenant_id', true),
        CURRENT_TIMESTAMP
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to update inventory quantity
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE inventory 
        SET quantity_on_hand = quantity_on_hand + NEW.quantity
        WHERE id = NEW.inventory_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE inventory 
        SET quantity_on_hand = quantity_on_hand - OLD.quantity + NEW.quantity
        WHERE id = NEW.inventory_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE inventory 
        SET quantity_on_hand = quantity_on_hand - OLD.quantity
        WHERE id = OLD.inventory_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to update route status
CREATE OR REPLACE FUNCTION update_route_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- If all stops are completed, mark route as completed
        IF (SELECT COUNT(*) FROM route_stops WHERE route_id = NEW.route_id AND status = 'completed') = 
           (SELECT COUNT(*) FROM route_stops WHERE route_id = NEW.route_id) THEN
            UPDATE routes SET status = 'completed' WHERE id = NEW.route_id;
        -- If any stop is in progress, mark route as in_progress
        ELSIF (SELECT COUNT(*) FROM route_stops WHERE route_id = NEW.route_id AND status = 'in_progress') > 0 THEN
            UPDATE routes SET status = 'in_progress' WHERE id = NEW.route_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_picks_updated_at BEFORE UPDATE ON picks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_route_stops_updated_at BEFORE UPDATE ON route_stops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply audit log triggers to critical tables
CREATE TRIGGER audit_inventory AFTER INSERT OR UPDATE OR DELETE ON inventory FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_receipts AFTER INSERT OR UPDATE OR DELETE ON receipts FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_picks AFTER INSERT OR UPDATE OR DELETE ON picks FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_shipments AFTER INSERT OR UPDATE OR DELETE ON shipments FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_routes AFTER INSERT OR UPDATE OR DELETE ON routes FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_vehicles AFTER INSERT OR UPDATE OR DELETE ON vehicles FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_drivers AFTER INSERT OR UPDATE OR DELETE ON drivers FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Apply business logic triggers
CREATE TRIGGER update_inventory_quantity_trigger AFTER INSERT OR UPDATE OR DELETE ON inventory_movements FOR EACH ROW EXECUTE FUNCTION update_inventory_quantity();
CREATE TRIGGER update_route_status_trigger AFTER UPDATE ON route_stops FOR EACH ROW EXECUTE FUNCTION update_route_status();

-- Function to validate inventory quantities
CREATE OR REPLACE FUNCTION validate_inventory_quantities()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity_on_hand < 0 THEN
        RAISE EXCEPTION 'Inventory quantity cannot be negative';
    END IF;
    
    IF NEW.quantity_on_hand < NEW.min_quantity THEN
        RAISE WARNING 'Inventory quantity is below minimum threshold';
    END IF;
    
    IF NEW.quantity_on_hand > NEW.max_quantity THEN
        RAISE WARNING 'Inventory quantity exceeds maximum capacity';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply inventory validation trigger
CREATE TRIGGER validate_inventory_quantities_trigger BEFORE INSERT OR UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION validate_inventory_quantities();

-- Function to generate unique receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        NEW.receipt_number = 'REC' || LPAD(nextval('receipt_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for receipt numbers
CREATE SEQUENCE receipt_number_seq START 1;

-- Apply receipt number generation trigger
CREATE TRIGGER generate_receipt_number_trigger BEFORE INSERT ON receipts FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

-- Function to generate unique pick numbers
CREATE OR REPLACE FUNCTION generate_pick_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.pick_number IS NULL OR NEW.pick_number = '' THEN
        NEW.pick_number = 'PICK' || LPAD(nextval('pick_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for pick numbers
CREATE SEQUENCE pick_number_seq START 1;

-- Apply pick number generation trigger
CREATE TRIGGER generate_pick_number_trigger BEFORE INSERT ON picks FOR EACH ROW EXECUTE FUNCTION generate_pick_number();

-- Function to generate unique shipment numbers
CREATE OR REPLACE FUNCTION generate_shipment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.shipment_number IS NULL OR NEW.shipment_number = '' THEN
        NEW.shipment_number = 'SHP' || LPAD(nextval('shipment_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for shipment numbers
CREATE SEQUENCE shipment_number_seq START 1;

-- Apply shipment number generation trigger
CREATE TRIGGER generate_shipment_number_trigger BEFORE INSERT ON shipments FOR EACH ROW EXECUTE FUNCTION generate_shipment_number();

-- Function to generate unique route numbers
CREATE OR REPLACE FUNCTION generate_route_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.route_number IS NULL OR NEW.route_number = '' THEN
        NEW.route_number = 'RT' || LPAD(nextval('route_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for route numbers
CREATE SEQUENCE route_number_seq START 1;

-- Apply route number generation trigger
CREATE TRIGGER generate_route_number_trigger BEFORE INSERT ON routes FOR EACH ROW EXECUTE FUNCTION generate_route_number();
