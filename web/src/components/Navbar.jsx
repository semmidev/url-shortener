import React from 'react';
import { LogOut, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../features/auth/store';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-400">
          Welcome back, <span className="font-semibold text-slate-200">{user?.full_name || user?.email}</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          API Docs
        </a>

        {user?.role === 'admin' && (
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5" />
            Administrator
          </span>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </header>
  );
}
