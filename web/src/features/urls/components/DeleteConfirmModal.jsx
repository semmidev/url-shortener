import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon, Trash2Icon, Loader2Icon } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'Delete Short Link',
  description = 'Are you sure you want to delete this short URL? This action cannot be undone and any existing redirects will stop working immediately.',
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive shrink-0">
            <AlertTriangleIcon className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-normal">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 pt-4 border-t border-border/60 mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="cursor-pointer font-semibold gap-1.5"
          >
            {loading ? (
              <Loader2Icon className="size-4 animate-spin shrink-0" aria-hidden="true" />
            ) : (
              <Trash2Icon className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span>{loading ? 'Deleting…' : 'Delete Permanently'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
