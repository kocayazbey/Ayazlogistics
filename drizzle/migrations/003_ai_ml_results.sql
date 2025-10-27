-- AI/ML Results Tables Migration
-- Adds tables for storing AI/ML model results and analytics

-- Customer Segmentation Results
CREATE TABLE IF NOT EXISTS customer_segmentation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    total_customers INTEGER NOT NULL,
    total_clusters INTEGER NOT NULL,
    average_cluster_size DECIMAL(10,2),
    total_within_cluster_sum DECIMAL(15,2),
    average_silhouette_score DECIMAL(5,4),
    convergence_iterations INTEGER,
    processing_time INTEGER, -- milliseconds
    silhouette_score DECIMAL(5,4),
    calinski_harabasz_score DECIMAL(10,2),
    davies_bouldin_score DECIMAL(5,2),
    inertia DECIMAL(15,2),
    stability DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Demand Forecasting Results
CREATE TABLE IF NOT EXISTS demand_forecasting_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    product_id UUID NOT NULL,
    forecast_type TEXT NOT NULL, -- lstm, arima, ensemble
    forecast_period TEXT NOT NULL, -- 7d, 30d, 90d
    predicted_value DECIMAL(15,2),
    confidence_interval JSONB, -- { lower, upper }
    accuracy DECIMAL(5,4),
    model_version TEXT,
    features_used JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Route Optimization Results
CREATE TABLE IF NOT EXISTS route_optimization_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    optimization_type TEXT NOT NULL, -- basic, advanced, multi-objective
    total_distance DECIMAL(10,2),
    total_time DECIMAL(8,2),
    total_cost DECIMAL(15,2),
    fuel_consumption DECIMAL(8,2),
    carbon_footprint DECIMAL(8,2),
    number_of_routes INTEGER,
    number_of_vehicles INTEGER,
    algorithm_used TEXT,
    parameters JSONB,
    result_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_segmentation_tenant ON customer_segmentation_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_segmentation_created ON customer_segmentation_results(created_at);

CREATE INDEX IF NOT EXISTS idx_demand_forecasting_tenant ON demand_forecasting_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasting_product ON demand_forecasting_results(product_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasting_created ON demand_forecasting_results(created_at);

CREATE INDEX IF NOT EXISTS idx_route_optimization_tenant ON route_optimization_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_route_optimization_created ON route_optimization_results(created_at);
