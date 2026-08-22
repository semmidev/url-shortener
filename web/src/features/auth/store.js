import { create } from 'zustand';
import axios from 'axios';
import {
  getUser,
  getIsAuthenticated,
  setTokens,
  setUser,
  clearTokens,
} from '@/lib/tokenStorage';
import {
  loginRequest,
  registerRequest,
  logoutRequest,
  getCurrentUser,
  getGoogleAuthURL,
} from '@/features/auth/api';
import {
  updateProfile as updateProfileApi,
  changePassword as changePasswordApi,
  unlinkGoogleAccount as unlinkGoogleApi,
} from '@/features/account/api';

export const useAuthStore = create((set) => ({
  user: getUser(),
  isAuthenticated: getIsAuthenticated(),
  isLoading: true,     // used for initialize() — auth hydration
  isSubmitting: false, // used for login/register form submissions

  initialize: async () => {
    const isAuthenticated = getIsAuthenticated();
    if (!isAuthenticated) {
      set({ isAuthenticated: false, user: null, isLoading: false });
      return;
    }

    try {
      const res = await getCurrentUser();
      const userData = res.data?.data || res.data;
      setUser(userData);
      set({ user: userData, isAuthenticated: true, isLoading: false });
    } catch {
      // Fallback: If initial /auth/me call fails (e.g. Safari cookie timing), attempt refresh once
      try {
        const resRefresh = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        const refreshPayload = resRefresh.data?.data || resRefresh.data;
        if (refreshPayload?.access_token) {
          setTokens(refreshPayload.access_token, refreshPayload.refresh_token);
        }
        const res = await getCurrentUser();
        const userData = res.data?.data || res.data;
        setUser(userData);
        set({ user: userData, isAuthenticated: true, isLoading: false });
      } catch {
        clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  },

  login: async (email, password) => {
    set({ isSubmitting: true });
    try {
      const res = await loginRequest({ email, password });
      const payload = res.data?.data || res.data;
      const { user, access_token, refresh_token } = payload || {};
      setUser(user, access_token, refresh_token);
      set({ user, isAuthenticated: true, isSubmitting: false });
      await new Promise((r) => setTimeout(r, 50));
      return { success: true };
    } catch (err) {
      set({ isSubmitting: false });
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      const errors = err.response?.data?.errors || null;
      return { success: false, error: message, errors };
    }
  },

  register: async (data) => {
    set({ isSubmitting: true });
    try {
      const res = await registerRequest(data);
      const payload = res.data?.data || res.data;
      const { user, access_token, refresh_token } = payload || {};
      setUser(user, access_token, refresh_token);
      set({ user, isAuthenticated: true, isSubmitting: false });
      await new Promise((r) => setTimeout(r, 50));
      return { success: true };
    } catch (err) {
      set({ isSubmitting: false });
      const message = err.response?.data?.message || 'Registration failed.';
      const errors = err.response?.data?.errors || null;
      return { success: false, error: message, errors };
    }
  },

  logout: async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignore logout network errors
    } finally {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  updateProfile: async (fullName) => {
    try {
      const data = await updateProfileApi(fullName);
      const updatedUser = data?.data || data;
      setUser(updatedUser);
      set({ user: updatedUser });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile.';
      const errors = err.response?.data?.errors || null;
      return { success: false, message, errors };
    }
  },

  changePassword: async (newPassword) => {
    try {
      const data = await changePasswordApi(newPassword);
      const updatedUser = data?.data || data;
      setUser(updatedUser);
      set({ user: updatedUser });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to change password.';
      const errors = err.response?.data?.errors || null;
      return { success: false, message, errors };
    }
  },

  unlinkGoogle: async () => {
    try {
      const data = await unlinkGoogleApi();
      const updatedUser = data?.data || data;
      setUser(updatedUser);
      set({ user: updatedUser });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to unlink Google account.';
      return { success: false, message };
    }
  },

  getGoogleLinkURL: async () => {
    try {
      const res = await getGoogleAuthURL();
      const url = res.data?.url || res.data?.data?.url;
      return { success: true, url };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to get Google login URL.';
      return { success: false, message };
    }
  },
}));
