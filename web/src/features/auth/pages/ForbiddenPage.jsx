import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';

export default function ForbiddenPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <Card className="w-full max-w-md border border-border bg-card shadow-lg">
        <CardHeader className="flex flex-col items-center text-center pb-2 pt-8">
          {/* Badge 403 */}
          <Badge variant="destructive" className="mb-4 text-xs font-mono font-bold tracking-wider px-2.5 py-0.5 uppercase">
            {t('forbiddenPage.badge')}
          </Badge>

          {/* Icon Container */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-destructive/20 bg-destructive/10 text-destructive mb-4 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {t('forbiddenPage.title')}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-muted-foreground mt-1.5 max-w-xs">
            {t('forbiddenPage.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center text-center px-8 pb-8 pt-4 space-y-6">
          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 border border-border/60 rounded-lg p-3.5">
            {t('forbiddenPage.detail')}
          </p>

          {/* Separator */}
          <div className="w-full border-t border-border" />

          {/* Action Buttons */}
          <div className="flex flex-col w-full gap-2.5">
            <Button asChild className="w-full cursor-pointer" size="lg">
              <Link to="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t('forbiddenPage.backToDashboard')}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              size="lg"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/dashboard');
                }
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('forbiddenPage.goBack')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-muted-foreground mt-8">
        &copy; {new Date().getFullYear()} URL Shortener. All rights reserved.
      </p>
    </div>
  );
}
