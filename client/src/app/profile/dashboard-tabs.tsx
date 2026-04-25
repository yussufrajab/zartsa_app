'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Ticket, FileCheck, MessageSquareWarning, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingHistoryItem {
  id: string; departure: string; destination: string; travelDate: string;
  totalAmount: number; currency: string; status: string; qrCode: string | null; createdAt: string;
}
interface ComplaintHistoryItem {
  id: string; referenceNumber: string; vehiclePlate: string;
  category: string; status: string; createdAt: string;
}
interface FineHistoryItem {
  id: string; offenseType: string; location: string;
  penaltyAmount: number; currency: string; paymentStatus: string;
  controlNumber: string; createdAt: string;
}

interface DashboardHistory {
  bookings: BookingHistoryItem[];
  verifications: { id: string; documentType: string; query: string; status: string; verifiedAt: string; }[];
  complaints: ComplaintHistoryItem[];
  fines: FineHistoryItem[];
}

type TabKey = 'bookings' | 'verifications' | 'complaints' | 'fines';

const tabs: { key: TabKey; icon: React.ElementType; labelKey: string }[] = [
  { key: 'bookings', icon: Ticket, labelKey: 'profile.bookings' },
  { key: 'verifications', icon: FileCheck, labelKey: 'profile.verifications' },
  { key: 'complaints', icon: MessageSquareWarning, labelKey: 'profile.complaints' },
  { key: 'fines', icon: Scale, labelKey: 'profile.fines' },
];

export function DashboardTabs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('bookings');
  const [history, setHistory] = useState<DashboardHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await api.get<{ status: string; data: DashboardHistory }>('/users/me/history');
        setHistory(response.data);
      } catch {
        setHistory({ bookings: [], verifications: [], complaints: [], fines: [] });
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#d4dadf] bg-white p-5">
        <p className="text-sm text-[#637885]">{t('common.loading')}</p>
      </div>
    );
  }

  if (!history) return null;

  return (
    <div className="rounded-2xl border border-[#d4dadf] bg-white p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-[#0d1820]">{t('profile.dashboard')}</h2>

      <div className="flex gap-1 p-1 rounded-2xl bg-[#eaeef0] mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = history[tab.key].length;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm transition-all',
                activeTab === tab.key
                  ? 'bg-white shadow-sm font-semibold text-[#0d1820]'
                  : 'text-[#637885] hover:text-[#2e3f4c]'
              )}>
              <Icon className="h-4 w-4" />
              {t(tab.labelKey)}
              {count > 0 && <span className="rounded-full bg-[#e6f4ef] px-1.5 text-xs font-semibold text-[#0a7c5c]">{count}</span>}
            </button>
          );
        })}
      </div>

      {activeTab === 'bookings' && (
        history.bookings.length === 0 ? (
          <p className="text-sm text-[#637885]">{t('profile.noBookings')}</p>
        ) : (
          <div className="space-y-2">
            {history.bookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-[#d4dadf] p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium text-[#0d1820]">{b.departure} &rarr; {b.destination}</p>
                  <span className={`rounded-xl px-2 py-0.5 text-xs font-semibold ${
                    b.status === 'ACTIVE' ? 'bg-[#e6f4ef] text-[#0a7c5c]' :
                    b.status === 'USED' ? 'bg-[#eaeef0] text-[#637885]' :
                    b.status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-[#fef3e2] text-[#c8730a]'
                  }`}>{b.status}</span>
                </div>
                <p className="mt-1 text-xs text-[#637885]">
                  {t('profile.date')}: {formatDate(b.travelDate)} | {t('profile.amount')}: {b.currency} {b.totalAmount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'verifications' && (
        history.verifications.length === 0 ? (
          <p className="text-sm text-[#637885]">{t('profile.noVerifications')}</p>
        ) : (
          <div className="space-y-2">
            {history.verifications.map((v) => (
              <div key={v.id} className="rounded-xl border border-[#d4dadf] p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium text-[#0d1820]">{v.documentType}</p>
                  <span className={`rounded-xl px-2 py-0.5 text-xs font-semibold ${
                    v.status === 'Valid' ? 'bg-[#e6f4ef] text-[#0a7c5c]' :
                    v.status === 'Expired' ? 'bg-red-50 text-red-700' : 'bg-[#fef3e2] text-[#c8730a]'
                  }`}>{v.status}</span>
                </div>
                <p className="mt-1 text-xs text-[#637885]">{v.query}</p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'complaints' && (
        history.complaints.length === 0 ? (
          <p className="text-sm text-[#637885]">{t('profile.noComplaints')}</p>
        ) : (
          <div className="space-y-2">
            {history.complaints.map((c) => (
              <div key={c.id} className="rounded-xl border border-[#d4dadf] p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium text-[#0d1820]">{c.category}</p>
                  <span className={`rounded-xl px-2 py-0.5 text-xs font-semibold ${
                    c.status === 'RESOLVED' ? 'bg-[#e6f4ef] text-[#0a7c5c]' :
                    c.status === 'CLOSED' ? 'bg-[#eaeef0] text-[#637885]' : 'bg-[#fef3e2] text-[#c8730a]'
                  }`}>{c.status}</span>
                </div>
                <p className="mt-1 text-xs text-[#637885]">
                  {t('profile.refNumber')}: {c.referenceNumber} | {c.vehiclePlate}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'fines' && (
        history.fines.length === 0 ? (
          <p className="text-sm text-[#637885]">{t('profile.noFines')}</p>
        ) : (
          <div className="space-y-2">
            {history.fines.map((f) => (
              <div key={f.id} className="rounded-xl border border-[#d4dadf] p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium text-[#0d1820]">{f.offenseType}</p>
                  <span className={`rounded-xl px-2 py-0.5 text-xs font-semibold ${
                    f.paymentStatus === 'PAID' ? 'bg-[#e6f4ef] text-[#0a7c5c]' :
                    f.paymentStatus === 'DISPUTED' ? 'bg-[#fef3e2] text-[#c8730a]' : 'bg-red-50 text-red-700'
                  }`}>{f.paymentStatus}</span>
                </div>
                <p className="mt-1 text-xs text-[#637885]">
                  {t('profile.amount')}: {f.currency} {f.penaltyAmount.toLocaleString()} | {t('profile.refNumber')}: {f.controlNumber}
                </p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}