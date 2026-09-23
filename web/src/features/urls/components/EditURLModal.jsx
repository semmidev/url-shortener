import React, { useState, useEffect } from 'react';
import { X, Edit3, Link2, Calendar, CheckSquare, Square } from 'lucide-react';
import client from '../lib/client';
import { toast } from 'sonner';
import { useI18n } from '@/context/I18nContext';
import { handleApiError } from '@/lib/errorUtils';

export default function EditURLModal({ isOpen, onClose, item, onSuccess }) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setOriginalUrl(item.original_url || '');
      setIsActive(item.is_active ?? true);
      setFieldErrors({});
      if (item.expires_at) {
        const date = new Date(item.expires_at);
        const formatted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setExpiresAt(formatted);
      } else {
        setExpiresAt('');
      }
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const newErrors = {};
    if (!originalUrl.trim()) {
      newErrors.originalUrl = 'URL tujuan wajib diisi';
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      toast.error('Mohon lengkapi formulir dengan benar');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim() || undefined,
        original_url: originalUrl.trim() || undefined,
        is_active: isActive,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      await client.put(`/urls/${item.id}`, payload);
      toast.success(t('common.success'));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const parsed = handleApiError(err, 'Gagal memperbarui URL');
      if (parsed.errors && Object.keys(parsed.errors).length > 0) {
        setFieldErrors(parsed.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-card rounded-2xl p-6 shadow-2xl relative border border-slate-800">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('modals.editTitle')}</h3>
            <p className="text-xs text-indigo-300 font-mono">/{item.short_code}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="edit-title" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 cursor-pointer">
              {t('modals.titleLabel')}
            </label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }));
              }}
              className={`w-full px-4 py-2.5 bg-slate-900/80 border ${fieldErrors.title ? 'border-rose-500' : 'border-slate-700/80'} focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded-xl text-sm text-slate-100 placeholder-slate-500 transition`}
            />
            {fieldErrors.title && (
              <p className="text-xs text-rose-400 font-medium mt-1">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label htmlFor="edit-original-url" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 cursor-pointer">
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              {t('modals.originalUrlLabel')} *
            </label>
            <input
              id="edit-original-url"
              type="url"
              required
              value={originalUrl}
              onChange={(e) => {
                setOriginalUrl(e.target.value);
                if (fieldErrors.originalUrl || fieldErrors.original_url) {
                  setFieldErrors((prev) => ({ ...prev, originalUrl: '', original_url: '' }));
                }
              }}
              className={`w-full px-4 py-2.5 bg-slate-900/80 border ${fieldErrors.originalUrl || fieldErrors.original_url ? 'border-rose-500' : 'border-slate-700/80'} focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded-xl text-sm text-slate-100 placeholder-slate-500 transition`}
            />
            {(fieldErrors.originalUrl || fieldErrors.original_url) && (
              <p className="text-xs text-rose-400 font-medium mt-1">
                {fieldErrors.originalUrl || fieldErrors.original_url}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="edit-expires-at" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              {t('modals.expirationDateLabel')}
            </label>
            <input
              id="edit-expires-at"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => {
                setExpiresAt(e.target.value);
                if (fieldErrors.expiresAt || fieldErrors.expires_at) {
                  setFieldErrors((prev) => ({ ...prev, expiresAt: '', expires_at: '' }));
                }
              }}
              className={`w-full px-4 py-2.5 bg-slate-900/80 border ${fieldErrors.expiresAt || fieldErrors.expires_at ? 'border-rose-500' : 'border-slate-700/80'} focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded-xl text-sm text-slate-100 transition`}
            />
            {(fieldErrors.expiresAt || fieldErrors.expires_at) && (
              <p className="text-xs text-rose-400 font-medium mt-1">
                {fieldErrors.expiresAt || fieldErrors.expires_at}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="flex items-center gap-2.5 text-sm font-medium text-slate-200 cursor-pointer select-none"
            >
              {isActive ? (
                <CheckSquare className="w-5 h-5 text-emerald-400" />
              ) : (
                <Square className="w-5 h-5 text-slate-500" />
              )}
              {t('modals.activeStatusLabel')}
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
