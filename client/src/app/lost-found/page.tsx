'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { ITEM_CATEGORIES } from '@zartsa/shared';
import type { ItemCategory } from '@zartsa/shared';

interface FoundItem {
  id: string;
  description: string;
  category: ItemCategory;
  busNumber: string;
  route: string;
  foundDate: string;
  photoUrl: string | null;
  status: string;
  createdAt: string;
}

export default function LostFoundPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<FoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<ItemCategory | ''>('');
  const [route, setRoute] = useState('');

  const search = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (category) params.set('category', category);
      if (route) params.set('route', route);
      const res = await api.get<{ data: { items: FoundItem[] } }>(`/lost-found/found?${params}`);
      setItems(res.data.items);
    } catch { setItems([]); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { search(); }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold">{t('lostFound.title')}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/lost-found/report-lost" className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white">{t('lostFound.reportLost')}</Link>
          <Link href="/lost-found/report-found" className="rounded-md bg-zartsa-green px-3 py-1.5 text-xs text-white">{t('lostFound.reportFound')}</Link>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t('lostFound.searchPlaceholder')} className="w-full rounded-md border px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory | '')} className="flex-1 rounded-md border px-3 py-2 text-sm">
            <option value="">{t('lostFound.allCategories')}</option>
            {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{t(`lostFound.categories.${c}`)}</option>)}
          </select>
          <button onClick={search} className="flex items-center gap-1 rounded-md bg-zartsa-green px-3 py-2 text-sm text-white">
            <Search className="h-4 w-4" /> {t('common.search')}
          </button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-gray-500">{t('common.loading')}</p> :
       items.length === 0 ? <p className="text-sm text-gray-500">{t('common.noResults')}</p> :
       <div className="space-y-2">
         {items.map(item => (
           <Link key={item.id} href={`/lost-found/item/${item.id}`} className="block rounded-lg border p-3 hover:bg-gray-50">
             <div className="flex justify-between">
               <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">{item.category}</span>
               <span className="text-xs text-gray-400">{new Date(item.foundDate).toLocaleDateString()}</span>
             </div>
             <p className="mt-1 text-sm">{item.description.slice(0, 100)}</p>
             <p className="mt-1 text-xs text-gray-500">{t('lostFound.route')}: {item.route} · {t('lostFound.bus')}: {item.busNumber}</p>
           </Link>
         ))}
       </div>
      }
    </div>
  );
}