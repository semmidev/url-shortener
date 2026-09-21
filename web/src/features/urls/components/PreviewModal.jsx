import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheckIcon, AlertTriangleIcon, ExternalLinkIcon } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';

export default function PreviewModal({ isOpen, onClose, data }) {
  const { t } = useI18n();

  if (!data) return null;

  const targetData = data.data || data;
  const isSafe = targetData.safety_rating === 'SAFE';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('modals.previewTitle')}</DialogTitle>
          <DialogDescription>{t('modals.previewDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
            <div className="text-xs text-muted-foreground">{t('workspace.shortLinkCol')}</div>
            <div className="font-mono text-sm font-bold text-primary">/{targetData.short_code}</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
            <div className="text-xs text-muted-foreground">{t('modals.destinationUrl')}</div>
            <div className="text-sm font-medium break-all">{targetData.original_url}</div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
            <div className="text-xs text-muted-foreground">{t('modals.safetyAnalysis')}</div>
            <Badge variant={isSafe ? 'default' : 'destructive'} className="flex items-center gap-1">
              {isSafe ? <ShieldCheckIcon className="size-3" /> : <AlertTriangleIcon className="size-3" />}
              {targetData.safety_rating}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
            <div className="text-xs text-muted-foreground">{t('modals.httpsEncryption')}</div>
            <Badge variant={targetData.is_https ? 'outline' : 'secondary'}>
              {targetData.is_https ? 'Secure (HTTPS)' : 'HTTP'}
            </Badge>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button asChild>
            <a href={targetData.original_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
              <span>{t('modals.visitLink')}</span>
              <ExternalLinkIcon className="size-4 shrink-0" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
