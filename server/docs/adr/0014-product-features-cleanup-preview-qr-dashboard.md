# ADR-0014: Product Features (Cleanup Worker, Preview & Safety, QR Code, Dashboard Analytics)

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

A production URL shortener requires rich product capabilities beyond basic redirection:
1. Expired URLs must be deactivated automatically to prevent serving outdated links.
2. Users need to preview links (`/{code}+`) and verify destination safety before being redirected.
3. Users and clients need QR code images for offline/mobile short link sharing.
4. Users need aggregated dashboard statistics (total URLs, total clicks, top referrers, device & country breakdowns).

## Decision

1. **Expiration Cleanup Worker**:
   - Added `DeactivateExpiredURLs` query in PostgreSQL.
   - Initialized a background ticker worker (`urlSvc.StartExpirationCleanupWorker`) executing every 1 minute.
2. **URL Preview & Safety Inspection**:
   - Added `GET /{code}/preview` and `GET /{code}+` endpoints returning domain metadata and safety analysis (`SAFE` vs `SUSPICIOUS`).
3. **QR Code Generation**:
   - Integrated `github.com/skip2/go-qrcode` to serve 256x256 `image/png` QR Code images at `GET /{code}/qr` and `GET /api/v1/urls/{id}/qr`.
4. **User Dashboard Aggregate Analytics**:
   - Added SQL aggregation queries (`GetUserDashboardSummary`, `GetUserTopReferrers`, `GetUserDeviceBreakdown`, `GetUserCountryBreakdown`).
   - Exposed `GET /api/v1/analytics/dashboard` endpoint returning combined aggregate metrics for authenticated users.

## Consequences

### Positive
- Rich feature set matching top enterprise URL shortening platforms.
- Interactive QR code generation and instant link preview.
- High-performance SQL aggregate dashboard queries with zero external dependency overhead.

### Negative
- Background ticker runs periodically on application startup.
