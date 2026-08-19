import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, HEADERS } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Normal load
    { duration: '1m',  target: 300 }, // High load
    { duration: '2m',  target: 500 }, // Stress limit
    { duration: '30s', target: 0 },   // Recovery phase
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // Under stress, p95 must be < 200ms
    http_req_failed: ['rate<0.05'],   // Error rate under 5% under extreme stress
  },
};

export default function () {
  const params = { headers: HEADERS };

  const resRedirect = http.get(`${BASE_URL}/demo`, {
    ...params,
    redirects: 0,
  });
  check(resRedirect, {
    'response received': (r) => r.status > 0,
  });

  sleep(0.2);
}
