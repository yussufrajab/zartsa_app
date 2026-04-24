'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { NewsCard } from '@/components/NewsCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { AnnouncementCategory } from '@zartsa/shared';
import { CATEGORIES } from '@zartsa/shared';

interface Announcement {
  id: string;
  titleSw: string;
  titleEn: string;
  contentSw: string;
  contentEn: string;
  category: AnnouncementCategory;
  publishedAt: string | null;
  sourceAuthority: string | null;
}

export default function NewsPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<AnnouncementCategory | ''>('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const params = category ? `?category=${category}` : '';
    api.get<{ data: { items: Announcement[] } }>(`/news${params}`)
      .then((res) => setAnnouncements(res.data.items))
      .catch(() => setAnnouncements([]))
      .finally(() => setIsLoading(false));
  }, [category]);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="rounded-md p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('news.title')}</h1>
      </div>

      {/* Category Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setCategory('')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!category ? 'bg-zartsa-green text-white' : 'bg-gray-100 text-gray-700'}`}>
          {t('news.allCategories')}
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${category === cat ? 'bg-zartsa-green text-white' : 'bg-gray-100 text-gray-700'}`}>
            {t(`news.categories.${cat}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-gray-500">{t('common.noResults')}</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <NewsCard key={a.id} {...a} />
          ))}
        </div>
      )}
    </div>
  );
}