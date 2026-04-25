'use client';

import { useTranslation } from 'react-i18next';
import { Ticket } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export default function TicketsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('nav.tickets')} />
      <EmptyState
        icon={<Ticket className="h-12 w-12" />}
        title="Coming Soon"
        description="The tickets feature is being built. Check back soon!"
      />
    </div>
  );
}