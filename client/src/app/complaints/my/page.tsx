'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import type { ComplaintStatus, ComplaintCategory } from '@zartsa/shared';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/skeleton';

interface Complaint {
  id: string;
  referenceNumber: string;
  vehiclePlate: string;
  route: string;
  incidentDate: string;
  category: ComplaintCategory;
  description: string;
  attachments: string[];
  status: ComplaintStatus;
  resolution: string | null;
  createdAt: string;
}

const statusVariant: Record<ComplaintStatus, 'info' | 'warning' | 'gold' | 'success' | 'neutral'> = {
  RECEIVED: 'info',
  UNDER_REVIEW: 'warning',
  ESCALATED: 'gold',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const statusLabel = (status: ComplaintStatus): string => {
  const labels: Record<ComplaintStatus, string> = {
    RECEIVED: 'Received',
    UNDER_REVIEW: 'Under Review',
    ESCALATED: 'Escalated',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  };
  return labels[status] || status;
};

export default function MyComplaintsPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadComplaints();
  }, [isAuthenticated]);

  const loadComplaints = async () => {
    try {
      const res = await api.get<{ data: { items: Complaint[] } }>('/complaints/my');
      setComplaints(res.data.items);
    } catch {
      setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <p className="p-4 text-sm text-[#637885]">{t('common.loading')}</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('complaints.myComplaints')} backHref="/complaints" />

      {complaints.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title={t('profile.noComplaints')}
        />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <Link key={c.id} href={`/complaints/track?ref=${c.referenceNumber}`}>
              <Card variant="interactive" size="compact" className="mb-3">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-semibold text-[#0d1820]">
                          {c.referenceNumber}
                        </p>
                        <Badge variant={statusVariant[c.status]}>
                          {statusLabel(c.status)}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#637885]">
                        <span>{t(`complaints.categories.${c.category}`)}</span>
                        <span>{c.vehiclePlate}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}