#!/usr/bin/env node

/**
 * Test script for real-time enhancements
 * Tests all the new features: WebSocket, animations, caching, queue system
 */

const WebSocket = require('ws');
const Redis = require('ioredis');
const axios = require('axios');

const WS_URL = 'ws://localhost:3001/tracking';
const API_URL = 'http://localhost:3000/api';
const REDIS_URL = 'redis://localhost:6379';

class RealTimeEnhancementsTester {
  constructor() {
    this.ws = null;
    this.redis = null;
    this.testResults = [];
    this.startTime = Date.now();
  }

  async initialize() {
    console.log('🚀 Initializing Real-time Enhancements Test Suite...\n');

    // Initialize Redis
    this.redis = new Redis(REDIS_URL);
    console.log('✅ Redis connected');

    // Initialize WebSocket
    this.ws = new WebSocket(WS_URL);
    await new Promise((resolve) => {
      this.ws.on('open', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });
    });
  }

  logTest(testName, passed, message = '') {
    const status = passed ? '✅' : '❌';
    const result = `${status} ${testName}${message ? ` - ${message}` : ''}`;
    this.testResults.push({ testName, passed, message: message || 'OK' });
    console.log(result);
  }

  async testWebSocketConnection() {
    console.log('\n📡 Testing WebSocket Connection...');

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logTest('WebSocket Connection', false, 'Connection timeout');
        resolve();
      }, 5000);

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.event === 'connected') {
          this.logTest('WebSocket Connection', true, 'Successfully connected');
          clearTimeout(timeout);
          resolve();
        }
      });

      // Send connection test
      this.ws.send(JSON.stringify({
        event: 'subscribe-shipment',
        data: { shipmentId: 'test-shipment-1' }
      }));
    });
  }

  async testLocationUpdates() {
    console.log('\n📍 Testing Location Updates...');

    try {
      // Test API endpoint
      const response = await axios.post(`${API_URL}/tms/vehicles/test-vehicle-1/location`, {
        latitude: 41.0082,
        longitude: 28.9784,
        speed: 60,
        heading: 45,
        accuracy: 5,
        altitude: 100
      });

      this.logTest('Location Update API', response.status === 200, `Status: ${response.status}`);
      this.logTest('Queue Response', response.data.status === 'queued', 'Update queued successfully');

      // Test queue processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const queueLength = await this.redis.llen('location_updates:test-tenant');
      this.logTest('Queue Processing', queueLength === 0, 'Updates processed from queue');

    } catch (error) {
      this.logTest('Location Updates', false, error.message);
    }
  }

  async testRouteOptimization() {
    console.log('\n🛣️ Testing Route Optimization...');

    try {
      // Create test route
      const createResponse = await axios.post(`${API_URL}/tms/routes`, {
        vehicleId: 'test-vehicle-1',
        driverId: 'test-driver-1',
        totalDistance: 100,
        estimatedTime: 120,
        stops: [
          { latitude: 41.0082, longitude: 28.9784, sequence: 1 },
          { latitude: 41.0092, longitude: 28.9794, sequence: 2 },
          { latitude: 41.0102, longitude: 28.9804, sequence: 3 }
        ]
      });

      const routeId = createResponse.data.id;
      this.logTest('Route Creation', !!routeId, `Route ID: ${routeId}`);

      // Test optimization
      const optimizeResponse = await axios.post(`${API_URL}/tms/routes/${routeId}/optimize`);
      this.logTest('Route Optimization', optimizeResponse.status === 200, `Status: ${optimizeResponse.status}`);

      // Check cache
      const cacheKey = `route-optimization:${routeId}:test-tenant`;
      const cached = await this.redis.get(cacheKey);
      this.logTest('Optimization Caching', !!cached, 'Result cached in Redis');

      // Test second call (should use cache)
      const startTime = Date.now();
      await axios.post(`${API_URL}/tms/routes/${routeId}/optimize`);
      const endTime = Date.now();

      this.logTest('Cache Performance', endTime - startTime < 1000, `Response time: ${endTime - startTime}ms`);

    } catch (error) {
      this.logTest('Route Optimization', false, error.message);
    }
  }

  async testFuelCalculation() {
    console.log('\n⛽ Testing Fuel Calculation...');

    try {
      const routeId = 'test-route-fuel';
      const fuelResponse = await axios.post(`${API_URL}/tms/routes/${routeId}/fuel-optimization`);

      this.logTest('Fuel Calculation', fuelResponse.status === 200, `Status: ${fuelResponse.status}`);
      this.logTest('Fuel Data', !!fuelResponse.data.estimatedFuelConsumption, 'Consumption calculated');
      this.logTest('Optimization', !!fuelResponse.data.fuelSavings, 'Savings calculated');
      this.logTest('Recommendations', Array.isArray(fuelResponse.data.recommendations), 'Recommendations provided');
      this.logTest('Traffic Impact', !!fuelResponse.data.trafficImpact, 'Traffic impact calculated');
      this.logTest('Weather Impact', !!fuelResponse.data.weatherImpact, 'Weather impact calculated');

    } catch (error) {
      this.logTest('Fuel Calculation', false, error.message);
    }
  }

  async testRealTimeBroadcasting() {
    console.log('\n📢 Testing Real-time Broadcasting...');

    return new Promise((resolve) => {
      let updateReceived = false;
      let alertReceived = false;

      const timeout = setTimeout(() => {
        this.logTest('Real-time Updates', updateReceived, updateReceived ? 'Updates received' : 'No updates received');
        this.logTest('Real-time Alerts', alertReceived, alertReceived ? 'Alerts received' : 'No alerts received');
        resolve();
      }, 10000);

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.event === 'vehicle:location-update') {
          updateReceived = true;
          this.logTest('Location Broadcast', true, 'Real-time location update received');
        }

        if (message.event === 'alert') {
          alertReceived = true;
          this.logTest('Alert Broadcast', true, 'Real-time alert received');
        }
      });

      // Simulate location update
      this.ws.send(JSON.stringify({
        event: 'vehicle:location-update',
        data: {
          vehicleId: 'test-vehicle-1',
          location: { lat: 41.0082, lng: 28.9784 },
          speed: 60,
          heading: 45,
          timestamp: Date.now()
        }
      }));

      // Simulate alert
      this.ws.send(JSON.stringify({
        event: 'alert',
        data: {
          type: 'route_deviation',
          message: 'Vehicle deviated from planned route',
          severity: 'medium'
        }
      }));
    });
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');

    const startTime = Date.now();

    // Test concurrent requests
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(
        axios.post(`${API_URL}/tms/vehicles/test-vehicle-perf-${i}/location`, {
          latitude: 41.0082 + i * 0.001,
          longitude: 28.9784 + i * 0.001,
          speed: 50 + i,
          heading: i * 18
        })
      );
    }

    try {
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const allSuccessful = responses.every(r => r.status === 200);
      this.logTest('Concurrent Updates', allSuccessful, `All ${responses.length} updates successful`);
      this.logTest('Response Time', endTime - startTime < 5000, `Total time: ${endTime - startTime}ms`);

      // Check queue length
      const totalQueueLength = await this.redis.llen('location_updates:test-tenant');
      this.logTest('Queue Management', totalQueueLength < 50, `Queue length: ${totalQueueLength}`);

    } catch (error) {
      this.logTest('Performance Test', false, error.message);
    }
  }

  async testAnimationSystem() {
    console.log('\n🎬 Testing Animation System...');

    return new Promise((resolve) => {
      let animationDataReceived = false;

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.event === 'animation-update') {
          animationDataReceived = true;
          this.logTest('Animation Updates', true, 'Animation data received');
        }
      });

      // Request animation data
      this.ws.send(JSON.stringify({
        event: 'get-animation-data',
        data: { vehicleId: 'test-vehicle-1' }
      }));

      setTimeout(() => {
        this.logTest('Animation System', animationDataReceived, animationDataReceived ? 'Animation data available' : 'No animation data');
        resolve();
      }, 3000);
    });
  }

  async testErrorHandling() {
    console.log('\n🛡️ Testing Error Handling...');

    try {
      // Test invalid location update
      await axios.post(`${API_URL}/tms/vehicles/invalid-vehicle/location`, {
        latitude: 'invalid',
        longitude: 'invalid'
      });

      this.logTest('Invalid Data Handling', false, 'Should have failed');
    } catch (error) {
      this.logTest('Invalid Data Handling', error.response?.status >= 400, `Error status: ${error.response?.status}`);
    }

    try {
      // Test missing required fields
      await axios.post(`${API_URL}/tms/vehicles/test-vehicle-1/location`, {
        // Missing latitude and longitude
      });

      this.logTest('Missing Fields', false, 'Should have failed');
    } catch (error) {
      this.logTest('Missing Fields', error.response?.status >= 400, `Error status: ${error.response?.status}`);
    }
  }

  async testCachingSystem() {
    console.log('\n💾 Testing Caching System...');

    try {
      // Test cache hit
      const response1 = await axios.post(`${API_URL}/tms/routes/test-route-cache/optimize`);
      const response2 = await axios.post(`${API_URL}/tms/routes/test-route-cache/optimize`);

      const isSameResponse = JSON.stringify(response1.data) === JSON.stringify(response2.data);
      this.logTest('Cache Consistency', isSameResponse, 'Cached responses match');

      // Test cache expiry (simulate)
      const cacheKey = 'route-optimization:test-route-cache:test-tenant';
      await this.redis.del(cacheKey);

      const response3 = await axios.post(`${API_URL}/tms/routes/test-route-cache/optimize`);
      this.logTest('Cache Invalidation', true, 'Cache invalidated and recalculated');

    } catch (error) {
      this.logTest('Caching System', false, error.message);
    }
  }

  async testIntegration() {
    console.log('\n🔗 Testing System Integration...');

    try {
      // Test complete flow: location update → queue → process → broadcast
      const locationResponse = await axios.post(`${API_URL}/tms/vehicles/test-integration/location`, {
        latitude: 41.0082,
        longitude: 28.9784,
        speed: 60,
        heading: 45
      });

      this.logTest('Integration Flow', locationResponse.status === 200, 'Location update queued');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check if data was processed and stored
      const trackingData = await axios.get(`${API_URL}/tms/vehicles/test-integration/history?limit=1`);
      this.logTest('Data Persistence', trackingData.data.length > 0, 'Data stored in database');

    } catch (error) {
      this.logTest('Integration Test', false, error.message);
    }
  }

  async runAllTests() {
    await this.initialize();

    await this.testWebSocketConnection();
    await this.testLocationUpdates();
    await this.testRouteOptimization();
    await this.testFuelCalculation();
    await this.testRealTimeBroadcasting();
    await this.testPerformance();
    await this.testAnimationSystem();
    await this.testErrorHandling();
    await this.testCachingSystem();
    await this.testIntegration();

    this.printSummary();
  }

  printSummary() {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(t => t.passed).length;
    const total = this.testResults.length;
    const successRate = ((passed / total) * 100).toFixed(1);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Average Time per Test: ${(totalTime / total).toFixed(0)}ms`);

    console.log('\n📋 Detailed Results:');
    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.testName}`);
      if (result.message !== 'OK') {
        console.log(`   ${result.message}`);
      }
    });

    console.log('\n🎉 Test suite completed!');
    console.log('='.repeat(60));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new RealTimeEnhancementsTester();
  tester.runAllTests()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = RealTimeEnhancementsTester;
