'use client';

import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-primary via-zartsa-gold to-primary" />
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {t('app.name')} &mdash; {t('app.tagline')}
          </p>
        </div>
      </div>
    </footer>
  );
}