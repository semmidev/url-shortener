package user

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/breaker"
	"github.com/semmidev/url-shortener/server/internal/platform/cache"
	"github.com/semmidev/url-shortener/server/internal/platform/crypto"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/retry"
	"github.com/semmidev/url-shortener/server/internal/platform/token"
)

// emailAttemptEntry tracks failed login attempts for a specific email.
type emailAttemptEntry struct {
	count     int
	firstSeen time.Time
}

const (
	maxEmailLoginAttempts = 10               // max failed attempts before lockout
	emailLockoutWindow    = 15 * time.Minute // lockout window duration
)

type MetricsRecorder interface {
	RecordAuthAttempt(action, status string)
}

type Service struct {
	store         db.Store
	tokenMaker    *token.JWTMaker
	cfg           config.Config
	appLogger     *logger.Logger
	cache         cache.Cache
	metrics       MetricsRecorder
	googleBreaker *breaker.CircuitBreaker
	oneTimeCodes  sync.Map // fallback in-memory store
	emailAttempts sync.Map // fallback in-memory store
	httpClient    *http.Client
}

func NewService(store db.Store, tokenMaker *token.JWTMaker, cfg config.Config, appLogger *logger.Logger, c cache.Cache) *Service {
	s := &Service{
		store:         store,
		tokenMaker:    tokenMaker,
		cfg:           cfg,
		appLogger:     appLogger,
		cache:         c,
		googleBreaker: breaker.NewCircuitBreaker("GoogleOAuth", 30*time.Second),
		httpClient:    &http.Client{Timeout: 10 * time.Second},
	}
	go s.cleanupExpiredOneTimeCodes()
	return s
}

func (s *Service) SetMetricsRecorder(m MetricsRecorder) {
	if s != nil {
		s.metrics = m
	}
}

func (s *Service) cleanupExpiredOneTimeCodes() {
	ticker := time.NewTicker(2 * time.Minute)
	for range ticker.C {
		now := time.Now()
		s.oneTimeCodes.Range(func(key, value any) bool {
			if entry, ok := value.(oneTimeCodeEntry); ok {
				if now.After(entry.expiresAt) {
					s.oneTimeCodes.Delete(key)
				}
			}
			return true
		})
		// Also clean up stale email attempt entries outside the lockout window
		s.emailAttempts.Range(func(key, value any) bool {
			if entry, ok := value.(emailAttemptEntry); ok {
				if now.After(entry.firstSeen.Add(emailLockoutWindow)) {
					s.emailAttempts.Delete(key)
				}
			}
			return true
		})
	}
}

// isEmailLocked checks if the email is currently locked out due to excessive failed login attempts.
func (s *Service) isEmailLocked(ctx context.Context, email string) bool {
	if s.cache != nil {
		var count int64
		key := fmt.Sprintf("auth:failed:%s", email)
		if err := s.cache.Get(ctx, key, &count); err == nil && count >= maxEmailLoginAttempts {
			return true
		}
	}

	if val, loaded := s.emailAttempts.Load(email); loaded {
		if entry, ok := val.(emailAttemptEntry); ok {
			return entry.count >= maxEmailLoginAttempts && time.Now().Before(entry.firstSeen.Add(emailLockoutWindow))
		}
	}
	return false
}

// recordFailedLogin increments the per-email failed attempt counter.
// Returns true if the account should be locked out.
func (s *Service) recordFailedLogin(ctx context.Context, email string) bool {
	if s.cache != nil {
		key := fmt.Sprintf("auth:failed:%s", email)
		count, err := s.cache.Incr(ctx, key, emailLockoutWindow)
		if err == nil {
			return count >= maxEmailLoginAttempts
		}
	}

	now := time.Now()
	val, _ := s.emailAttempts.LoadOrStore(email, emailAttemptEntry{count: 0, firstSeen: now})
	entry, ok := val.(emailAttemptEntry)
	if !ok {
		entry = emailAttemptEntry{count: 0, firstSeen: now}
	}

	// Reset window if expired
	if now.After(entry.firstSeen.Add(emailLockoutWindow)) {
		entry = emailAttemptEntry{count: 0, firstSeen: now}
	}
	entry.count++
	s.emailAttempts.Store(email, entry)
	return entry.count >= maxEmailLoginAttempts
}

