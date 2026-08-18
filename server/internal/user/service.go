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

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/crypto"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/token"
)

type Service struct {
	store        db.Store
	tokenMaker   *token.JWTMaker
	cfg          config.Config
	oneTimeCodes sync.Map
	httpClient   *http.Client
}

func NewService(store db.Store, tokenMaker *token.JWTMaker, cfg config.Config) *Service {
	s := &Service{
		store:      store,
		tokenMaker: tokenMaker,
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
	go s.cleanupExpiredOneTimeCodes()
	return s
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
	}
}

func toUserResponse(u db.User) UserResponse {
	var googleID *string
	if u.GoogleID.Valid {
		gid := u.GoogleID.String
		googleID = &gid
	}
	return UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		FullName:  u.FullName,
		AvatarURL: u.AvatarUrl,
		GoogleID:  googleID,
		Role:      u.Role,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
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
		return nil, apperr.MapDBError(err, "failed to register user", "email is already registered")
	}

	return loginResp, nil
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	user, err := s.store.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, apperr.MapDBError(err, "invalid email or password", "")
	}

	if !user.PasswordHash.Valid || user.PasswordHash.String == "" {
		return nil, apperr.Unauthorized("this account uses Google Login. Please sign in with Google")
	}

	if err := crypto.CheckPassword(req.Password, user.PasswordHash.String); err != nil {
		return nil, apperr.Unauthorized("invalid email or password")
	}

	return s.createSessionAndTokensWithQuerier(ctx, s.store, user, req.UserAgent, req.ClientIP)
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

	// Exchange code for Google Access Token
	data := url.Values{}
	data.Set("code", req.Code)
	data.Set("client_id", s.cfg.GoogleClientID)
	data.Set("client_secret", s.cfg.GoogleClientSecret)
	data.Set("redirect_uri", s.cfg.GoogleRedirectURI)
	data.Set("grant_type", "authorization_code")

	tokenReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://oauth2.googleapis.com/token", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, apperr.Internal("failed to create Google token request", err)
	}
	tokenReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	tokenResp, err := s.httpClient.Do(tokenReq)
	if err != nil {
		return nil, apperr.Internal("failed to contact Google token endpoint", err)
	}
	defer func() {
		_ = tokenResp.Body.Close()
	}()

	if tokenResp.StatusCode != http.StatusOK {
		return nil, apperr.Unauthorized("invalid or expired Google authorization code")
	}

	var gToken googleTokenResponse
	if err := json.NewDecoder(tokenResp.Body).Decode(&gToken); err != nil {
		return nil, apperr.Internal("failed to parse Google token response", err)
	}

	// Fetch User Info from Google
	userReq, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, apperr.Internal("failed to create Google userinfo request", err)
	}
	userReq.Header.Set("Authorization", "Bearer "+gToken.AccessToken)

	userResp, err := s.httpClient.Do(userReq)
	if err != nil {
		return nil, apperr.Internal("failed to fetch Google user profile", err)
	}
	defer func() {
		_ = userResp.Body.Close()
	}()

	if userResp.StatusCode != http.StatusOK {
		return nil, apperr.Unauthorized("failed to retrieve Google user profile")
	}

	var gUser googleUserInfo
	if err := json.NewDecoder(userResp.Body).Decode(&gUser); err != nil {
		return nil, apperr.Internal("failed to decode Google user profile", err)
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
	sessionID := uuid.New()

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
