import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Link2, MousePointerClick, UserX, UserCheck, Search, Activity } from 'lucide-react';
import client from '../lib/client';
import { formatDate, formatNumber } from '../lib/utils';
import { toast } from 'sonner';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        client.get('/admin/stats'),
        client.get('/admin/users'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.items || []);
    } catch {
      toast.error('Failed to load admin management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleSuspend = async (user) => {
    const newStatus = !user.is_suspended;
    const actionName = newStatus ? 'suspend' : 'unsuspend';
    if (!confirm(`Are you sure you want to ${actionName} user "${user.email}"?`)) return;

    try {
      await client.put(`/admin/users/${user.id}/suspend`, { is_suspended: newStatus });
      toast.success(`User ${actionName}ed successfully!`);
      fetchAdminData();
    } catch {
      toast.error(`Failed to ${actionName} user`);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            Admin Control Center
          </h1>
          <p className="text-sm text-slate-400">Platform user management, account suspension, and global system stats.</p>
        </div>
      </div>

      {/* System Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered Users</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{formatNumber(stats?.total_users || 0)}</h3>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Short URLs</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{formatNumber(stats?.total_urls || 0)}</h3>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <MousePointerClick className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Platform Clicks</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{formatNumber(stats?.total_clicks || 0)}</h3>
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden space-y-4">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white">Registered Users</h3>
            <p className="text-xs text-slate-400">View user accounts and manage access permissions.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search user name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{u.full_name || 'User'}</div>
                      <div className="text-slate-400 text-[11px]">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          u.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          u.is_suspended
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {u.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{formatDate(u.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleSuspend(u)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                            u.is_suspended
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                          }`}
                        >
                          {u.is_suspended ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" /> Unsuspend
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5" /> Suspend
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
