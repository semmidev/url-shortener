import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../lib/client';
import { setTokens, setUser } from '../lib/tokenStorage';
import { useAuthStore } from '../features/auth/store';
import { toast } from 'sonner';

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const errParam = searchParams.get('error');

    if (errParam) {
      setError(errParam);
      toast.error(`Google authentication error: ${errParam}`);
      setTimeout(() => navigate('/login'), 2500);
      return;
    }

    if (!code) {
      setError('No authorization code provided');
      setTimeout(() => navigate('/login'), 2500);
      return;
    }

    const exchangeToken = async () => {
      try {
        const res = await client.post('/auth/google/token', { code });
        const data = res.data?.data || res.data;
        const user = data?.user || data;
        setTokens();
        if (user) setUser(user);
        useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
        toast.success('Successfully logged in with Google!');
        navigate('/dashboard');
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to exchange Google OAuth code';
        setError(msg);
        toast.error(msg);
        setTimeout(() => navigate('/login'), 2500);
      }
    };

    exchangeToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-center">
      <div className="glass-card p-8 rounded-2xl max-w-sm w-full space-y-4">
        {error ? (
          <>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              ❌
            </div>
            <h3 className="text-lg font-bold text-white">Authentication Failed</h3>
            <p className="text-xs text-slate-400">{error}</p>
            <p className="text-xs text-slate-500">Redirecting back to login...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-white">Authenticating...</h3>
            <p className="text-xs text-slate-400">Verifying Google single sign-on credentials.</p>
          </>
        )}
      </div>
    </div>
  );
}
