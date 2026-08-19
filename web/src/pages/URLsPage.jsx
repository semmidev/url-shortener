import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Copy,
  Check,
  QrCode,
  Eye,
  Edit3,
  Trash2,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import client from '../lib/client';
import { formatDate, formatNumber } from '../lib/utils';
import { toast } from 'sonner';
import CreateURLModal from '../components/CreateURLModal';
import EditURLModal from '../components/EditURLModal';
import QRCodeModal from '../components/QRCodeModal';
import PreviewModal from '../components/PreviewModal';

export default function URLsPage() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [qrModal, setQrModal] = useState({ isOpen: false, shortURL: '', shortCode: '' });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, data: null, loading: false });
  const [copiedId, setCopiedId] = useState(null);

  const fetchURLs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: meta.page,
        limit: meta.limit,
        sort_by: sortBy,
        sort_direction: sortDirection,
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await client.get(`/urls?${params.toString()}`);
      setUrls(res.data.items || []);
      if (res.data.meta) {
        setMeta((prev) => ({ ...prev, ...res.data.meta }));
      }
    } catch {
      toast.error('Failed to load short URLs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchURLs();
  }, [meta.page, sortBy, sortDirection]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setMeta((prev) => ({ ...prev, page: 1 }));
    fetchURLs();
  };

  const handleCopy = (shortURL, id) => {
    navigator.clipboard.writeText(shortURL);
    setCopiedId(id);
    toast.success('Link copied to clipboard!');
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
    if (!confirm('Are you sure you want to soft-delete this short URL?')) return;
    try {
      await client.delete(`/urls/${id}`);
      toast.success('Short URL deleted');
      fetchURLs();
    } catch {
      toast.error('Failed to delete URL');
    }
  };

  const handleRestore = async (id) => {
    try {
      await client.post(`/urls/${id}/restore`);
      toast.success('Short URL restored successfully!');
      fetchURLs();
    } catch {
      toast.error('Failed to restore URL');
    }
  };

  const totalPages = Math.ceil(meta.total / meta.limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">My Short URLs</h1>
          <p className="text-sm text-slate-400">Manage, search, edit, and analyze all your shortened links.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition duration-200 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Short Link
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by title or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none transition"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" /> Sort:
          </div>
          <select
            value={`${sortBy}:${sortDirection}`}
            onChange={(e) => {
              const [sb, sd] = e.target.value.split(':');
              setSortBy(sb);
              setSortDirection(sd);
            }}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition"
          >
            <option value="created_at:desc">Newest First</option>
            <option value="created_at:asc">Oldest First</option>
            <option value="click_count:desc">Most Clicked</option>
            <option value="click_count:asc">Least Clicked</option>
          </select>
        </div>
      </div>

      {/* URLs Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading links...</div>
        ) : urls.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No short URLs found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Title / Short Link</th>
                  <th className="px-6 py-4">Original Destination</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Clicks</th>
                  <th className="px-6 py-4">Expires</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {urls.map((item) => (
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
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          item.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-white">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                        {formatNumber(item.click_count)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {item.expires_at ? formatDate(item.expires_at) : 'Never'}
                    </td>
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
                          onClick={() => setEditItem(item)}
                          className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition"
                          title="Edit URL"
                        >
                          <Edit3 className="w-4 h-4" />
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

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>
            Page <strong className="text-white">{meta.page}</strong> of <strong className="text-white">{totalPages}</strong> ({meta.total} items)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={meta.page <= 1}
              onClick={() => setMeta((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={meta.page >= totalPages}
              onClick={() => setMeta((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateURLModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchURLs()}
      />
      <EditURLModal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        item={editItem}
        onSuccess={() => fetchURLs()}
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
