import { useTranslation } from 'react-i18next';

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message }: LoadingPageProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0a7c5c] border-t-transparent" />
        {message && <p className="text-sm text-[#637885]">{message}</p>}
        {!message && <p className="text-sm text-[#637885]">{t('common.loading')}</p>}
      </div>
    </div>
  );
}