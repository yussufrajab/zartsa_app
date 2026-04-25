'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { COMPLAINT_CATEGORIES } from '@zartsa/shared';
import type { ComplaintStatus, ComplaintCategory } from '@zartsa/shared';
import { Search, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useSearchParams } from 'next/navigation';

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

export default function TrackComplaintPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [referenceNumber, setReferenceNumber] = useState(searchParams.get('ref') || '');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!referenceNumber.trim()) return;
    setIsLoading(true);
    setNotFound(false);
    setError('');
    setComplaint(null);

    try {
      const res = await api.get<{ data: Complaint }>(`/complaints/track/${referenceNumber.trim()}`);
      setComplaint(res.data);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        setNotFound(true);
      } else {
        setError(t('common.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferenceNumber(ref);
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel = (status: ComplaintStatus) => {
    const labels: Record<ComplaintStatus, string> = {
      RECEIVED: 'Received',
      UNDER_REVIEW: 'Under Review',
      ESCALATED: 'Escalated',
      RESOLVED: 'Resolved',
      CLOSED: 'Closed',
    };
    return labels[status] || status;
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
      <PageHeader title={t('complaints.trackTitle')} backHref="/complaints" />

      <div className="flex gap-2">
        <Input
          placeholder="CMP-XXXXX-XXXX"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          icon={<Search className="h-4 w-4" />}
        />
        <Button variant="primary" onClick={handleSearch} loading={isLoading}>
          {t('common.search')}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
          {error}
        </div>
      )}

      {notFound && (
        <div className="mt-6">
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title={t('complaints.notFound')}
          />
        </div>
      )}

      {complaint && (
        <Card className="mt-6" variant="gradient" accentColor={statusVariant[complaint.status] === 'success' ? 'green' : statusVariant[complaint.status] === 'gold' ? 'gold' : 'blue'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{complaint.referenceNumber}</CardTitle>
              <Badge variant={statusVariant[complaint.status]}>
                {statusLabel(complaint.status)}
              </Badge>
            </div>
            <CardDescription>
              {new Date(complaint.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium text-[#637885]">{t('complaints.vehiclePlate')}</p>
                <p className="font-medium text-[#0d1820]">{complaint.vehiclePlate}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#637885]">{t('complaints.route')}</p>
                <p className="font-medium text-[#0d1820]">{complaint.route}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#637885]">{t('complaints.incidentDate')}</p>
                <p className="font-medium text-[#0d1820]">{new Date(complaint.incidentDate).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#637885]">{t('complaints.category')}</p>
                <p className="font-medium text-[#0d1820]">
                  {t(`complaints.categories.${complaint.category}`)}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-[#637885]">{t('complaints.description')}</p>
              <p className="text-sm text-[#2e3f4c] leading-relaxed">{complaint.description}</p>
            </div>

            {complaint.resolution && (
              <div className="rounded-xl bg-[#e6f4ef] p-3">
                <p className="mb-1 text-xs font-medium text-[#0a7c5c]">{t('complaints.resolution')}</p>
                <p className="text-sm text-[#2e3f4c]">{complaint.resolution}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}