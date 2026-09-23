import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/context/I18nContext';
import client from '@/lib/client';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/errorUtils';

export default function CreateURLModal({ isOpen, onClose, onSuccess }) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
      const body = { original_url: originalUrl.trim() };
      if (title.trim()) body.title = title.trim();
      if (customCode.trim()) body.custom_code = customCode.trim();

      const res = await client.post('/urls', body);
      toast.success('Short URL created successfully!');
      setTitle('');
      setOriginalUrl('');
      setCustomCode('');
      setFieldErrors({});
      onClose();
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      const parsed = handleApiError(err, 'Failed to create short URL');
      if (parsed.errors && Object.keys(parsed.errors).length > 0) {
        setFieldErrors(parsed.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setOriginalUrl('');
    setCustomCode('');
    setFieldErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("urls.createModalTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="originalUrl">{t("dashboard.originalUrl")} *</Label>
            <Input
              id="originalUrl"
              type="url"
              autoComplete="off"
              placeholder="e.g. https://example.com/my-long-url…"
              value={originalUrl}
              onChange={(e) => {
                setOriginalUrl(e.target.value);
                if (fieldErrors.originalUrl || fieldErrors.original_url) {
                  setFieldErrors(prev => ({ ...prev, originalUrl: '', original_url: '' }));
                }
              }}
              className={fieldErrors.originalUrl || fieldErrors.original_url ? 'border-destructive' : ''}
              required
            />
            {(fieldErrors.originalUrl || fieldErrors.original_url) && (
              <p className="text-xs text-destructive font-medium mt-1">
                {fieldErrors.originalUrl || fieldErrors.original_url}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">{t("dashboard.titlePlaceholder")}</Label>
            <Input
              id="title"
              type="text"
              placeholder={t("dashboard.titlePlaceholder")}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
              }}
              className={fieldErrors.title ? 'border-destructive' : ''}
            />
            {fieldErrors.title && (
              <p className="text-xs text-destructive font-medium mt-1">{fieldErrors.title}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customCode">{t("dashboard.customCodePlaceholder")}</Label>
            <Input
              id="customCode"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("dashboard.customCodePlaceholder")}
              value={customCode}
              onChange={(e) => {
                setCustomCode(e.target.value);
                if (fieldErrors.customCode || fieldErrors.custom_code) {
                  setFieldErrors(prev => ({ ...prev, customCode: '', custom_code: '' }));
                }
              }}
              className={fieldErrors.customCode || fieldErrors.custom_code ? 'border-destructive' : ''}
            />
            {(fieldErrors.customCode || fieldErrors.custom_code) && (
              <p className="text-xs text-destructive font-medium mt-1">
                {fieldErrors.customCode || fieldErrors.custom_code}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("dashboard.shorteningBtn") : t("dashboard.createUrlBtn")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
