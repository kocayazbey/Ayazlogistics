-- PostGIS setup for AyazLogistics WMS/TMS
-- Enable PostGIS extension and create spatial indexes

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- Create spatial reference systems for Turkey
INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, proj4text, srtext) VALUES
(5253, 'EPSG', 5253, '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs', 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]')
ON CONFLICT (srid) DO NOTHING;

-- Create warehouse locations table with spatial data
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Turkey',
    postal_code VARCHAR(20),
    location GEOMETRY(POINT, 4326) NOT NULL,
    coverage_area GEOMETRY(POLYGON, 4326),
    capacity INTEGER,
    current_utilization INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicle locations table for real-time tracking
CREATE TABLE IF NOT EXISTS vehicle_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL,
    driver_id UUID,
    location GEOMETRY(POINT, 4326) NOT NULL,
    heading REAL, -- Direction in degrees (0-360)
    speed REAL, -- Speed in km/h
    accuracy REAL, -- GPS accuracy in meters
    altitude REAL, -- Altitude in meters
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery routes table
CREATE TABLE IF NOT EXISTS delivery_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name VARCHAR(255) NOT NULL,
    vehicle_id UUID,
    driver_id UUID,
    start_location GEOMETRY(POINT, 4326) NOT NULL,
    end_location GEOMETRY(POINT, 4326) NOT NULL,
    route_geometry GEOMETRY(LINESTRING, 4326),
    total_distance REAL, -- Distance in kilometers
    estimated_duration INTEGER, -- Duration in minutes
    status VARCHAR(50) DEFAULT 'planned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery stops table
CREATE TABLE IF NOT EXISTS delivery_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES delivery_routes(id),
    stop_order INTEGER NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    address TEXT,
    recipient_name VARCHAR(255),
    recipient_phone VARCHAR(20),
    delivery_instructions TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create geofence zones table
CREATE TABLE IF NOT EXISTS geofence_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(50) NOT NULL, -- 'warehouse', 'delivery_area', 'restricted', 'speed_limit'
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    properties JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial indexes for performance
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_geom ON warehouse_locations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_coverage ON warehouse_locations USING GIST (coverage_area);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_city ON warehouse_locations (city);

