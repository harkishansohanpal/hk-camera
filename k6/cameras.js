import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 2 },
    { duration: '10s', target: 5 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_BASE || 'http://localhost:5001';

// Use a pre-created token or register inline
// For local testing, create a real user first
const EMAIL = `perf_${Date.now()}@test.com`;
const PASSWORD = 'TestP@ss123';

export function setup() {
  const regRes = http.post(`${BASE_URL}/api/auth/register`, 
    JSON.stringify({ email: EMAIL, password: PASSWORD, name: 'Perf Tester' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const token = regRes.json('data.accessToken');
  return { token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // List cameras
  const listRes = http.get(`${BASE_URL}/api/cameras`, { headers });
  check(listRes, {
    'list cameras status is 200': (r) => r.status === 200,
  });

  // Create a camera
  const createRes = http.post(`${BASE_URL}/api/cameras`,
    JSON.stringify({ name: `Perf Camera ${__VU}` }),
    { headers }
  );
  check(createRes, {
    'create camera status is 201': (r) => r.status === 201,
  });

  sleep(1);
}
