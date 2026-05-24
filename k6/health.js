import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE || 'http://localhost:5001';

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'health status is 200': (r) => r.status === 200,
    'response has success': (r) => r.json('success') === true,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });
  sleep(1);
}