// resetEmailAttempts clears the failed attempt counter for an email on successful login.
func (s *Service) resetEmailAttempts(ctx context.Context, email string) {
	if s.cache != nil {
		_ = s.cache.Delete(ctx, fmt.Sprintf("auth:failed:%s", email))
	}
	s.emailAttempts.Delete(email)
}

func toUserResponse(u db.User) UserResponse {
	var googleID *string
	if u.GoogleID.Valid {
		gid := u.GoogleID.String
		googleID = &gid
	}
	hasPassword := u.PasswordHash.Valid && u.PasswordHash.String != ""
	return UserResponse{
		ID:          u.ID,
		Email:       u.Email,
		FullName:    u.FullName,
		AvatarURL:   u.AvatarUrl,
		GoogleID:    googleID,
		HasPassword: hasPassword,
		Role:        u.Role,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}
}

func (s *Service) Register(ctx context.Context, req RegisterRequest) (*LoginResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Check if user already exists
	_, err := s.store.GetUserByEmail(ctx, req.Email)
	if err == nil {
		return nil, apperr.Conflict("email is already registered")
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, apperr.MapDBError(err, "", "")
	}

	hashedPassword, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, apperr.Internal("failed to process password", err)
	}

	var user db.User
	var loginResp *LoginResponse

	// Execute user creation and session creation atomically in a database transaction
	err = s.store.ExecTx(ctx, func(q *db.Queries) error {
		var txErr error
		user, txErr = q.CreateUser(ctx, db.CreateUserParams{
			Email:        req.Email,
			PasswordHash: pgtype.Text{String: hashedPassword, Valid: true},
			FullName:     req.FullName,
			Role:         string(RoleUser),
		})
		if txErr != nil {
			return txErr
		}

		loginResp, txErr = s.createSessionAndTokensWithQuerier(ctx, q, user, req.UserAgent, req.ClientIP)
		return txErr
	})
	if err != nil {
		if s.metrics != nil {
			s.metrics.RecordAuthAttempt("register", "failure")
		}
		return nil, apperr.MapDBError(err, "failed to register user", "email is already registered")
	}

	if s.metrics != nil {
		s.metrics.RecordAuthAttempt("register", "success")
	}

	s.appLogger.Audit(ctx, logger.AuditActionUserRegister,
		"user.id", user.ID.String(),
		"user.email", user.Email,
	)
	return loginResp, nil
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Per-email brute-force protection: check if email is locked out
	if s.isEmailLocked(ctx, req.Email) {
		if s.metrics != nil {
			s.metrics.RecordAuthAttempt("login", "failure")
		}
		s.appLogger.Audit(ctx, logger.AuditActionUserLoginFailed,
			"user.email", req.Email,
			"reason", "account_locked_out",
		)
		return nil, apperr.Unauthorized("too many failed login attempts, please try again later")
	}

	user, err := s.store.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if s.metrics != nil {
			s.metrics.RecordAuthAttempt("login", "failure")
		}
		s.recordFailedLogin(ctx, req.Email)
		s.appLogger.Audit(ctx, logger.AuditActionUserLoginFailed, "user.email", req.Email, "reason", "user_not_found")
		return nil, apperr.MapDBError(err, "invalid email or password", "")
	}

	if user.IsSuspended {
		if s.metrics != nil {
			s.metrics.RecordAuthAttempt("login", "failure")
		}
		s.appLogger.Audit(ctx, logger.AuditActionUserLoginFailed, "user.id", user.ID.String(), "reason", "account_suspended")
		return nil, apperr.Forbidden("akun Anda ditangguhkan (suspended), silakan hubungi dukungan")
	}

	if !user.PasswordHash.Valid || user.PasswordHash.String == "" {
		if s.metrics != nil {
			s.metrics.RecordAuthAttempt("login", "failure")
		}
		return nil, apperr.Unauthorized("this account uses Google Login. Please sign in with Google")
	}

	if err := crypto.CheckPassword(req.Password, user.PasswordHash.String); err != nil {
		if s.metrics != nil {
			s.metrics.RecordAuthAttempt("login", "failure")
		}
		locked := s.recordFailedLogin(ctx, req.Email)
		reason := "wrong_password"
		if locked {
			reason = "account_now_locked"
		}
		s.appLogger.Audit(ctx, logger.AuditActionUserLoginFailed,
			"user.id", user.ID.String(),
			"user.email", req.Email,
			"reason", reason,
		)
		return nil, apperr.Unauthorized("invalid email or password")
	}

	s.resetEmailAttempts(ctx, req.Email)
	resp, err := s.createSessionAndTokensWithQuerier(ctx, s.store, user, req.UserAgent, req.ClientIP)
	if err != nil {
		if s.metrics != nil {
			s.metrics.RecordAuthAttempt("login", "failure")
		}
		return nil, err
	}

	if s.metrics != nil {
		s.metrics.RecordAuthAttempt("login", "success")
	}
	s.appLogger.Audit(ctx, logger.AuditActionUserLogin,
		"user.id", user.ID.String(),
		"user.email", user.Email,
	)
	return resp, nil
}

