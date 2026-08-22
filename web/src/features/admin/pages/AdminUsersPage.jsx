import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/context/I18nContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheckIcon, UserIcon } from 'lucide-react';
import { getAdminUsers } from '@/features/admin/api';

export default function AdminUsers() {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const list = await getAdminUsers();
        setUsers(list);
      } catch {
        toast.error('Failed to fetch system users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("nav.userManagement")}</CardTitle>
          <CardDescription>{t("admin.totalUsers")}: {users.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-muted-foreground uppercase">
                    <th className="py-3 px-2">{t("admin.userHeader")}</th>
                    <th className="py-3 px-2">{t("admin.roleHeader")}</th>
                    <th className="py-3 px-2">{t("admin.statusHeader")}</th>
                    <th className="py-3 px-2">{t("admin.joinedHeader")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2">
                        <div className="font-semibold text-foreground">{u.full_name || u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="flex items-center gap-1 w-max">
                          {u.role === 'admin' ? <ShieldCheckIcon className="size-3" /> : <UserIcon className="size-3" />}
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10">Active</Badge>
                      </td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
