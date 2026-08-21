# ADR security-0003: OAuth Account Linking & Password Governance

* Status: `Accepted`
* Date: 2026-08-21

## Context

The URL Shortener platform supports both traditional Email/Password authentication and Google OAuth 2.0 social login. Users frequently require the ability to link or unlink their Google account from an existing password-based account, or set up a password after registering strictly through Google OAuth.

Without strict password governance and validation checks, allowing users to unlink an OAuth provider when no password is set could result in permanent account lockout (orphaned accounts). Additionally, changing passwords without proper password validation could lead to security risks.

## Decision

We implemented a secure **OAuth Account Linking & Password Governance** model in `server/internal/user/service.go` and `web/src/features/account`:

1. **Password Existence Enforcement before Unlinking**:
   - `UnlinkGoogleAccount`: Checks `user.PasswordHash`. If the account has no password hash set (i.e. user signed up strictly via Google OAuth), unlinking is rejected with an HTTP 400 Bad Request error (`apperr.ErrPasswordRequiredToUnlink`). The user must create a password first before unlinking Google OAuth.
2. **Dynamic Account Security State & UI Guidance**:
   - User response DTO exposes `has_password: bool` and `is_google_linked: bool` to the client.
   - Profile settings UI intelligently renders "Create Password" vs "Change Password" buttons and disables "Unlink Google Account" action with an informative warning modal when no password exists.
3. **Seamless Account Linking**:
   - `LinkGoogleAccount`: Allows logged-in users to link their Google account by authorizing via OAuth. Matches Google `sub` and `email` to ensure email ownership before persisting `google_id`.
4. **Audit Logging Integration**:
   - Emits structured security audit logs (`security-0002`) for `account.google_linked`, `account.google_unlinked`, and `account.password_changed` operations.

## Consequences

- Completely eliminates the risk of account lockouts / orphaned user accounts caused by unlinking Google OAuth without a alternative credential.
- Seamless authentication flexibility allowing users to switch between OAuth and email/password sign-in.
- Clear user feedback and complete security audit trail for all credential updates.
