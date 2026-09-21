import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DownloadIcon, CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/context/I18nContext';

export default function QRCodeModal({ isOpen, onClose, shortURL, shortCode }) {
  const { t } = useI18n();
  const qrApiUrl = `/${shortCode}/qr`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrApiUrl;
    link.download = `qrcode-${shortCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('common.success'));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shortURL);
    toast.success(t('common.copied'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-center">{t('modals.qrTitle', { shortCode })}</DialogTitle>
          <DialogDescription className="text-center">{t('modals.qrDesc')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-xl my-2 border border-border/60">
          <img
            src={qrApiUrl}
            alt={`QR Code ${shortCode}`}
            width={192}
            height={192}
            className="w-48 h-48 object-contain rounded-lg border bg-white p-2"
          />
          <p className="mt-3 text-xs font-mono text-primary font-semibold">{shortURL}</p>
        </div>

        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <CopyIcon className="size-4 shrink-0" />
            <span>{t('modals.copyLink')}</span>
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <DownloadIcon className="size-4 shrink-0" />
            <span>{t('modals.downloadPng')}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