// GetGoogleLoginURL returns the Google OAuth authorization URL.
func (s *Service) GetGoogleLoginURL(ctx context.Context, req GetGoogleLoginURLRequest) (*GoogleAuthURLResponse, error) {
	if s.cfg.GoogleClientID == "" {
		return nil, apperr.Internal("Google OAuth client ID is not configured", nil)
	}

	u := fmt.Sprintf(
		"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=email%%20profile&access_type=offline&prompt=consent",
		url.QueryEscape(s.cfg.GoogleClientID),
		url.QueryEscape(s.cfg.GoogleRedirectURI),
	)

	return &GoogleAuthURLResponse{URL: u}, nil
}

// HandleGoogleCallback exchanges authorization code for user profile, upserts user, and returns tokens atomically.
func (s *Service) HandleGoogleCallback(ctx context.Context, req HandleGoogleCallbackRequest) (*LoginResponse, error) {
	if s.cfg.GoogleClientID == "" || s.cfg.GoogleClientSecret == "" {
		return nil, apperr.Internal("Google OAuth is not configured properly", nil)
	}

	var gToken googleTokenResponse
	var gUser googleUserInfo

	// 1. Exchange code for Google Access Token with Retry & Circuit Breaker protection
	_, err := s.googleBreaker.Execute(func() (interface{}, error) {
		return nil, retry.Do(ctx, retry.DefaultConfig(), func() error {
			data := url.Values{}
			data.Set("code", req.Code)
			data.Set("client_id", s.cfg.GoogleClientID)
			data.Set("client_secret", s.cfg.GoogleClientSecret)
			data.Set("redirect_uri", s.cfg.GoogleRedirectURI)
			data.Set("grant_type", "authorization_code")

			tokenReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://oauth2.googleapis.com/token", strings.NewReader(data.Encode()))
			if err != nil {
				return err
			}
			tokenReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

			tokenResp, err := s.httpClient.Do(tokenReq)
			if err != nil {
				return err
			}
			defer func() {
				_ = tokenResp.Body.Close()
			}()

			if tokenResp.StatusCode != http.StatusOK {
				return apperr.Unauthorized("invalid or expired Google authorization code")
			}

			return json.NewDecoder(tokenResp.Body).Decode(&gToken)
		})
	})
	if err != nil {
		var appErr *apperr.Error
		if errors.As(err, &appErr) {
			return nil, appErr
		}
		return nil, apperr.Internal("failed to contact Google token endpoint", err)
	}

	// 2. Fetch User Info from Google with Retry & Circuit Breaker protection
	_, err = s.googleBreaker.Execute(func() (interface{}, error) {
		return nil, retry.Do(ctx, retry.DefaultConfig(), func() error {
			userReq, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
			if err != nil {
				return err
			}
			userReq.Header.Set("Authorization", "Bearer "+gToken.AccessToken)

			userResp, err := s.httpClient.Do(userReq)
			if err != nil {
				return err
			}
			defer func() {
				_ = userResp.Body.Close()
			}()

			if userResp.StatusCode != http.StatusOK {
				return apperr.Unauthorized("failed to retrieve Google user profile")
			}

			return json.NewDecoder(userResp.Body).Decode(&gUser)
		})
	})
	if err != nil {
		var appErr *apperr.Error
		if errors.As(err, &appErr) {
			return nil, appErr
		}
		return nil, apperr.Internal("failed to fetch Google user profile", err)
	}

	logger.Enrich(ctx, "google.id", gUser.ID)
	logger.Enrich(ctx, "google.email", gUser.Email)

	var user db.User
	var loginResp *LoginResponse

	// Upsert user & create session atomically in a transaction
	err = s.store.ExecTx(ctx, func(q *db.Queries) error {
		var txErr error
		user, txErr = q.UpsertGoogleUser(ctx, db.UpsertGoogleUserParams{
			Email:     gUser.Email,
			GoogleID:  pgtype.Text{String: gUser.ID, Valid: true},
			AvatarUrl: gUser.Picture,
			FullName:  gUser.Name,
			Role:      string(RoleUser),
		})
		if txErr != nil {
			return txErr
		}

		loginResp, txErr = s.createSessionAndTokensWithQuerier(ctx, q, user, req.UserAgent, req.ClientIP)
		return txErr
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to save Google user session", "")
	}

	return loginResp, nil
}

// GenerateOneTimeCode creates a 5-minute single-use code for Google auth code exchange.
func (s *Service) GenerateOneTimeCode(loginResp *LoginResponse) string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	code := hex.EncodeToString(b)

	if s.cache != nil {
		ctx := context.Background()
		key := fmt.Sprintf("oauth:code:%s", code)
		if err := s.cache.Set(ctx, key, loginResp, 5*time.Minute); err == nil {
			return code
		}
	}

	s.oneTimeCodes.Store(code, oneTimeCodeEntry{
		loginResp: loginResp,
		expiresAt: time.Now().Add(5 * time.Minute),
	})
	return code
}

