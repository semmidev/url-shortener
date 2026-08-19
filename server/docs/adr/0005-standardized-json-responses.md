# ADR-0005: Standardized JSON Response Envelope & Error Codes

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Inconsistent API response schemas make frontend integration and client SDK generation difficult. Clients need a predictable structure for both successful operations and error handling.

## Decision

All API endpoints must return standardized JSON envelopes via `platform/web`:

### Success Envelope (`web.Success` / `web.JSON`)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

### Error Envelope (`web.Error` / `apperr.Error`)
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "validasi gagal untuk data yang dikirimkan",
  "errors": {
    "full_name": "wajib diisi",
    "email": "harus berupa alamat email yang valid"
  }
}
```

### Standardized Error Codes
- `VALIDATION_ERROR`, `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `TOO_MANY_REQUESTS`, `INTERNAL_SERVER_ERROR`.

## Consequences

### Positive
- Uniform contract for all API responses across all domain modules.
- Simplifies client-side error parsing and user feedback handling.

### Negative
- Adds a lightweight top-level wrapper (`success`, `message`, `data`) around returned payloads.
