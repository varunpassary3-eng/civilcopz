import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users over 30s
    { duration: '1m', target: 50 },    // Stay at 50 users for 1 minute
    { duration: '30s', target: 100 },  // Ramp up to 100 users over 30s
    { duration: '1m', target: 100 },   // Stay at 100 users for 1 minute
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1000ms
    http_req_failed: ['rate<0.02'],    // Error rate should be below 2%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  // Health check test
  const healthResponse = http.get(`${BASE_URL}/health`);

  check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response contains status': (r) => r.json().status === 'ok',
    'health response contains services': (r) => r.json().services,
    'database is connected': (r) => r.json().services?.database === 'connected',
    'redis is connected': (r) => r.json().services?.redis === 'connected',
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Simulate user think time
  sleep(Math.random() * 2 + 1); // 1-3 second pause
}

// Setup function - runs before the test starts
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  console.log('Test will ramp up to 100 concurrent users');
}

// Teardown function - runs after the test completes
export function teardown(data) {
  console.log('Load test completed');
}