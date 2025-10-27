#!/bin/bash

# AyazLogistics Monitoring Setup Script
# This script sets up the complete monitoring stack

set -e

echo "🚀 Starting AyazLogistics Monitoring Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if required directories exist
setup_directories() {
    print_status "Setting up monitoring directories..."
    
    mkdir -p monitoring/{prometheus,grafana,elasticsearch,kibana,logstash,filebeat,alertmanager,blackbox}
    mkdir -p monitoring/grafana/{dashboards,provisioning/{datasources,dashboards}}
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/prometheus
    mkdir -p monitoring/elasticsearch
    mkdir -p monitoring/kibana
    mkdir -p monitoring/elk
    mkdir -p monitoring/alertmanager
    mkdir -p monitoring/blackbox
    mkdir -p monitoring/filebeat
    mkdir -p monitoring/scripts
    
    print_success "Monitoring directories created"
}

# Create Prometheus configuration
setup_prometheus() {
    print_status "Setting up Prometheus configuration..."
    
    cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert-rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # AyazLogistics Backend
  - job_name: 'ayazlogistics-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 10s

  # AyazLogistics Frontend
  - job_name: 'ayazlogistics-frontend'
    static_configs:
      - targets: ['frontend:5173']
    scrape_interval: 30s

  # PostgreSQL
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 30s

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 30s

  # Node Exporter
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s

  # cAdvisor
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
    scrape_interval: 30s

  # Blackbox Exporter
  - job_name: 'blackbox'
    static_configs:
      - targets: ['blackbox-exporter:9115']
    scrape_interval: 30s
EOF

    print_success "Prometheus configuration created"
}

# Create Grafana provisioning
setup_grafana() {
    print_status "Setting up Grafana configuration..."
    
    # Create datasource configuration
    cat > monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    jsonData:
      httpMethod: POST
      queryTimeout: 60s
      timeInterval: 5s
    secureJsonData: {}

  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: ayazlogistics-*
    jsonData:
      interval: Daily
      timeField: "@timestamp"
      esVersion: "8.0.0"
      maxConcurrentShardRequests: 5
      logLevelField: "level"
      logMessageField: "message"
    secureJsonData: {}
EOF

    # Create dashboard provisioning
    cat > monitoring/grafana/provisioning/dashboards/dashboards.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    print_success "Grafana configuration created"
}

# Create Elasticsearch configuration
setup_elasticsearch() {
    print_status "Setting up Elasticsearch configuration..."
    
    cat > monitoring/elasticsearch/elasticsearch.yml << 'EOF'
cluster.name: ayazlogistics-cluster
node.name: ayazlogistics-node-1

network.host: 0.0.0.0
http.port: 9200

discovery.type: single-node

# Memory settings
bootstrap.memory_lock: true

# Index settings
action.auto_create_index: false
action.destructive_requires_name: true

# Security settings
xpack.security.enabled: false
xpack.security.transport.ssl.enabled: false
xpack.security.http.ssl.enabled: false

# Monitoring settings
xpack.monitoring.collection.enabled: true
xpack.monitoring.elasticsearch.collection.enabled: true

# Logging settings
logger.level: INFO
logger.org.elasticsearch.transport: WARN
logger.org.elasticsearch.discovery: WARN

# Performance settings
indices.memory.index_buffer_size: 20%
indices.breaker.total.limit: 70%
indices.breaker.fielddata.limit: 40%
indices.breaker.request.limit: 60%

# Index lifecycle management
xpack.ilm.enabled: true

# Machine learning
xpack.ml.enabled: true
xpack.ml.max_open_jobs: 10

# Watcher
xpack.watcher.enabled: true

# Alerting
xpack.alerting.enabled: true
EOF

    print_success "Elasticsearch configuration created"
}