// ExchangeOneTimeCode consumes a single-use code and returns the associated LoginResponse.
func (s *Service) ExchangeOneTimeCode(ctx context.Context, req GoogleExchangeTokenRequest) (*LoginResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	if s.cache != nil {
		key := fmt.Sprintf("oauth:code:%s", req.Code)
		var resp LoginResponse
		if err := s.cache.Get(ctx, key, &resp); err == nil {
			_ = s.cache.Delete(ctx, key)
			return &resp, nil
		}
	}

	val, ok := s.oneTimeCodes.LoadAndDelete(req.Code)
	if !ok {
		return nil, apperr.Unauthorized("invalid or expired one-time code")
	}

	entry, ok := val.(oneTimeCodeEntry)
	if !ok {
		return nil, apperr.Unauthorized("invalid one-time code entry")
	}
	if time.Now().After(entry.expiresAt) {
		return nil, apperr.Unauthorized("one-time code has expired")
	}

	return entry.loginResp, nil
}

func (s *Service) createSessionAndTokensWithQuerier(ctx context.Context, q db.Querier, user db.User, userAgent, clientIP string) (*LoginResponse, error) {
	sessionID := uuid.NewV7()

	refreshTokenStr, refreshPayload, err := s.tokenMaker.CreateToken(
		user.ID,
		user.Role,
		sessionID,
		s.cfg.RefreshTokenDuration,
	)
	if err != nil {
		return nil, apperr.Internal("failed to create refresh token", err)
	}

	_, err = q.CreateSession(ctx, db.CreateSessionParams{
		ID:           sessionID,
		UserID:       user.ID,
		RefreshToken: refreshTokenStr,
		UserAgent:    userAgent,
		ClientIp:     clientIP,
		IsBlocked:    false,
		ExpiresAt:    refreshPayload.ExpiredAt,
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to create session", "")
	}

	accessTokenStr, accessPayload, err := s.tokenMaker.CreateToken(
		user.ID,
		user.Role,
		sessionID,
		s.cfg.AccessTokenDuration,
	)
	if err != nil {
		return nil, apperr.Internal("failed to create access token", err)
	}

	return &LoginResponse{
		AccessToken:           accessTokenStr,
		AccessTokenExpiresAt:  accessPayload.ExpiredAt,
		RefreshToken:          refreshTokenStr,
		RefreshTokenExpiresAt: refreshPayload.ExpiredAt,
		User:                  toUserResponse(user),
	}, nil
}

func (s *Service) RefreshToken(ctx context.Context, req RefreshTokenRequest) (*RefreshTokenResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	refreshPayload, err := s.tokenMaker.VerifyToken(req.RefreshToken)
	if err != nil {
		return nil, apperr.Unauthorized("invalid or expired refresh token")
	}

	session, err := s.store.GetSession(ctx, refreshPayload.SessionID)
	if err != nil {
		return nil, apperr.MapDBError(err, "session not found", "")
	}

	if session.IsBlocked {
		return nil, apperr.Unauthorized("session is blocked")
	}

	if session.RefreshToken != req.RefreshToken {
		return nil, apperr.Unauthorized("mismatched session token")
	}

	if time.Now().After(session.ExpiresAt) {
		return nil, apperr.Unauthorized("session has expired")
	}

	accessTokenStr, accessPayload, err := s.tokenMaker.CreateToken(
		session.UserID,
		refreshPayload.Role,
		session.ID,
		s.cfg.AccessTokenDuration,
	)
	if err != nil {
		return nil, apperr.Internal("failed to create access token", err)
	}

	return &RefreshTokenResponse{
		AccessToken:          accessTokenStr,
		AccessTokenExpiresAt: accessPayload.ExpiredAt,
	}, nil
}

func (s *Service) GetProfile(ctx context.Context, req GetProfileRequest) (*UserResponse, error) {
	user, err := s.store.GetUserByID(ctx, req.UserID)
	if err != nil {
		return nil, apperr.MapDBError(err, fmt.Sprintf("user profile not found with ID: %s", req.UserID), "")
	}

	res := toUserResponse(user)
	return &res, nil
}

// Logout revokes the active session associated with the user's session ID.
func (s *Service) Logout(ctx context.Context, req LogoutRequest) error {
	if err := s.store.RevokeSession(ctx, req.SessionID); err != nil {
		return apperr.MapDBError(err, "session not found", "")
	}
	s.appLogger.Audit(ctx, logger.AuditActionUserLogout,
		"user.id", req.UserID.String(),
		"session.id", req.SessionID.String(),
	)
	return nil
}

func (s *Service) UpdateProfile(ctx context.Context, req UpdateProfileRequest) (*UserResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	updated, err := s.store.UpdateUser(ctx, db.UpdateUserParams{
		ID:       req.UserID,
		FullName: pgtype.Text{String: req.FullName, Valid: true},
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to update user profile", "")
	}

	res := toUserResponse(updated)
	return &res, nil
}

func (s *Service) ChangePassword(ctx context.Context, req ChangePasswordRequest) (*UserResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	newHash, err := crypto.HashPassword(req.NewPassword)
	if err != nil {
		return nil, apperr.Internal("failed to process password", err)
	}

	updated, err := s.store.UpdateUser(ctx, db.UpdateUserParams{
		ID:           req.UserID,
		PasswordHash: pgtype.Text{String: newHash, Valid: true},
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to update password", "")
	}

	res := toUserResponse(updated)
	return &res, nil
}

func (s *Service) UnlinkGoogle(ctx context.Context, req UnlinkGoogleRequest) (*UserResponse, error) {
	user, err := s.store.GetUserByID(ctx, req.UserID)
	if err != nil {
		return nil, apperr.MapDBError(err, "user not found", "")
	}

	if !user.PasswordHash.Valid || user.PasswordHash.String == "" {
		return nil, apperr.Invalid("Anda harus membuat password terlebih dahulu sebelum memutuskan koneksi Google agar tetap bisa login.")
	}

	updated, err := s.store.UnlinkGoogleUser(ctx, req.UserID)
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to unlink Google account", "")
	}

	res := toUserResponse(updated)
	return &res, nil
}
