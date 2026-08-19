import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import client from '@/lib/client';
import { toast } from 'sonner';

export default function CreateURLModal({ isOpen, onClose, onSuccess }) {
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
          <DialogTitle>Create Short URL</DialogTitle>
          <DialogDescription>Generate a new shortened link with optional title and custom code.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="originalUrl">Destination URL *</Label>
            <Input
              id="originalUrl"
              type="url"
              placeholder="https://example.com/target-page"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Link Title (Optional)</Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g. Summer Campaign Landing Page"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customCode">Custom Short Code (Optional)</Label>
            <Input
              id="customCode"
              type="text"
              placeholder="e.g. summer-2026"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