# Create Logstash configuration
setup_logstash() {
    print_status "Setting up Logstash configuration..."
    
    cat > monitoring/elk/logstash.conf << 'EOF'
input {
  beats {
    port => 5044
  }
  
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  if [type] == "ayazlogistics" {
    json {
      source => "message"
    }
    
    grok {
      match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} \[%{DATA:context}\] %{GREEDYDATA:msg}" }
    }
    
    date {
      match => [ "timestamp", "ISO8601" ]
      target => "@timestamp"
    }
    
    mutate {
      add_field => {
        "app" => "ayazlogistics"
        "environment" => "${ENVIRONMENT:development}"
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "ayazlogistics-%{+YYYY.MM.dd}"
    user => "${ELASTIC_USER:elastic}"
    password => "${ELASTIC_PASSWORD:changeme}"
  }
  
  if [level] == "ERROR" or [level] == "FATAL" {
    slack {
      url => "${SLACK_WEBHOOK_URL}"
      format => "Error in %{app}: %{msg}"
    }
  }
  
  stdout {
    codec => rubydebug
  }
}
EOF

    print_success "Logstash configuration created"
}

# Create Alertmanager configuration
setup_alertmanager() {
    print_status "Setting up Alertmanager configuration..."
    
    cat > monitoring/alertmanager/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@ayazlogistics.com'
  smtp_auth_username: 'alerts@ayazlogistics.com'
  smtp_auth_password: 'alertspassword'

route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 5s
      repeat_interval: 5m
    - match:
        severity: warning
      receiver: 'warning-alerts'
      group_wait: 30s
      repeat_interval: 30m

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/'

  - name: 'critical-alerts'
    email_configs:
      - to: 'admin@ayazlogistics.com'
        subject: '[CRITICAL] AyazLogistics Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Service: {{ .Labels.service }}
          Instance: {{ .Labels.instance }}
          {{ end }}

  - name: 'warning-alerts'
    email_configs:
      - to: 'team@ayazlogistics.com'
        subject: '[WARNING] AyazLogistics Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Service: {{ .Labels.service }}
          Instance: {{ .Labels.instance }}
          {{ end }}
EOF

    print_success "Alertmanager configuration created"
}

# Create Docker Compose file
create_docker_compose() {
    print_status "Creating Docker Compose file..."
    
    cat > monitoring/docker-compose.monitoring.yml << 'EOF'
version: '3.8'

services:
  # Prometheus - Metrics Collection
  prometheus:
    image: prom/prometheus:latest
    container_name: ayazlogistics-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alert-rules.yml:/etc/prometheus/alert-rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    networks:
      - monitoring
    restart: unless-stopped

  # Grafana - Visualization
  grafana:
    image: grafana/grafana:latest
    container_name: ayazlogistics-grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=ayazlogistics123
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel
      - GF_SECURITY_DISABLE_GRAVATAR=true
      - GF_ANALYTICS_REPORTING_ENABLED=false
      - GF_ANALYTICS_CHECK_FOR_UPDATES=false
    networks:
      - monitoring
    restart: unless-stopped
    depends_on:
      - prometheus

  # Elasticsearch - Log Storage
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    container_name: ayazlogistics-elasticsearch
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
      - ./elasticsearch/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
      - bootstrap.memory_lock=true
    ulimits:
      memlock:
        soft: -1
        hard: -1
    networks:
      - monitoring
    restart: unless-stopped

  # Kibana - Log Visualization
  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    container_name: ayazlogistics-kibana
    ports:
      - "5601:5601"
    volumes:
      - ./kibana/kibana.yml:/usr/share/kibana/config/kibana.yml
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=elastic
      - ELASTICSEARCH_PASSWORD=changeme
    networks:
      - monitoring
    restart: unless-stopped
    depends_on:
      - elasticsearch

  # Logstash - Log Processing
  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    container_name: ayazlogistics-logstash
    ports:
      - "5044:5044"
      - "5000:5000"
    volumes:
      - ./elk/logstash.conf:/usr/share/logstash/pipeline/logstash.conf
      - ./elk/logstash.yml:/usr/share/logstash/config/logstash.yml
    environment:
      - LS_JAVA_OPTS=-Xmx512m -Xms512m
    networks:
      - monitoring
    restart: unless-stopped
    depends_on:
      - elasticsearch

  # Node Exporter - System Metrics
  node-exporter:
    image: prom/node-exporter:latest
    container_name: ayazlogistics-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring
    restart: unless-stopped

  # cAdvisor - Container Metrics
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: ayazlogistics-cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    privileged: true
    devices:
      - /dev/kmsg
    networks:
      - monitoring
    restart: unless-stopped

  # Alertmanager - Alert Management
  alertmanager:
    image: prom/alertmanager:latest
    container_name: ayazlogistics-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    networks:
      - monitoring
    restart: unless-stopped

volumes:
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
  elasticsearch_data:
    driver: local
  alertmanager_data:
    driver: local

networks:
  monitoring:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
EOF

    print_success "Docker Compose file created"
}

# Start monitoring stack
start_monitoring() {
    print_status "Starting monitoring stack..."
    
    cd monitoring
    docker-compose -f docker-compose.monitoring.yml up -d
    
    print_success "Monitoring stack started"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for Prometheus
    print_status "Waiting for Prometheus..."
    timeout 60 bash -c 'until curl -f http://localhost:9090/-/healthy; do sleep 2; done'
    print_success "Prometheus is ready"
    
    # Wait for Grafana
    print_status "Waiting for Grafana..."
    timeout 60 bash -c 'until curl -f http://localhost:3001/api/health; do sleep 2; done'
    print_success "Grafana is ready"
    
    # Wait for Elasticsearch
    print_status "Waiting for Elasticsearch..."
    timeout 60 bash -c 'until curl -f http://localhost:9200/_cluster/health; do sleep 2; done'
    print_success "Elasticsearch is ready"
    
    # Wait for Kibana
    print_status "Waiting for Kibana..."
    timeout 60 bash -c 'until curl -f http://localhost:5601/api/status; do sleep 2; done'
    print_success "Kibana is ready"
}

# Display access information
show_access_info() {
    print_success "🎉 Monitoring stack setup completed!"
    echo ""
    echo "📊 Access Information:"
    echo "  • Prometheus: http://localhost:9090"
    echo "  • Grafana: http://localhost:3001 (admin/ayazlogistics123)"
    echo "  • Elasticsearch: http://localhost:9200"
    echo "  • Kibana: http://localhost:5601"
    echo "  • Alertmanager: http://localhost:9093"
    echo ""
    echo "🔧 Management Commands:"
    echo "  • Stop: docker-compose -f monitoring/docker-compose.monitoring.yml down"
    echo "  • Restart: docker-compose -f monitoring/docker-compose.monitoring.yml restart"
    echo "  • Logs: docker-compose -f monitoring/docker-compose.monitoring.yml logs -f"
    echo ""
    echo "📈 Next Steps:"
    echo "  1. Access Grafana and import dashboards"
    echo "  2. Configure alert rules in Prometheus"
    echo "  3. Set up log shipping from your applications"
    echo "  4. Configure alert notifications in Alertmanager"
}

# Main execution
main() {
    print_status "Starting AyazLogistics Monitoring Setup..."
    
    check_docker
    setup_directories
    setup_prometheus
    setup_grafana
    setup_elasticsearch
    setup_logstash
    setup_alertmanager
    create_docker_compose
    start_monitoring
    wait_for_services
    show_access_info
    
    print_success "🎉 Monitoring setup completed successfully!"
}

# Run main function
main "$@"
