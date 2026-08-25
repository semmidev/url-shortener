package user

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Mount(r chi.Router, authMw func(http.Handler) http.Handler) {
	r.Post("/register", h.register)
	r.Post("/login", h.login)
	r.Post("/refresh", h.refresh)

	// Google OAuth endpoints
	r.Get("/google/url", h.googleURL)
	r.Get("/google/callback", h.googleCallback)
	r.Post("/google/token", h.googleExchangeToken)

	r.Group(func(r chi.Router) {
		r.Use(authMw)
		r.Get("/me", h.me)
		r.Put("/profile", h.updateProfile)
		r.Put("/password", h.changePassword)
		r.Delete("/google", h.unlinkGoogle)
		r.Post("/logout", h.logout)
	})
}

// register handles user registration
// @Summary Register new user account
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration credentials"
// @Success 201 {object} LoginResponse
// @Failure 400 {object} apperr.Error
// @Failure 409 {object} apperr.Error
// @Router /api/v1/auth/register [post]
func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}
	req.UserAgent = r.UserAgent()
	req.ClientIP = web.GetClientIP(r)

	resp, err := h.svc.Register(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	h.setAuthCookies(w, r, resp)
	web.JSON(w, http.StatusCreated, resp)
}

// login handles user authentication
// @Summary User login
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} LoginResponse
// @Failure 400 {object} apperr.Error
// @Failure 401 {object} apperr.Error
// @Router /api/v1/auth/login [post]
func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}
	req.UserAgent = r.UserAgent()
	req.ClientIP = web.GetClientIP(r)

	resp, err := h.svc.Login(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	h.setAuthCookies(w, r, resp)
	web.JSON(w, http.StatusOK, resp)
}

// refresh handles access token renewal
// @Summary Refresh access token
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body RefreshTokenRequest true "Refresh token payload"
// @Success 200 {object} RefreshTokenResponse
// @Failure 401 {object} apperr.Error
// @Router /api/v1/auth/refresh [post]
func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshTokenRequest
	// Try to get refresh token from cookie first
	if cookie, err := r.Cookie("refresh_token"); err == nil && cookie.Value != "" {
		req.RefreshToken = cookie.Value
	}

	// Fallback to body decoding if cookie is not present
	if req.RefreshToken == "" {
		if err := web.Decode(r, &req); err != nil {
			web.Error(w, r, err)
			return
		}
	}

	resp, err := h.svc.RefreshToken(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	// #nosec G124 -- Cookie secure flag is dynamically evaluated based on HTTP vs HTTPS connection
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    resp.AccessToken,
		Path:     "/",
		Expires:  resp.AccessTokenExpiresAt,
		HttpOnly: true,
		Secure:   isSecureRequest(r),
		SameSite: http.SameSiteLaxMode,
	})

	web.JSON(w, http.StatusOK, resp)
}

// googleURL generates Google OAuth consent URL
// @Summary Get Google OAuth login URL
// @Tags Auth
// @Produce json
// @Success 200 {object} GoogleAuthURLResponse
// @Router /api/v1/auth/google/url [get]
func (h *Handler) googleURL(w http.ResponseWriter, r *http.Request) {
	resp, err := h.svc.GetGoogleLoginURL(r.Context(), GetGoogleLoginURLRequest{})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, resp)
}

// googleCallback handles Google OAuth redirect callback
// @Summary Google OAuth callback handler
// @Tags Auth
// @Param code query string true "Google Authorization Code"
// @Success 307 "Redirects to frontend app with one-time code"
// @Router /api/v1/auth/google/callback [get]
func (h *Handler) googleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	appURL := h.svc.cfg.AppBaseURL

	if code == "" {
		redirectURL := fmt.Sprintf("%s/auth/google/callback?error=%s", appURL, url.QueryEscape("Missing authorization code"))
		http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
		return
	}

	req := HandleGoogleCallbackRequest{
		Code:      code,
		UserAgent: r.UserAgent(),
		ClientIP:  web.GetClientIP(r),
	}

	resp, err := h.svc.HandleGoogleCallback(r.Context(), req)
	if err != nil {
		redirectURL := fmt.Sprintf("%s/auth/google/callback?error=%s", appURL, url.QueryEscape(err.Error()))
		http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
		return
	}

	oneTimeCode := h.svc.GenerateOneTimeCode(resp)
	redirectURL := fmt.Sprintf("%s/auth/google/callback?code=%s", appURL, url.QueryEscape(oneTimeCode))
	http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
}

// googleExchangeToken exchanges one-time code for JWT tokens
// @Summary Exchange Google one-time code for tokens
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body GoogleExchangeTokenRequest true "One-time code"
// @Success 200 {object} LoginResponse
// @Failure 401 {object} apperr.Error
// @Router /api/v1/auth/google/token [post]
func (h *Handler) googleExchangeToken(w http.ResponseWriter, r *http.Request) {
	var req GoogleExchangeTokenRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	resp, err := h.svc.ExchangeOneTimeCode(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	h.setAuthCookies(w, r, resp)
	web.JSON(w, http.StatusOK, resp)
}

// me gets profile of logged in user
// @Summary Get current user profile
// @Tags Auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} UserResponse
// @Failure 401 {object} apperr.Error
// @Router /api/v1/auth/me [get]
func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	resp, err := h.svc.GetProfile(r.Context(), GetProfileRequest{UserID: userID})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, resp)
}

// logout revokes the current user session
// @Summary Logout and revoke session
// @Tags Auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 401 {object} apperr.Error
// @Router /api/v1/auth/logout [post]
func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}
	sessionID, ok := web.SessionID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	if err := h.svc.Logout(r.Context(), LogoutRequest{UserID: userID, SessionID: sessionID}); err != nil {
		web.Error(w, r, err)
		return
	}

	h.clearAuthCookies(w, r)
	web.JSON(w, http.StatusOK, map[string]string{"message": "logged out successfully"})
}

func isSecureRequest(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	if proto := r.Header.Get("X-Forwarded-Proto"); strings.EqualFold(proto, "https") {
		return true
	}
	return false
}

func (h *Handler) setAuthCookies(w http.ResponseWriter, r *http.Request, resp *LoginResponse) {
	isSecure := isSecureRequest(r)

	// #nosec G124 -- Cookie secure flag is dynamically evaluated based on HTTP vs HTTPS connection
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    resp.AccessToken,
		Path:     "/",
		Expires:  resp.AccessTokenExpiresAt,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})

	// #nosec G124 -- Cookie secure flag is dynamically evaluated based on HTTP vs HTTPS connection
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    resp.RefreshToken,
		Path:     "/",
		Expires:  resp.RefreshTokenExpiresAt,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *Handler) clearAuthCookies(w http.ResponseWriter, r *http.Request) {
	isSecure := isSecureRequest(r)

	// #nosec G124 -- Cookie secure flag is dynamically evaluated based on HTTP vs HTTPS connection
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})

	// #nosec G124 -- Cookie secure flag is dynamically evaluated based on HTTP vs HTTPS connection
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})

	// #nosec G124 -- Cookie secure flag is dynamically evaluated based on HTTP vs HTTPS connection
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *Handler) updateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	var req UpdateProfileRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}
	req.UserID = userID

	resp, err := h.svc.UpdateProfile(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, resp)
}

func (h *Handler) changePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	var req ChangePasswordRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}
	req.UserID = userID

	resp, err := h.svc.ChangePassword(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, resp)
}

func (h *Handler) unlinkGoogle(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	resp, err := h.svc.UnlinkGoogle(r.Context(), UnlinkGoogleRequest{UserID: userID})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, resp)
}
