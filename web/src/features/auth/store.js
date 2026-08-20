import { create } from 'zustand';
import client from '@/lib/client';
import {
  getUser,
  getIsAuthenticated,
  setTokens,
  setUser,
  clearTokens,
} from '@/lib/tokenStorage';

export const useAuthStore = create((set) => ({
  user: getUser(),
  isAuthenticated: getIsAuthenticated(),
  isLoading: true,   // only used for initialize() — auth hydration
  isSubmitting: false, // used for login/register form submissions

  initialize: async () => {
    const isAuthenticated = getIsAuthenticated();
    if (!isAuthenticated) {
      set({ isAuthenticated: false, user: null, isLoading: false });
      return;
    }

    try {
      const res = await client.get('/auth/me');
      const userData = res.data?.data || res.data;
      setUser(userData);
      set({ user: userData, isAuthenticated: true, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isSubmitting: true });
    try {
      const res = await client.post('/auth/login', { email, password });
      const payload = res.data?.data || res.data;
      const { user } = payload;
      setTokens();
      setUser(user);
      set({ user, isAuthenticated: true, isSubmitting: false });
      return { success: true };
    } catch (err) {
      set({ isSubmitting: false });
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      const errors = err.response?.data?.errors || null;
      return { success: false, error: message, errors };
    }
  },

  register: async (email, password, fullName) => {
    set({ isSubmitting: true });
    try {
      const res = await client.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      const payload = res.data?.data || res.data;
      const { user } = payload;
      setTokens();
      setUser(user);
      set({ user, isAuthenticated: true, isSubmitting: false });
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
      await client.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  updateProfile: async (fullName) => {
    try {
      const res = await client.put('/auth/profile', { full_name: fullName });
      const updatedUser = res.data?.data || res.data;
      setUser(updatedUser);
      set({ user: updatedUser });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile.';
      const errors = err.response?.data?.errors || null;
      return { success: false, message, errors };
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const res = await client.put('/auth/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      const updatedUser = res.data?.data || res.data;
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
      const res = await client.delete('/auth/google');
      const updatedUser = res.data?.data || res.data;
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
      const res = await client.get('/auth/google/url');
      const url = res.data?.url || res.data?.data?.url;
      return { success: true, url };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to get Google login URL.';
      return { success: false, message };
    }
  },
}));
