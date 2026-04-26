'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import type { ItemCategory, ItemStatus } from '@zartsa/shared';
import { PageHeader } from '@/components/ui/page-header';

interface FoundItem {
  id: string;
  reportedBy: string;
  description: string;
  category: ItemCategory;
  busNumber: string;
  route: string;
  foundDate: string;
  photoUrl: string | null;
  status: ItemStatus;
  claimedBy: string | null;
  createdAt: string;
}

export default function FoundItemDetailPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<FoundItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    async function fetchItem() {
      try {
        const res = await api.get<{ data: FoundItem }>(`/lost-found/found/${id}`);
        setItem(res.data);
      } catch { setItem(null); }
      finally { setIsLoading(false); }
    }
    fetchItem();
  }, [id]);

  const handleClaim = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setIsClaiming(true);
    try {
      await api.post(`/lost-found/found/${id}/claim`, {});
      setItem(prev => prev ? { ...prev, status: 'CLAIMED' as ItemStatus } : null);
    } catch { alert('Failed to claim item'); }
    finally { setIsClaiming(false); }
  };

  if (isLoading) return <p className="p-4 text-sm text-[#637885]">{t('common.loading')}</p>;
  if (!item) return <p className="p-4 text-sm text-[#637885]">{t('common.noResults')}</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
      <PageHeader title={t('lostFound.title')} backHref="/lost-found" />

      <div className="rounded-2xl border border-[#d4dadf] p-4 shadow-[0_2px_8px_rgba(10,124,92,0.07)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            {t(`lostFound.categories.${item.category}`)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.status === 'CLAIMED' ? 'bg-blue-100 text-blue-800' :
            item.status === 'MATCHED' ? 'bg-yellow-100 text-yellow-800' :
            'bg-[#eaeef0] text-[#2e3f4c]'
          }`}>
            {item.status}
          </span>
        </div>

        {item.photoUrl && (
          <div className="mb-3">
            <Image src={item.photoUrl} alt="Found item" width={512} height={192} className="h-48 w-full rounded-md object-cover" />
          </div>
        )}

        <p className="mb-3 text-sm">{item.description}</p>

        <div className="space-y-1 text-xs text-[#637885]">
          <p>{t('lostFound.route')}: {item.route}</p>
          <p>{t('lostFound.busNumber')}: {item.busNumber}</p>
          <p>{t('lostFound.foundDate')}: {new Date(item.foundDate).toLocaleDateString()}</p>
        </div>

        {item.status === 'FOUND' && isAuthenticated && (
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="mt-4 w-full rounded-md bg-[#0a7c5c] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isClaiming ? t('common.loading') : t('lostFound.claim')}
          </button>
        )}
      </div>
    </div>
  );
}