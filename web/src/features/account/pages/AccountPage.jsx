import React from 'react';
import { useAuthStore } from '@/features/auth/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserIcon, MailIcon, ShieldCheckIcon, CalendarIcon } from 'lucide-react';

export default function Account() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account information and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>Personal information associated with your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
            <UserIcon className="size-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Full Name</div>
              <div className="font-semibold">{user.full_name || 'N/A'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
            <MailIcon className="size-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Email Address</div>
              <div className="font-semibold">{user.email}</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="size-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Account Privilege</div>
                <div className="font-semibold capitalize">{user.role}</div>
              </div>
            </div>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
