'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { COMPLAINT_CATEGORIES } from '@zartsa/shared';
import type { ComplaintStatus, ComplaintCategory, Complaint } from '@zartsa/shared';
import { useRouter } from 'next/navigation';
import { Download, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ListSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

const STATUSES: ComplaintStatus[] = ['RECEIVED', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'];

interface AdminComplaint extends Complaint {
  assignedTo: string | null;
}

export default function ComplaintsAdminPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'officer' && user?.role !== 'admin')) {
      router.push('/login');
      return;
    }
    loadComplaints();
  }, [isAuthenticated, user]);

  const loadComplaints = async () => {
    try {
      const res = await api.get<{ data: { items: AdminComplaint[] } }>('/complaints/admin/all');
      setComplaints(res.data.items);
    } catch {
      setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: ComplaintStatus, resolution?: string) => {
    setUpdatingId(id);
    try {
      const payload: { status: string; resolution?: string } = { status };
      if (resolution) payload.resolution = resolution;
      await api.patch(`/complaints/${id}/status`, payload);
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status, resolution: resolution || c.resolution } : c
        )
      );
    } catch {
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssign = async (id: string, officerId: string) => {
    try {
      await api.patch(`/complaints/${id}/assign`, { assignedTo: officerId });
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, assignedTo: officerId } : c))
      );
    } catch {
      alert('Failed to assign officer');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Reference', 'Vehicle Plate', 'Route', 'Category', 'Status', 'Created At'];
    const rows = filteredComplaints.map((c) => [
      c.referenceNumber,
      c.vehiclePlate,
      c.route,
      c.category,
      c.status,
      new Date(c.createdAt).toISOString(),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'complaints.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredComplaints = complaints.filter((c) => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterCategory && c.category !== filterCategory) return false;
    return true;
  });

  if (isLoading) return <p className="p-4 text-sm text-[#637885]">{t('common.loading')}</p>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      <PageHeader
        title={t('complaints.adminTitle') || 'Complaint Management'}
        backHref="/complaints"
        action={
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1 h-4 w-4" />
            {t('complaints.exportCsv') || 'Export CSV'}
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-[#637885]" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-[#d4dadf] bg-white px-3 py-2 text-sm text-[#0d1820] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]"
        >
          <option value="">{t('complaints.allStatuses') || 'All statuses'}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-xl border border-[#d4dadf] bg-white px-3 py-2 text-sm text-[#0d1820] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]"
        >
          <option value="">{t('complaints.allCategories') || 'All categories'}</option>
          {COMPLAINT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {t(`complaints.categories.${cat}`)}
            </option>
          ))}
        </select>
      </div>

      {filteredComplaints.length === 0 ? (
        <p className="text-sm text-[#637885]">{t('common.noResults')}</p>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map((c) => (
            <Card key={c.id} size="compact">
              <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-semibold text-[#0d1820]">
                        {c.referenceNumber}
                      </span>
                      <Badge variant={statusVariant[c.status]}>
                        {statusLabel(c.status)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#637885]">
                      <span>{c.vehiclePlate}</span>
                      <span>{t(`complaints.categories.${c.category}`)}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {c.status === 'RECEIVED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={updatingId === c.id}
                        onClick={() => handleStatusUpdate(c.id, 'UNDER_REVIEW')}
                      >
                        {t('complaints.markUnderReview') || 'Review'}
                      </Button>
                    )}
                    {c.status === 'UNDER_REVIEW' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          loading={updatingId === c.id}
                          onClick={() => handleStatusUpdate(c.id, 'ESCALATED')}
                        >
                          {t('complaints.escalate') || 'Escalate'}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={updatingId === c.id}
                          onClick={() => handleStatusUpdate(c.id, 'RESOLVED')}
                        >
                          {t('complaints.resolve') || 'Resolve'}
                        </Button>
                      </>
                    )}
                    {c.status === 'ESCALATED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={updatingId === c.id}
                        onClick={() => handleStatusUpdate(c.id, 'RESOLVED')}
                      >
                        {t('complaints.resolve') || 'Resolve'}
                      </Button>
                    )}
                    {c.status === 'RESOLVED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={updatingId === c.id}
                        onClick={() => handleStatusUpdate(c.id, 'CLOSED')}
                      >
                        {t('complaints.close') || 'Close'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}