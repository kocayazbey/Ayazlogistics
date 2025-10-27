import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 },    // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate must be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export default function () {
  // Test data
  const testData = {
    origin: { lat: 40.7128, lng: -74.0060 },
    destinations: [
      { lat: 40.7589, lng: -73.9851, priority: 1 },
      { lat: 40.6892, lng: -74.0445, priority: 2 },
      { lat: 40.7505, lng: -73.9934, priority: 3 },
    ],
    constraints: {
      maxDistance: 100,
      maxTime: 2,
    },
  };

  // Headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };

  // Test 1: Route Optimization
  let response = http.post(`${BASE_URL}/api/v1/ai/optimize-route`, JSON.stringify(testData), {
    headers: headers,
  });

  let success = check(response, {
    'route optimization status is 200': (r) => r.status === 200,
    'route optimization response time < 5s': (r) => r.timings.duration < 5000,
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

  // Test 2: Demand Forecasting
  const demandData = {
    sku: 'PROD-001',
    historicalData: Array.from({ length: 30 }, () => Math.random() * 100),
    horizon: 7,
  };

  response = http.post(`${BASE_URL}/api/v1/ai/forecast-demand`, JSON.stringify(demandData), {
    headers: headers,
  });

  success = check(response, {
    'demand forecasting status is 200': (r) => r.status === 200,
    'demand forecasting response time < 10s': (r) => r.timings.duration < 10000,
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

  // Test 3: AI Insights
  const insightsData = {
    data: {
      shipments: { total: 1000, onTime: 950, delayed: 50 },
      warehouses: { utilization: 0.8, capacity: 10000, throughput: 500 },
      routes: { averageDistance: 45, averageTime: 2, fuelEfficiency: 0.7 },
      customers: { satisfaction: 4.5, complaints: 5, retention: 0.9 },
    },
  };

  response = http.post(`${BASE_URL}/api/v1/ai/generate-insights`, JSON.stringify(insightsData), {
    headers: headers,
  });

  success = check(response, {
    'insights generation status is 200': (r) => r.status === 200,
    'insights generation response time < 15s': (r) => r.timings.duration < 15000,
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

  // Test 4: Health Check
  response = http.get(`${BASE_URL}/health`);

  success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 1s': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);

  // Test 5: Database Operations
  response = http.get(`${BASE_URL}/api/v1/vehicles`);

  success = check(response, {
    'vehicles list status is 200': (r) => r.status === 200,
    'vehicles list response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);

  // Test 6: Authentication
  const authData = {
    email: 'test@example.com',
    password: 'testpassword',
  };

  response = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(authData), {
    headers: { 'Content-Type': 'application/json' },
  });

  success = check(response, {
    'auth login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'auth login response time < 3s': (r) => r.timings.duration < 3000,
  });

  errorRate.add(!success);

  // Wait between requests
  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    'load-test-results.html': htmlReport(data),
  };
}

function htmlReport(data) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Load Test Results</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
          .success { background-color: #d4edda; }
          .warning { background-color: #fff3cd; }
          .error { background-color: #f8d7da; }
        </style>
      </head>
      <body>
        <h1>Load Test Results</h1>
        <div class="metric">
          <h3>Test Summary</h3>
          <p>Duration: ${data.state.testRunDurationMs}ms</p>
          <p>VUs: ${data.metrics.vus.values.max}</p>
          <p>Iterations: ${data.metrics.iterations.values.count}</p>
        </div>
        <div class="metric">
          <h3>HTTP Requests</h3>
          <p>Total: ${data.metrics.http_reqs.values.count}</p>
          <p>Failed: ${data.metrics.http_req_failed.values.rate * 100}%</p>
          <p>Average Duration: ${data.metrics.http_req_duration.values.avg}ms</p>
        </div>
        <div class="metric">
          <h3>Error Rate</h3>
          <p>Errors: ${data.metrics.errors.values.rate * 100}%</p>
        </div>
      </body>
    </html>
  `;
}