CREATE INDEX IF NOT EXISTS idx_vehicle_locations_geom ON vehicle_locations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle ON vehicle_locations (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_timestamp ON vehicle_locations (timestamp);
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle_time ON vehicle_locations (vehicle_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_routes_start ON delivery_routes USING GIST (start_location);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_end ON delivery_routes USING GIST (end_location);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_geom ON delivery_routes USING GIST (route_geometry);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON delivery_routes (status);

CREATE INDEX IF NOT EXISTS idx_delivery_stops_geom ON delivery_stops USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_route ON delivery_stops (route_id);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_order ON delivery_stops (route_id, stop_order);

CREATE INDEX IF NOT EXISTS idx_geofence_zones_geom ON geofence_zones USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_type ON geofence_zones (zone_type);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_active ON geofence_zones (is_active);

-- Create functions for spatial operations

-- Function to find nearest warehouse
CREATE OR REPLACE FUNCTION find_nearest_warehouse(
    target_location GEOMETRY(POINT, 4326),
    max_distance_km REAL DEFAULT 50.0
)
RETURNS TABLE (
    warehouse_id UUID,
    warehouse_name VARCHAR(255),
    distance_km REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wl.id,
        wl.name,
        ST_Distance(wl.location, target_location) * 111.32 as distance_km -- Rough conversion to km
    FROM warehouse_locations wl
    WHERE wl.is_active = true
    AND ST_DWithin(wl.location, target_location, max_distance_km / 111.32)
    ORDER BY ST_Distance(wl.location, target_location)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if point is within geofence
CREATE OR REPLACE FUNCTION check_geofence_violation(
    point_location GEOMETRY(POINT, 4326),
    vehicle_id UUID
)
RETURNS TABLE (
    zone_id UUID,
    zone_name VARCHAR(255),
    zone_type VARCHAR(50),
    violation_type VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gz.id,
        gz.zone_name,
        gz.zone_type,
        CASE 
            WHEN gz.zone_type = 'restricted' THEN 'entered_restricted_zone'
            WHEN gz.zone_type = 'speed_limit' THEN 'speed_limit_zone'
            ELSE 'geofence_breach'
        END as violation_type
    FROM geofence_zones gz
    WHERE gz.is_active = true
    AND ST_Contains(gz.boundary, point_location);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate route distance
CREATE OR REPLACE FUNCTION calculate_route_distance(
    route_geometry GEOMETRY(LINESTRING, 4326)
)
RETURNS REAL AS $$
BEGIN
    -- Convert to UTM for accurate distance calculation
    RETURN ST_Length(ST_Transform(route_geometry, 3857)) / 1000.0; -- Convert to kilometers
END;
$$ LANGUAGE plpgsql;

-- Function to find vehicles within radius
CREATE OR REPLACE FUNCTION find_vehicles_in_radius(
    center_location GEOMETRY(POINT, 4326),
    radius_km REAL,
    time_window_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
    vehicle_id UUID,
    driver_id UUID,
    location GEOMETRY(POINT, 4326),
    distance_km REAL,
    last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.vehicle_id,
        vl.driver_id,
        vl.location,
        ST_Distance(vl.location, center_location) * 111.32 as distance_km,
        vl.timestamp as last_seen
    FROM vehicle_locations vl
    WHERE ST_DWithin(vl.location, center_location, radius_km / 111.32)
    AND vl.timestamp >= NOW() - INTERVAL '1 minute' * time_window_minutes
    ORDER BY ST_Distance(vl.location, center_location);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_warehouse_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_warehouse_updated_at
    BEFORE UPDATE ON warehouse_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouse_updated_at();

CREATE TRIGGER trigger_route_updated_at
    BEFORE UPDATE ON delivery_routes
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouse_updated_at();

CREATE TRIGGER trigger_geofence_updated_at
    BEFORE UPDATE ON geofence_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouse_updated_at();

-- Insert sample data
INSERT INTO warehouse_locations (name, address, city, location, coverage_area, capacity) VALUES
('Istanbul Central Warehouse', 'Atatürk Havalimanı, 34149 Bakırköy/İstanbul', 'Istanbul', 
 ST_GeomFromText('POINT(28.9784 41.0082)', 4326),
 ST_Buffer(ST_GeomFromText('POINT(28.9784 41.0082)', 4326)::geography, 50000)::geometry,
 10000),
('Ankara Distribution Center', 'Esenboğa Havalimanı, 06790 Akyurt/Ankara', 'Ankara',
 ST_GeomFromText('POINT(32.6881 40.1281)', 4326),
 ST_Buffer(ST_GeomFromText('POINT(32.6881 40.1281)', 4326)::geography, 30000)::geometry,
 5000),
('Izmir Logistics Hub', 'Adnan Menderes Havalimanı, 35410 Gaziemir/İzmir', 'Izmir',
 ST_GeomFromText('POINT(27.1428 38.2924)', 4326),
 ST_Buffer(ST_GeomFromText('POINT(27.1428 38.2924)', 4326)::geography, 40000)::geometry,
 7500);

-- Insert sample geofence zones
INSERT INTO geofence_zones (zone_name, zone_type, boundary, properties) VALUES
('Istanbul City Center', 'delivery_area', 
 ST_GeomFromText('POLYGON((28.9 41.0, 29.1 41.0, 29.1 41.1, 28.9 41.1, 28.9 41.0))', 4326),
 '{"delivery_fee": 15.0, "max_weight": 50.0}'),
('Restricted Military Zone', 'restricted',
 ST_GeomFromText('POLYGON((28.5 40.8, 28.7 40.8, 28.7 40.9, 28.5 40.9, 28.5 40.8))', 4326),
 '{"alert_level": "high", "contact": "military_base"}'),
('Highway Speed Limit Zone', 'speed_limit',
 ST_GeomFromText('POLYGON((28.0 40.5, 29.0 40.5, 29.0 40.6, 28.0 40.6, 28.0 40.5))', 4326),
 '{"speed_limit": 80, "enforcement": "automatic"}');

-- Create materialized view for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS warehouse_coverage_summary AS
SELECT 
    wl.id,
    wl.name,
    wl.city,
    wl.capacity,
    wl.current_utilization,
    ROUND((wl.current_utilization::float / wl.capacity * 100), 2) as utilization_percentage,
    ST_Area(wl.coverage_area::geography) / 1000000 as coverage_area_km2,
    wl.created_at
FROM warehouse_locations wl
WHERE wl.is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_coverage_summary_id ON warehouse_coverage_summary (id);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_warehouse_coverage_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY warehouse_coverage_summary;
END;
$$ LANGUAGE plpgsql;
