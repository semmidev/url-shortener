import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DownloadIcon, CopyIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function QRCodeModal({ isOpen, onClose, shortURL, shortCode }) {
  const qrApiUrl = `/${shortCode}/qr`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrApiUrl;
    link.download = `qrcode-${shortCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code downloaded!');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shortURL);
    toast.success('Short URL copied!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-center">QR Code for /{shortCode}</DialogTitle>
          <DialogDescription className="text-center">Scan with smartphone to open target destination</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-xl my-2 border border-border/60">
          <img
            src={qrApiUrl}
            alt={`QR Code ${shortCode}`}
            className="w-48 h-48 object-contain rounded-lg border bg-white p-2"
          />
          <p className="mt-3 text-xs font-mono text-primary font-semibold">{shortURL}</p>
        </div>

        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <CopyIcon className="size-4 shrink-0" />
            <span>Copy Link</span>
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <DownloadIcon className="size-4 shrink-0" />
            <span>Download PNG</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
