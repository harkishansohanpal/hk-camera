import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_BASE || 'http://localhost:5001';

export default function () {
  group('register', () => {
    const uid = `perf_user_${Date.now()}_${__VU}`;
    const payload = JSON.stringify({ email: `${uid}@test.com`, password: 'TestP@ss123', name: `Perf User ${__VU}` });
    const res = http.post(`${BASE_URL}/api/auth/register`, payload, { headers: { 'Content-Type': 'application/json' } });
    check(res, {
      'register status is 201': (r) => r.status === 201,
      'register returns token': (r) => r.json('data.accessToken') !== undefined,
    });
  });

  sleep(1);
}
