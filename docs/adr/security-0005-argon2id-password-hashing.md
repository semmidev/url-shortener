# ADR security-0005: Argon2id Password Hashing Migration

* Status: `Accepted`
* Date: 2026-09-11

## Context

Password security is a fundamental component of account authentication. Previously, the platform relied on `bcrypt` (`golang.org/x/crypto/bcrypt`) with default cost factors for password hashing.

While `bcrypt` remains secure, modern OWASP Password Storage Guidelines (2025/2026) and RFC 9106 recommend **Argon2id** as the state-of-the-art primary password hashing algorithm. Argon2id provides superior resistance against both memory-hard side-channel attacks and specialized GPU/ASIC hardware cracking attempts.

We required a modern, highly mature, and standardized password hashing implementation in Go with explicitly tuned cryptographic parameters.

## Decision

We replaced `bcrypt` with **Argon2id** across `server/internal/platform/crypto` and `server/cmd/seed` using Go's official `golang.org/x/crypto/argon2` library.

1. **Standard Library Subrepository**:
   - Adopted `golang.org/x/crypto/argon2`, the most mature and battle-tested Go package maintained directly by the Go core cryptography team.
2. **Cryptographic Parameters**:
   - **Variant**: `argon2.IDKey` (Argon2id).
   - **Memory**: `19456` KiB (19 MiB).
   - **Iterations (Time Cost)**: `2`.
   - **Parallelism (Threads)**: `1`.
   - **Salt Length**: `16` bytes (randomly generated via `crypto/rand`).
   - **Key Length (Hash Output)**: `32` bytes.
3. **PHC String Format Encoding**:
   - Encodes output using standard Password Hashing Competition (PHC) string formatting:
     `$argon2id$v=19$m=19456,t=2,p=1$<base64-salt>$<base64-hash>`
   - Enables standard parser compatibility and transparent parameter inspection.
4. **Side-Channel & Timing Attack Protection**:
   - Hash comparison in `CheckPassword` uses `crypto/subtle.ConstantTimeCompare` to guarantee execution time independence from byte matching.

## Consequences

- Significantly strengthened resistance against offline GPU/ASIC password cracking attempts.
- Adheres to OWASP and RFC 9106 security recommendations.
- Standardized PHC string format ensures transparent parameter extraction and future parameter upgrade compatibility.
- Comprehensive unit and benchmark tests guarantee sub-50ms hash calculation times while preserving strict memory hardness.
