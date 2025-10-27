import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let routeOptimizationDuration = new Trend('route_optimization_duration');
export let demandForecastingDuration = new Trend('demand_forecasting_duration');
export let insightsGenerationDuration = new Trend('insights_generation_duration');

// Performance test configuration
export let options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm up
    { duration: '2m', target: 50 },   // Normal load
    { duration: '2m', target: 100 },  // High load
    { duration: '2m', target: 200 }, // Peak load
    { duration: '1m', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests must complete below 3s
    http_req_failed: ['rate<0.05'],   // Error rate must be below 5%
    route_optimization_duration: ['p(95)<5000'], // Route optimization under 5s
    demand_forecasting_duration: ['p(95)<10000'], // Demand forecasting under 10s
    insights_generation_duration: ['p(95)<15000'], // Insights generation under 15s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };

  // Test 1: Route Optimization Performance
  const routeData = {
    origin: { lat: 40.7128, lng: -74.0060 },
    destinations: Array.from({ length: 5 }, (_, i) => ({
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1,
      priority: Math.floor(Math.random() * 5) + 1,
    })),
    constraints: {
      maxDistance: 100,
      maxTime: 2,
    },
  };

  let startTime = Date.now();
  let response = http.post(`${BASE_URL}/api/v1/ai/optimize-route`, JSON.stringify(routeData), {
    headers: headers,
  });
  let duration = Date.now() - startTime;
  routeOptimizationDuration.add(duration);

  let success = check(response, {
    'route optimization status is 200': (r) => r.status === 200,
    'route optimization has optimized route': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.optimizedRoute && data.optimizedRoute.length > 0;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Test 2: Demand Forecasting Performance
  const demandData = {
    sku: 'PROD-001',
    historicalData: Array.from({ length: 30 }, () => Math.random() * 100),
    horizon: 14,
    modelType: 'lstm',
    includeConfidence: true,
  };

  startTime = Date.now();
  response = http.post(`${BASE_URL}/api/v1/ai/forecast-demand`, JSON.stringify(demandData), {
    headers: headers,
  });
  duration = Date.now() - startTime;
  demandForecastingDuration.add(duration);

  success = check(response, {
    'demand forecasting status is 200': (r) => r.status === 200,
    'demand forecasting has prediction': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.forecast && data.forecast.length > 0;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Test 3: AI Insights Performance
  const insightsData = {
    data: {
      shipments: {
        total: Math.floor(Math.random() * 2000) + 500,
        onTime: Math.floor(Math.random() * 1800) + 400,
        delayed: Math.floor(Math.random() * 200) + 10,
      },
      warehouses: {
        utilization: Math.random() * 0.5 + 0.5,
        capacity: 10000,
        throughput: Math.floor(Math.random() * 600) + 200,
      },
      routes: {
        averageDistance: Math.random() * 80 + 20,
        averageTime: Math.random() * 4 + 1,
        fuelEfficiency: Math.random() * 0.5 + 0.5,
      },
      customers: {
        satisfaction: Math.random() * 2 + 3,
        complaints: Math.floor(Math.random() * 50),
        retention: Math.random() * 0.3 + 0.7,
      },
    },
    analysisType: 'comprehensive',
    includeRecommendations: true,
    includeRiskAssessment: true,
  };

  startTime = Date.now();
  response = http.post(`${BASE_URL}/api/v1/ai/generate-insights`, JSON.stringify(insightsData), {
    headers: headers,
  });
  duration = Date.now() - startTime;
  insightsGenerationDuration.add(duration);

  success = check(response, {
    'insights generation status is 200': (r) => r.status === 200,
    'insights generation has insights': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.summary && data.summary.length > 0;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Test 4: Database Query Performance
  response = http.get(`${BASE_URL}/api/v1/vehicles`, { headers: headers });

  success = check(response, {
    'vehicles list status is 200': (r) => r.status === 200,
    'vehicles list response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);

  // Test 5: Concurrent Operations
  const concurrentRequests = [
    http.get(`${BASE_URL}/api/v1/vehicles`, { headers: headers }),
    http.get(`${BASE_URL}/api/v1/drivers`, { headers: headers }),
    http.get(`${BASE_URL}/api/v1/routes`, { headers: headers }),
  ];

  concurrentRequests.forEach((req, index) => {
    success = check(req, {
      [`concurrent request ${index + 1} status is 200`]: (r) => r.status === 200,
      [`concurrent request ${index + 1} response time < 3s`]: (r) => r.timings.duration < 3000,
    });
    errorRate.add(!success);
  });

  // Test 6: Memory and CPU Intensive Operations
  const complexRouteData = {
    origin: { lat: 40.7128, lng: -74.0060 },
    destinations: Array.from({ length: 20 }, (_, i) => ({
      lat: 40.7128 + (Math.random() - 0.5) * 0.2,
      lng: -74.0060 + (Math.random() - 0.5) * 0.2,
      priority: Math.floor(Math.random() * 10) + 1,
    })),
    constraints: {
      maxDistance: 200,
      maxTime: 8,
      vehicleCapacity: 1000,
    },
  };

  startTime = Date.now();
  response = http.post(`${BASE_URL}/api/v1/ai/optimize-route`, JSON.stringify(complexRouteData), {
    headers: headers,
  });
  duration = Date.now() - startTime;

  success = check(response, {
    'complex route optimization status is 200': (r) => r.status === 200,
    'complex route optimization response time < 10s': (r) => r.timings.duration < 10000,
  });

  errorRate.add(!success);

  // Test 7: Stress Test - Multiple AI Operations
  const stressTestData = {
    origin: { lat: 40.7128, lng: -74.0060 },
    destinations: Array.from({ length: 10 }, (_, i) => ({
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1,
      priority: Math.floor(Math.random() * 5) + 1,
    })),
    constraints: { maxDistance: 100 },
  };

  // Run multiple operations simultaneously
  const stressRequests = [
    http.post(`${BASE_URL}/api/v1/ai/optimize-route`, JSON.stringify(stressTestData), { headers: headers }),
    http.post(`${BASE_URL}/api/v1/ai/forecast-demand`, JSON.stringify({
      sku: 'PROD-001',
      historicalData: Array.from({ length: 30 }, () => Math.random() * 100),
      horizon: 7,
    }), { headers: headers }),
    http.post(`${BASE_URL}/api/v1/ai/generate-insights`, JSON.stringify({
      data: {
        shipments: { total: 1000, onTime: 950, delayed: 50 },
        warehouses: { utilization: 0.8, capacity: 10000, throughput: 500 },
        routes: { averageDistance: 45, averageTime: 2, fuelEfficiency: 0.7 },
        customers: { satisfaction: 4.5, complaints: 5, retention: 0.9 },
      },
    }), { headers: headers }),
  ];

  stressRequests.forEach((req, index) => {
    success = check(req, {
      [`stress test request ${index + 1} status is 200`]: (r) => r.status === 200,
      [`stress test request ${index + 1} response time < 15s`]: (r) => r.timings.duration < 15000,
    });
    errorRate.add(!success);
  });

  // Wait between requests
  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'performance-test-results.json': JSON.stringify(data, null, 2),
    'performance-test-results.html': generateHtmlReport(data),
  };
}

function generateHtmlReport(data) {
  const metrics = data.metrics;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Performance Test Results</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .metric { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .success { background-color: #d4edda; border-color: #c3e6cb; }
          .warning { background-color: #fff3cd; border-color: #ffeaa7; }
          .error { background-color: #f8d7da; border-color: #f5c6cb; }
          .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px; }
          .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
          .metric-value { font-size: 1.5em; font-weight: bold; color: #007bff; }
          .metric-label { color: #666; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 AyazLogistics Performance Test Results</h1>
          <p>Test Duration: ${Math.round(data.state.testRunDurationMs / 1000)}s | 
             Max VUs: ${metrics.vus.values.max} | 
             Total Iterations: ${metrics.iterations.values.count}</p>
        </div>

        <div class="metric-grid">
          <div class="metric success">
            <div class="metric-label">HTTP Requests</div>
            <div class="metric-value">${metrics.http_reqs.values.count}</div>
            <p>Total requests processed</p>
          </div>

          <div class="metric ${metrics.http_req_failed.values.rate < 0.05 ? 'success' : 'error'}">
            <div class="metric-label">Error Rate</div>
            <div class="metric-value">${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%</div>
            <p>Failed requests</p>
          </div>

          <div class="metric ${metrics.http_req_duration.values.p95 < 3000 ? 'success' : 'warning'}">
            <div class="metric-label">Response Time (P95)</div>
            <div class="metric-value">${Math.round(metrics.http_req_duration.values.p95)}ms</div>
            <p>95th percentile</p>
          </div>

          <div class="metric ${metrics.route_optimization_duration?.values.p95 < 5000 ? 'success' : 'warning'}">
            <div class="metric-label">Route Optimization (P95)</div>
            <div class="metric-value">${Math.round(metrics.route_optimization_duration?.values.p95 || 0)}ms</div>
            <p>AI route optimization</p>
          </div>

          <div class="metric ${metrics.demand_forecasting_duration?.values.p95 < 10000 ? 'success' : 'warning'}">
            <div class="metric-label">Demand Forecasting (P95)</div>
            <div class="metric-value">${Math.round(metrics.demand_forecasting_duration?.values.p95 || 0)}ms</div>
            <p>AI demand forecasting</p>
          </div>

          <div class="metric ${metrics.insights_generation_duration?.values.p95 < 15000 ? 'success' : 'warning'}">
            <div class="metric-label">Insights Generation (P95)</div>
            <div class="metric-value">${Math.round(metrics.insights_generation_duration?.values.p95 || 0)}ms</div>
            <p>AI insights generation</p>
          </div>
        </div>

        <div class="metric">
          <h3>📊 Performance Summary</h3>
          <p><strong>Overall Status:</strong> ${metrics.http_req_failed.values.rate < 0.05 && metrics.http_req_duration.values.p95 < 3000 ? '✅ PASSED' : '❌ FAILED'}</p>
          <p><strong>Average Response Time:</strong> ${Math.round(metrics.http_req_duration.values.avg)}ms</p>
          <p><strong>Max Response Time:</strong> ${Math.round(metrics.http_req_duration.values.max)}ms</p>
          <p><strong>Requests per Second:</strong> ${(metrics.http_reqs.values.count / (data.state.testRunDurationMs / 1000)).toFixed(2)}</p>
        </div>

        <div class="metric">
          <h3>🎯 AI Services Performance</h3>
          <ul>
            <li>Route Optimization: ${metrics.route_optimization_duration?.values.p95 < 5000 ? '✅' : '⚠️'} ${Math.round(metrics.route_optimization_duration?.values.p95 || 0)}ms (P95)</li>
            <li>Demand Forecasting: ${metrics.demand_forecasting_duration?.values.p95 < 10000 ? '✅' : '⚠️'} ${Math.round(metrics.demand_forecasting_duration?.values.p95 || 0)}ms (P95)</li>
            <li>Insights Generation: ${metrics.insights_generation_duration?.values.p95 < 15000 ? '✅' : '⚠️'} ${Math.round(metrics.insights_generation_duration?.values.p95 || 0)}ms (P95)</li>
          </ul>
        </div>
      </body>
    </html>
  `;
}
