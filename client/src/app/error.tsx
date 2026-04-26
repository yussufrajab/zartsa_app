'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-4xl font-bold text-[#0d1820]">Something went wrong</h1>
      <p className="mb-8 max-w-md text-[#637885]">
        {t('common.errorOccurred', 'An unexpected error occurred. Please try again.')}
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-[#0a7c5c] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#096b4d]"
      >
        {t('common.tryAgain', 'Try again')}
      </button>
    </div>
  );
}