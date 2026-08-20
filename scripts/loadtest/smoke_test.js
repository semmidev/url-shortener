import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, HEADERS, THRESHOLDS } from './config.js';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: THRESHOLDS,
};

export default function () {
  const params = { headers: HEADERS };

  // Test 1: Health check
  const resHealth = http.get(`${BASE_URL}/healthz`, params);
  check(resHealth, {
    'healthz status is 200': (r) => r.status === 200,
  });

  // Test 2: Redirect lookup with sample code
  const resRedirect = http.get(`${BASE_URL}/google`, {
    ...params,
    redirects: 0,
  });
  check(resRedirect, {
    'redirect status is 307 or 404': (r) => r.status === 307 || r.status === 404,
  });

  sleep(1);
}
