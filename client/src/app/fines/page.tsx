'use client';

import { useTranslation } from 'react-i18next';
import { Scale } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export default function FinesPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('nav.fines')} />
      <EmptyState
        icon={<Scale className="h-12 w-12" />}
        title="Coming Soon"
        description="The fines feature is being built. Check back soon!"
      />
    </div>
  );
}