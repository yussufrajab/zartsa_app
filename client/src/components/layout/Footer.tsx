'use client';

import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-gray-50 px-4 py-4 text-center text-xs text-gray-500">
      <p>&copy; {new Date().getFullYear()} {t('app.name')} &mdash; {t('app.tagline')}</p>
    </footer>
  );
}