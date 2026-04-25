'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { Search, PlusCircle } from 'lucide-react';
import { ITEM_CATEGORIES } from '@zartsa/shared';
import type { ItemCategory } from '@zartsa/shared';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ListSkeleton } from '@/components/ui/skeleton';

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
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('lostFound.title')} backHref="/" action={
        <div className="flex gap-2">
          <Link href="/lost-found/report-lost">
            <Button variant="outline" size="sm">{t('lostFound.reportLost')}</Button>
          </Link>
          <Link href="/lost-found/report-found">
            <Button variant="primary" size="sm">{t('lostFound.reportFound')}</Button>
          </Link>
        </div>
      } />

      <Card size="default" className="mb-6">
        <div className="space-y-3 md:flex md:items-end md:gap-3 md:space-y-0">
          <div className="flex-1">
            <Input icon={<Search className="h-4 w-4" />} value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('lostFound.searchPlaceholder')} />
          </div>
          <div className="flex-1">
            <Select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory | '')}
              options={ITEM_CATEGORIES.map(c => ({ value: c, label: t(`lostFound.categories.${c}`) }))}
              placeholder={t('lostFound.allCategories')} />
          </div>
          <Button onClick={search} className="w-full md:w-auto">
            <Search className="h-4 w-4" /> {t('common.search')}
          </Button>
        </div>
      </Card>

      {isLoading ? <ListSkeleton count={4} /> :
       items.length === 0 ? <p className="text-sm text-slate-500">{t('common.noResults')}</p> :
       <div className="grid gap-3 md:grid-cols-2">
         {items.map(item => (
           <Link key={item.id} href={`/lost-found/item/${item.id}`}>
             <Card variant="interactive" size="compact">
               <div className="flex items-center justify-between">
                 <Badge variant="success">{item.category}</Badge>
                 <span className="text-xs text-slate-400">{new Date(item.foundDate).toLocaleDateString()}</span>
               </div>
               <p className="mt-2 text-sm text-slate-700 line-clamp-2">{item.description.slice(0, 100)}</p>
               <p className="mt-1 text-xs text-slate-500">{t('lostFound.route')}: {item.route} &middot; {t('lostFound.bus')}: {item.busNumber}</p>
             </Card>
           </Link>
         ))}
       </div>
      }
    </div>
  );
}