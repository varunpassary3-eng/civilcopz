import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Test Configuration (Phase 2)
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 100 },  // Sustained load of 100 users
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must stay below 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

export default function () {
  const url = __ENV.API_URL || 'http://localhost:4000/api/cases';
  
  const payload = JSON.stringify({
    title: `Load Test Grievance ${Math.floor(Math.random() * 1000)}`,
    description: "This is an automated load testing grievance to verify system stability under national-scale pressure. Unauthorized charges detected in the service layer.",
    company: "TestBank Infrastructure",
    category: "Banking",
    jurisdiction: "District"
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Authorization would go here if testing authenticated flow
    },
  };

  const res = http.post(url, payload, params);

  check(res, { 
    'status is 201': (r) => r.status === 201,
    'has aiQueued': (r) => r.json().aiQueued === true
  });

  sleep(1);
}
