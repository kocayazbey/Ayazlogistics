import autocannon from 'autocannon';

async function runLoadTest() {
  console.log('Starting load test...');

  const result = await autocannon({
    url: 'http://localhost:3000/api/v1/health',
    connections: 100,
    duration: 60,
    pipelining: 10,
    requests: [
      {
        method: 'GET',
        path: '/api/v1/health',
      },
      {
        method: 'POST',
        path: '/api/v1/auth/login',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@ayazlogistics.com',
          password: 'Admin123!',
        }),
      },
    ],
  });

  console.log('Load Test Results:');
  console.log(`Requests: ${result.requests.total}`);
  console.log(`Duration: ${result.duration}s`);
  console.log(`Throughput: ${result.throughput.average} req/sec`);
  console.log(`Latency (p50): ${result.latency.p50}ms`);
  console.log(`Latency (p95): ${result.latency.p95}ms`);
  console.log(`Latency (p99): ${result.latency.p99}ms`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Timeouts: ${result.timeouts}`);
}

runLoadTest().catch(console.error);

