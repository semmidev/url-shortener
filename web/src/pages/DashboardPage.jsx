import React, { useState, useEffect } from 'react';
import {
  Link2,
  MousePointerClick,
  Activity,
  Plus,
  Sparkles,
  Copy,
  Check,
  QrCode,
  Eye,
  Trash2,
  ExternalLink,
  Search,
} from 'lucide-react';
import client from '../lib/client';
import { formatDate, formatNumber } from '../lib/utils';
import { toast } from 'sonner';
import CreateURLModal from '../components/CreateURLModal';
import QRCodeModal from '../components/QRCodeModal';
import PreviewModal from '../components/PreviewModal';
import { NavLink } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalUrls: 0, totalClicks: 0, activeUrls: 0 });
  const [recentUrls, setRecentUrls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick shorten form
  const [quickUrl, setQuickUrl] = useState('');
  const [shortening, setShortening] = useState(false);
  const [createdUrl, setCreatedUrl] = useState(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrModal, setQrModal] = useState({ isOpen: false, shortURL: '', shortCode: '' });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, data: null, loading: false });
  const [copiedId, setCopiedId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await client.get('/urls?page=1&limit=5&sort_by=created_at&sort_direction=desc');
      const items = res.data.items || [];
      const total = res.data.meta?.total || items.length;

      // Compute simple stats
      let clicks = 0;
      let active = 0;
      items.forEach((u) => {
        clicks += u.click_count || 0;
        if (u.is_active) active++;
      });

      setRecentUrls(items);
      setStats({
        totalUrls: total,
        totalClicks: clicks,
        activeUrls: active,
      });
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickShorten = async (e) => {
    e.preventDefault();
    if (!quickUrl) return;
    setShortening(true);
    try {
      const res = await client.post('/urls', { original_url: quickUrl });
      toast.success('Short link generated!');
      setCreatedUrl(res.data);
      setQuickUrl('');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to shorten URL';
      toast.error(msg);
    } finally {
      setShortening(false);
    }
  };

  const handleCopy = (shortURL, id) => {
    navigator.clipboard.writeText(shortURL);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenPreview = async (code) => {
    setPreviewModal({ isOpen: true, data: null, loading: true });
    try {
      const res = await client.get(`/${code}/preview`);
      setPreviewModal({ isOpen: true, data: res.data, loading: false });
    } catch {
      toast.error('Failed to load link preview');
      setPreviewModal({ isOpen: false, data: null, loading: false });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this short link?')) return;
    try {
      await client.delete(`/urls/${id}`);
      toast.success('URL deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete URL');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400">Overview of your short links performance and quick actions.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition duration-200 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Short Link
        </button>
      </div>

      {/* Quick Shortener Hero Card */}
      <div className="glass-card p-6 md:p-8 rounded-2xl relative overflow-hidden border border-indigo-500/20 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Instant Link Shortener
          </div>
          <h2 className="text-xl font-bold text-white">Paste a long URL to shorten it instantly</h2>

          <form onSubmit={handleQuickShorten} className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="url"
              required
              placeholder="https://example.com/very/long/destination/url/path"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-950/90 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
            <button
              type="submit"
              disabled={shortening}
              className="px-6 py-3 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {shortening ? 'Shortening...' : 'Shorten Link'}
            </button>
          </form>

          {createdUrl && (
            <div className="mt-4 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-xs text-indigo-300 font-semibold uppercase">Created Short Link:</span>
                <p className="font-mono text-sm text-white font-bold">{createdUrl.short_url}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(createdUrl.short_url, 'created')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  {copiedId === 'created' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'created' ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => setQrModal({ isOpen: true, shortURL: createdUrl.short_url, shortCode: createdUrl.short_code })}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Short URLs</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{formatNumber(stats.totalUrls)}</h3>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <MousePointerClick className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Click Metrics</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{formatNumber(stats.totalClicks)}</h3>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Links</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{formatNumber(stats.activeUrls)}</h3>
          </div>
        </div>
      </div>

      {/* Recent URLs Section */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Recent Short Links</h3>
            <p className="text-xs text-slate-400">Latest shortened links created across your account.</p>
          </div>
          <NavLink
            to="/urls"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            View All
            <ExternalLink className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading recent links...</div>
        ) : recentUrls.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No short links created yet. Click "Create Short Link" above to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Title / Code</th>
                  <th className="px-6 py-3.5">Original Destination</th>
                  <th className="px-6 py-3.5 text-center">Clicks</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentUrls.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white truncate max-w-xs">{item.title || 'Untitled'}</div>
                      <div className="font-mono text-indigo-400 text-[11px] mt-0.5">{item.short_url}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-400">
                      <a href={item.original_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {item.original_url}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-white">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                        {formatNumber(item.click_count)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{formatDate(item.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopy(item.short_url, item.id)}
                          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          title="Copy Link"
                        >
                          {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setQrModal({ isOpen: true, shortURL: item.short_url, shortCode: item.short_code })}
                          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          title="QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenPreview(item.short_code)}
                          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          title="Safety Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete URL"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateURLModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchData()}
      />
      <QRCodeModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ ...qrModal, isOpen: false })}
        shortURL={qrModal.shortURL}
        shortCode={qrModal.shortCode}
      />
      <PreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ ...previewModal, isOpen: false })}
        previewData={previewModal.data}
        isLoading={previewModal.loading}
      />
    </div>
  );
}
