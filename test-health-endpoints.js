const http = require('http');

// Test health endpoints
const testHealthEndpoints = async () => {
  const baseUrl = 'http://localhost:3000';
  
  const endpoints = [
    '/health',
    '/health/detailed',
    '/health/metrics'
  ];

  console.log('🔍 Testing Health Check Endpoints...\n');

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${baseUrl}${endpoint}`);
      
      const response = await makeRequest(`${baseUrl}${endpoint}`);
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
      console.log('─'.repeat(50));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log('─'.repeat(50));
    }
  }
};

const makeRequest = (url) => {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

// Test if server is running
const testServerConnection = async () => {
  try {
    console.log('🔍 Checking if server is running...');
    const response = await makeRequest('http://localhost:3000/health');
    console.log('✅ Server is running!\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('💡 Please start the server with: npm run start:dev\n');
    return false;
  }
};

// Main execution
const main = async () => {
  console.log('🚀 Health Check Endpoint Tester');
  console.log('═'.repeat(50));
  
  const serverRunning = await testServerConnection();
  
  if (serverRunning) {
    await testHealthEndpoints();
  }
  
  console.log('\n✨ Testing completed!');
};

main().catch(console.error);
