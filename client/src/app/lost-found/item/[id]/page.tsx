'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ItemCategory, ItemStatus } from '@zartsa/shared';

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

  if (isLoading) return <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>;
  if (!item) return <p className="p-4 text-sm text-gray-500">{t('common.noResults')}</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/lost-found" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('lostFound.title')}</h1>
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            {t(`lostFound.categories.${item.category}`)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.status === 'CLAIMED' ? 'bg-blue-100 text-blue-800' :
            item.status === 'MATCHED' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {item.status}
          </span>
        </div>

        {item.photoUrl && (
          <div className="mb-3">
            <img src={item.photoUrl} alt="Found item" className="h-48 w-full rounded-md object-cover" />
          </div>
        )}

        <p className="mb-3 text-sm">{item.description}</p>

        <div className="space-y-1 text-xs text-gray-500">
          <p>{t('lostFound.route')}: {item.route}</p>
          <p>{t('lostFound.busNumber')}: {item.busNumber}</p>
          <p>{t('lostFound.foundDate')}: {new Date(item.foundDate).toLocaleDateString()}</p>
        </div>

        {item.status === 'FOUND' && isAuthenticated && (
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="mt-4 w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isClaiming ? t('common.loading') : t('lostFound.claim')}
          </button>
        )}
      </div>
    </div>
  );
}