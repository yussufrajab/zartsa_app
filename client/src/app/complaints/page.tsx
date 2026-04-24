'use client';

import { useTranslation } from 'react-i18next';

export default function ComplaintsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">{t('nav.complaints')}</h1>
      <p className="text-sm text-gray-500">
        {t('common.loading')} — Coming soon
      </p>
    </div>
  );
}