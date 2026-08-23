import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/context/I18nContext';
import client from '@/lib/client';
import { toast } from 'sonner';

export default function CreateURLModal({ isOpen, onClose, onSuccess }) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!originalUrl) return;
    setLoading(true);

    try {
      const body = { original_url: originalUrl };
      if (title.trim()) body.title = title.trim();
      if (customCode.trim()) body.custom_code = customCode.trim();

      const res = await client.post('/urls', body);
      toast.success('Short URL created successfully!');
      setTitle('');
      setOriginalUrl('');
      setCustomCode('');
      onClose();
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create short URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("urls.createModalTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="originalUrl">{t("dashboard.originalUrl")} *</Label>
            <Input
              id="originalUrl"
              type="url"
              placeholder={t("dashboard.originalUrlPlaceholder")}
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t("dashboard.titlePlaceholder")}</Label>
            <Input
              id="title"
              type="text"
              placeholder={t("dashboard.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customCode">{t("dashboard.customCodePlaceholder")}</Label>
            <Input
              id="customCode"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("dashboard.customCodePlaceholder")}
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
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
