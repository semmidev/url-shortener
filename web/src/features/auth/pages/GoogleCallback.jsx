import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { setTokens, setUser as persistUser } from '@/lib/tokenStorage';
import client from '@/lib/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setStatus('error');
      setMessage(decodeURIComponent(error));
      return;
    }

    const code = searchParams.get('code');
    if (!code) {
      setStatus('error');
      setMessage('Authentication code not found.');
      return;
    }

    client.post('/auth/google/token', { code })
      .then((res) => {
        const data = res.data?.data || res.data;
        if (data && (data.access_token || data.user)) {
          const { user } = data;

          setTokens();
          if (user) {
            persistUser(user);
            useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
            navigate('/dashboard', { replace: true });
          } else {
            // Fallback: fetch /auth/me
            client.get('/auth/me')
              .then((meRes) => {
                const meUser = meRes.data?.data || meRes.data;
                if (meUser) {
                  persistUser(meUser);
                  useAuthStore.setState({ user: meUser, isAuthenticated: true, isLoading: false });
                  navigate('/dashboard', { replace: true });
                } else {
                  setStatus('error');
                  setMessage('Failed to load user data.');
                }
              })
              .catch(() => {
                setStatus('error');
                setMessage('Failed to verify session. Please try again.');
              });
          }
        } else {
          setStatus('error');
          setMessage('Incomplete authentication parameters.');
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Google authentication failed. Please try again.');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === 'loading' && (
          <>
            <Loader2 className="size-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground font-medium">Processing Google authentication…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="size-10 text-destructive mx-auto" />
            <p className="text-sm text-destructive font-medium">{message}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="text-sm text-primary hover:underline font-semibold cursor-pointer"
            >
              Back to Login
            </button>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
            <p className="text-sm text-muted-foreground font-medium">Signed in! Redirecting…</p>
          </>
        )}
      </div>
    </div>
  );
}
