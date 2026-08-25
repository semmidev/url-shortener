import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();
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

  const options = [
    { code: 'en', label: t('common.english'), flag: '🇬🇧', badge: 'EN' },
    { code: 'id', label: t('common.indonesian'), flag: '🇮🇩', badge: 'ID' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="cursor-pointer h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground text-xs font-medium rounded-lg transition-colors"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="font-semibold uppercase tracking-wide text-[11px]">
          {language}
        </span>
      </Button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-1 z-50 w-44 bg-card border border-border rounded-xl shadow-xl py-1 animate-in fade-in-20"
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('common.language')}
          </p>
          {options.map((opt) => (
            <button
              key={opt.code}
              role="menuitem"
              onClick={() => {
                setLanguage(opt.code);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2.5 hover:bg-muted transition-colors cursor-pointer ${
                language === opt.code
                  ? 'text-primary font-semibold'
                  : 'text-foreground'
              }`}
            >
              <span className="text-sm select-none">{opt.flag}</span>
              <span>{opt.label}</span>
              {language === opt.code && (
                <Check className="ml-auto h-3.5 w-3.5 text-primary" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
