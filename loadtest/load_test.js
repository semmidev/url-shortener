import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 VUs
    { duration: '1m',  target: 100 }, // Ramp up to 100 VUs
    { duration: '2m',  target: 100 }, // Stay at 100 VUs
    { duration: '30s', target: 0 },   // Ramp down to 0 VUs
  ],
  thresholds: THRESHOLDS,
};

export default function () {
  // 1. High throughput redirect GET /{code}
  const resRedirect = http.get(`${BASE_URL}/demo`, { redirects: 0 });
  check(resRedirect, {
    'redirect is 307 or 404': (r) => r.status === 307 || r.status === 404,
  });

  // 2. Short URL Instant Preview GET /{code}/preview
  const resPreview = http.get(`${BASE_URL}/demo/preview`);
  check(resPreview, {
    'preview is 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.5);
}
