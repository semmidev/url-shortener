export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const HEADERS = {
  'X-Load-Test': 'true',
  'X-Bypass-Rate-Limit': 'true',
};

export const THRESHOLDS = {
  http_req_duration: ['p(95)<50', 'p(99)<100'], // 95% of requests under 50ms, 99% under 100ms
  http_req_failed: ['rate<0.01'],             // Error rate under 1%
};
