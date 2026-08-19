import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, AlertTriangle, Link2Off, ArrowLeft, Plus } from 'lucide-react';

export default function InvalidURLPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';
  const reason = searchParams.get('reason') || 'not_found';

  let title = "Invalid Short Link";
  let description = "We couldn't route you to the requested destination.";
  let detailMessage = "The link you clicked is either incorrect, has been deleted, or never existed in our database.";
  let Icon = Link2Off;
  let iconColor = "text-destructive bg-destructive/10 border-destructive/20";

  if (reason === 'inactive') {
    title = "Inactive Short Link";
    description = "This shortened link is currently deactivated.";
    detailMessage = "The creator of this link has temporarily disabled it. It cannot be accessed until it is reactivated.";
    Icon = ShieldAlert;
    iconColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
  } else if (reason === 'expired') {
    title = "Expired Short Link";
    description = "This short link has reached its expiration date.";
    detailMessage = "Short links can be configured to expire after a certain date or time. This link is no longer active.";
    Icon = AlertTriangle;
    iconColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <Card className="w-full max-w-md border border-border bg-card shadow-lg">
        <CardHeader className="flex flex-col items-center text-center pb-2 pt-8">
          {/* Professional Icon Container */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${iconColor} mb-4`}>
            <Icon className="w-6 h-6" />
          </div>

          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-foreground/80 mt-1">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center text-center px-8 pb-8 pt-4 space-y-6">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            {detailMessage}
          </p>

          {code && (
            <div className="w-full bg-muted/50 border border-border/80 rounded-lg p-2.5 font-mono text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <span>code:</span>
              <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                {code}
              </span>
            </div>
          )}

          {/* Separator */}
          <div className="w-full border-t border-border" />

          {/* Actions */}
          <div className="flex flex-col w-full gap-2">
            <Button asChild className="w-full">
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <Plus className="mr-2 h-4 w-4" />
                Create a Short Link
              </Link>
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
