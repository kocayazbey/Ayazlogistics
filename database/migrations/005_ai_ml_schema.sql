-- AI/ML Schema Migration
-- This migration creates tables for AI model registry, training jobs, and business insights

-- Create enum types for AI/ML
CREATE TYPE ai_model_type AS ENUM (
    'classification',
    'regression',
    'clustering',
    'optimization',
    'forecasting',
    'nlp',
    'computer_vision'
);

CREATE TYPE ai_model_status AS ENUM (
    'active',
    'training',
    'deprecated',
    'error'
);

CREATE TYPE training_job_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled'
);

CREATE TYPE business_insight_type AS ENUM (
    'demand_forecast',
    'route_optimization',
    'pricing',
    'anomaly_detection',
    'customer_segmentation',
    'inventory_optimization',
    'fraud_detection',
    'churn_prediction'
);

CREATE TYPE business_insight_impact AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE business_insight_timeframe AS ENUM (
    'immediate',
    'short_term',
    'medium_term',
    'long_term'
);

-- AI Models table
CREATE TABLE IF NOT EXISTS ai_models (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ai_model_type NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    status ai_model_status NOT NULL DEFAULT 'active',
    accuracy DECIMAL(5,4), -- 0.0000 to 1.0000
    performance JSONB NOT NULL DEFAULT '{}',
    endpoints JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Training Jobs table
CREATE TABLE IF NOT EXISTS ai_training_jobs (
    id VARCHAR(100) PRIMARY KEY,
    model_id VARCHAR(100) NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
    status training_job_status NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    dataset JSONB NOT NULL DEFAULT '{}',
    hyperparameters JSONB NOT NULL DEFAULT '{}',
    results JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Business Insights table
CREATE TABLE IF NOT EXISTS ai_business_insights (
    id VARCHAR(100) PRIMARY KEY,
    type business_insight_type NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    impact business_insight_impact NOT NULL,
    timeframe business_insight_timeframe NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    recommendations JSONB NOT NULL DEFAULT '[]',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Model Performance Metrics table
CREATE TABLE IF NOT EXISTS ai_model_metrics (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(100) NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metric_type VARCHAR(50) NOT NULL, -- accuracy, latency, throughput, memory_usage
    metric_value DECIMAL(10,4) NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- AI Inference Logs table
CREATE TABLE IF NOT EXISTS ai_inference_logs (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(100) NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
    input_hash VARCHAR(64), -- SHA-256 hash of input for deduplication
    prediction JSONB NOT NULL,
    confidence DECIMAL(3,2),
    response_time INTEGER NOT NULL, -- milliseconds
    error_message TEXT,
    ip_address INET,
    user_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON ai_models(status);
CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_models(type);
CREATE INDEX IF NOT EXISTS idx_ai_models_created_at ON ai_models(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_training_jobs_model_id ON ai_training_jobs(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_jobs_status ON ai_training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_training_jobs_created_at ON ai_training_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_business_insights_type ON ai_business_insights(type);
CREATE INDEX IF NOT EXISTS idx_ai_business_insights_impact ON ai_business_insights(impact);
CREATE INDEX IF NOT EXISTS idx_ai_business_insights_timeframe ON ai_business_insights(timeframe);
CREATE INDEX IF NOT EXISTS idx_ai_business_insights_expires_at ON ai_business_insights(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_business_insights_created_at ON ai_business_insights(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_model_metrics_model_id ON ai_model_metrics(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_metrics_timestamp ON ai_model_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_model_metrics_type ON ai_model_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_ai_inference_logs_model_id ON ai_inference_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_inference_logs_created_at ON ai_inference_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_inference_logs_user_id ON ai_inference_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_inference_logs_input_hash ON ai_inference_logs(input_hash) WHERE input_hash IS NOT NULL;

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(id, updated_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ai_training_jobs_active ON ai_training_jobs(id, updated_at) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_ai_business_insights_active ON ai_business_insights(id, created_at) WHERE expires_at IS NULL OR expires_at > NOW();

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_models_type_status ON ai_models(type, status);
CREATE INDEX IF NOT EXISTS idx_ai_training_jobs_model_status ON ai_training_jobs(model_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_business_insights_type_impact ON ai_business_insights(type, impact);

-- Functions for AI/ML operations

-- Function to update model metrics
CREATE OR REPLACE FUNCTION update_model_metrics(
    p_model_id VARCHAR(100),
    p_metric_type VARCHAR(50),
    p_metric_value DECIMAL(10,4),
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_model_metrics (model_id, metric_type, metric_value, metadata)
    VALUES (p_model_id, p_metric_type, p_metric_value, p_metadata);
END;
$$ LANGUAGE plpgsql;

-- Function to log inference
CREATE OR REPLACE FUNCTION log_inference(
    p_model_id VARCHAR(100),
    p_input_hash VARCHAR(64),
    p_prediction JSONB,
    p_confidence DECIMAL(3,2),
    p_response_time INTEGER,
    p_error_message TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_id VARCHAR(100) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_inference_logs (
        model_id, input_hash, prediction, confidence,
        response_time, error_message, ip_address, user_id
    )
    VALUES (
        p_model_id, p_input_hash, p_prediction, p_confidence,
        p_response_time, p_error_message, p_ip_address, p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get model performance statistics
CREATE OR REPLACE FUNCTION get_model_performance_stats(
    p_model_id VARCHAR(100),
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
    total_inferences BIGINT,
    successful_inferences BIGINT,
    failed_inferences BIGINT,
    average_response_time DECIMAL(10,2),
    average_confidence DECIMAL(3,2),
    accuracy_trend DECIMAL(5,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_inferences,
        COUNT(*) FILTER (WHERE error_message IS NULL) as successful_inferences,
        COUNT(*) FILTER (WHERE error_message IS NOT NULL) as failed_inferences,
        AVG(response_time) as average_response_time,
        AVG(confidence) as average_confidence,
        -- Simplified accuracy trend (would need actual vs predicted data)
        0.95 as accuracy_trend
    FROM ai_inference_logs
    WHERE model_id = p_model_id
    AND created_at >= NOW() - INTERVAL '1 hour' * p_hours;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular models
CREATE OR REPLACE FUNCTION get_popular_models(p_hours INTEGER DEFAULT 24)
RETURNS TABLE(
    model_id VARCHAR(100),
    model_name VARCHAR(255),
    inference_count BIGINT,
    average_response_time DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id as model_id,
        m.name as model_name,
        COUNT(l.id) as inference_count,
        AVG(l.response_time) as average_response_time
    FROM ai_models m
    LEFT JOIN ai_inference_logs l ON m.id = l.model_id
    WHERE l.created_at >= NOW() - INTERVAL '1 hour' * p_hours
    GROUP BY m.id, m.name
    ORDER BY inference_count DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old logs and metrics
CREATE OR REPLACE FUNCTION cleanup_ai_data(
    p_logs_older_than_days INTEGER DEFAULT 90,
    p_metrics_older_than_days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    logs_deleted INTEGER;
    metrics_deleted INTEGER;
BEGIN
    -- Delete old inference logs
    DELETE FROM ai_inference_logs
    WHERE created_at < NOW() - INTERVAL '1 day' * p_logs_older_than_days;

    GET DIAGNOSTICS logs_deleted = ROW_COUNT;

    -- Delete old metrics
    DELETE FROM ai_model_metrics
    WHERE timestamp < NOW() - INTERVAL '1 day' * p_metrics_older_than_days;

    GET DIAGNOSTICS metrics_deleted = ROW_COUNT;

    -- Cleanup expired insights
    DELETE FROM ai_business_insights WHERE expires_at < NOW();

    result := json_build_object(
        'logs_deleted', logs_deleted,
        'metrics_deleted', metrics_deleted,
        'expired_insights_deleted', (
            SELECT COUNT(*) FROM ai_business_insights WHERE expires_at < NOW()
        ),
        'message', 'AI data cleanup completed'
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_ai_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ai_training_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ai_business_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_ai_models_updated_at
    BEFORE UPDATE ON ai_models
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_models_updated_at();

CREATE TRIGGER trigger_ai_training_jobs_updated_at
    BEFORE UPDATE ON ai_training_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_training_jobs_updated_at();

CREATE TRIGGER trigger_ai_business_insights_updated_at
    BEFORE UPDATE ON ai_business_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_business_insights_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_business_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_inference_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY ai_models_policy ON ai_models
    FOR ALL USING (auth.role() IN ('admin', 'data_scientist'));

CREATE POLICY ai_training_jobs_policy ON ai_training_jobs
    FOR ALL USING (auth.role() IN ('admin', 'data_scientist'));

CREATE POLICY ai_business_insights_policy ON ai_business_insights
    FOR SELECT USING (auth.role() IN ('admin', 'data_scientist', 'manager'));

CREATE POLICY ai_model_metrics_policy ON ai_model_metrics
    FOR ALL USING (auth.role() IN ('admin', 'data_scientist'));

CREATE POLICY ai_inference_logs_policy ON ai_inference_logs
    FOR SELECT USING (auth.role() IN ('admin', 'data_scientist'));

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated_users;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_models TO authenticated_users;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_training_jobs TO authenticated_users;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_business_insights TO authenticated_users;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_model_metrics TO authenticated_users;
GRANT SELECT, INSERT ON ai_inference_logs TO authenticated_users;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION update_model_metrics(VARCHAR, VARCHAR, DECIMAL, JSONB) TO authenticated_users;
GRANT EXECUTE ON FUNCTION log_inference(VARCHAR, VARCHAR, JSONB, DECIMAL, INTEGER, TEXT, INET, VARCHAR) TO authenticated_users;
GRANT EXECUTE ON FUNCTION get_model_performance_stats(VARCHAR, INTEGER) TO authenticated_users;
GRANT EXECUTE ON FUNCTION get_popular_models(INTEGER) TO authenticated_users;
GRANT EXECUTE ON FUNCTION cleanup_ai_data(INTEGER, INTEGER) TO authenticated_users;

-- Comments for documentation
COMMENT ON TABLE ai_models IS 'Registry of AI/ML models with metadata and performance metrics';
COMMENT ON TABLE ai_training_jobs IS 'Training job history and status tracking';
COMMENT ON TABLE ai_business_insights IS 'Business insights generated by AI models';
COMMENT ON TABLE ai_model_metrics IS 'Performance metrics for AI models over time';
COMMENT ON TABLE ai_inference_logs IS 'Inference request logs for monitoring and debugging';

COMMENT ON FUNCTION update_model_metrics IS 'Update performance metrics for a model';
COMMENT ON FUNCTION log_inference IS 'Log an inference request for monitoring';
COMMENT ON FUNCTION get_model_performance_stats IS 'Get performance statistics for a model';
COMMENT ON FUNCTION get_popular_models IS 'Get most popular models by usage';
COMMENT ON FUNCTION cleanup_ai_data IS 'Cleanup old AI logs and metrics';

-- Insert some initial data for testing
INSERT INTO ai_models (id, name, type, algorithm, version, status, performance, endpoints, metadata) VALUES
    ('model_demand_forecast_001', 'LSTM Demand Forecaster', 'forecasting', 'lstm', '1.0.0', 'active',
     '{"latency": 150, "throughput": 100, "memoryUsage": 512}',
     '{"inference": "http://ai-service:8001/predict", "health": "http://ai-service:8001/health"}',
     '{"description": "LSTM-based demand forecasting model", "features": ["historical_sales", "seasonality", "trends"]}'),

    ('model_route_optimizer_001', 'Genetic Route Optimizer', 'optimization', 'genetic_algorithm', '2.1.0', 'active',
     '{"latency": 300, "throughput": 50, "memoryUsage": 1024}',
     '{"inference": "http://ai-service:8002/optimize", "health": "http://ai-service:8002/health"}',
     '{"description": "Multi-objective route optimization", "constraints": ["time_windows", "vehicle_capacity", "driver_hours"]}'),

    ('model_fraud_detector_001', 'Random Forest Fraud Detector', 'classification', 'random_forest', '1.5.0', 'active',
     '{"latency": 50, "throughput": 200, "memoryUsage": 256}',
     '{"inference": "http://ai-service:8003/detect", "health": "http://ai-service:8003/health"}',
     '{"description": "Fraud detection using ensemble methods", "features": ["transaction_amount", "location", "time", "user_behavior"]}')
ON CONFLICT (id) DO NOTHING;
