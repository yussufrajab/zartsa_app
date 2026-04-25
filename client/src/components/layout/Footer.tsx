'use client';

import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-[#eaeef0] bg-white px-4 py-6">
      <div className="mx-auto max-w-5xl lg:px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#12a07a] to-[#0a7c5c] text-sm font-bold text-white ring-1 ring-white/20 ring-inset">
            Z
          </div>
          <div className="h-[3px] w-24 rounded-full bg-gradient-to-r from-[#0a7c5c] via-[#c8730a] to-[#1a5f8a]" />
          <p className="text-center text-xs text-[#8a9baa]">
            &copy; {new Date().getFullYear()} {t('app.name')} &mdash; {t('app.tagline')}
          </p>
        </div>
      </div>
    </footer>
  );
}