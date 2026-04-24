'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Ticket, FileCheck, MessageSquareWarning, Scale } from 'lucide-react';

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
      <div className="rounded-lg border p-4">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!history) return null;

  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-4 text-lg font-semibold">{t('profile.dashboard')}</h2>

      <div className="mb-4 flex border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = history[tab.key].length;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 border-b-2 px-3 py-2 text-sm ${
                activeTab === tab.key ? 'border-zartsa-green font-medium text-zartsa-green' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="h-4 w-4" />
              {t(tab.labelKey)}
              {count > 0 && <span className="rounded-full bg-gray-200 px-1.5 text-xs">{count}</span>}
            </button>
          );
        })}
      </div>

      {activeTab === 'bookings' && (
        history.bookings.length === 0 ? (
          <p className="text-sm text-gray-500">{t('profile.noBookings')}</p>
        ) : (
          <div className="space-y-2">
            {history.bookings.map((b) => (
              <div key={b.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{b.departure} &rarr; {b.destination}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    b.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    b.status === 'USED' ? 'bg-gray-100 text-gray-600' :
                    b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{b.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('profile.date')}: {formatDate(b.travelDate)} | {t('profile.amount')}: {b.currency} {b.totalAmount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'verifications' && (
        history.verifications.length === 0 ? (
          <p className="text-sm text-gray-500">{t('profile.noVerifications')}</p>
        ) : (
          <div className="space-y-2">
            {history.verifications.map((v) => (
              <div key={v.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{v.documentType}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    v.status === 'Valid' ? 'bg-green-100 text-green-700' :
                    v.status === 'Expired' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{v.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{v.query}</p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'complaints' && (
        history.complaints.length === 0 ? (
          <p className="text-sm text-gray-500">{t('profile.noComplaints')}</p>
        ) : (
          <div className="space-y-2">
            {history.complaints.map((c) => (
              <div key={c.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{c.category}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    c.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                    c.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                  }`}>{c.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('profile.refNumber')}: {c.referenceNumber} | {c.vehiclePlate}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'fines' && (
        history.fines.length === 0 ? (
          <p className="text-sm text-gray-500">{t('profile.noFines')}</p>
        ) : (
          <div className="space-y-2">
            {history.fines.map((f) => (
              <div key={f.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{f.offenseType}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    f.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                    f.paymentStatus === 'DISPUTED' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>{f.paymentStatus}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
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