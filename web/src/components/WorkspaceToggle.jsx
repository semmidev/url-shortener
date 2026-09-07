import React, { useState, useRef, useEffect } from 'react';
import { Building2, Check, Key, Plus, ChevronDown, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function WorkspaceToggle() {
  const { tenants, activeTenant, selectTenant, openJoinModal, openCreateModal } = useTenant();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const activeRole = activeTenant?.role || 'member';
  const isOwner = activeRole === 'owner';
  const isAdmin = activeRole === 'admin';

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Pilih Workspace"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="cursor-pointer h-8 px-2.5 gap-2 text-muted-foreground hover:text-foreground text-xs font-medium rounded-lg transition-colors border border-border/50 hover:bg-muted/60"
      >
        <Building2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
        <span className="font-semibold text-foreground text-xs truncate max-w-[110px] sm:max-w-[160px]">
          {activeTenant ? activeTenant.name : 'Pilih Workspace'}
        </span>

        {/* User Active Role Badge */}
        <Badge
          variant={isOwner ? 'default' : isAdmin ? 'secondary' : 'outline'}
          className="text-[10px] font-extrabold uppercase px-1.5 py-0 h-4 tracking-wider shrink-0"
        >
          {activeRole}
        </Badge>

        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
      </Button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-1 z-50 min-w-64 bg-card border border-border rounded-xl shadow-xl py-1 animate-in fade-in-20 space-y-1"
        >
          <div className="px-3 py-1.5 border-b border-border/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Workspace Aktif
            </span>
            <span className="text-[10px] text-muted-foreground">
              Peran: <strong className="text-foreground uppercase">{activeRole}</strong>
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {tenants.map((t) => {
              const isSelected = t.id === activeTenant?.id;
              const tRole = t.role || 'member';
              const isTOwner = tRole === 'owner';
              const isTAdmin = tRole === 'admin';

              return (
                <button
                  key={t.id}
                  role="menuitem"
                  onClick={() => {
                    if (!isSelected) selectTenant(t);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-muted transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary/5 font-semibold text-primary' : 'text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant={isTOwner ? 'default' : isTAdmin ? 'secondary' : 'outline'}
                      className="text-[9px] font-bold uppercase px-1.5 py-0"
                    >
                      {tRole}
                    </Badge>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-border/50 pt-1 space-y-0.5">
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openJoinModal();
              }}
              className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-muted text-primary font-medium cursor-pointer transition-colors"
            >
              <Key className="h-3.5 w-3.5 shrink-0" />
              <span>Gabung Workspace (Kode)</span>
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openCreateModal();
              }}
              className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-muted text-primary font-medium cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Buat Workspace Baru</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
