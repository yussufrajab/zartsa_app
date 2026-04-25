'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { NewsCard } from '@/components/NewsCard';
import type { AnnouncementCategory } from '@zartsa/shared';
import { CATEGORIES } from '@zartsa/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('news.title')} backHref="/" />

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setCategory('')}
          className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
            !category ? 'bg-[#0a7c5c] text-white' : 'text-[#637885] hover:text-[#2e3f4c] hover:bg-[#e6f4ef]')}>
          {t('news.allCategories')}
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              category === cat ? 'bg-[#0a7c5c] text-white' : 'text-[#637885] hover:text-[#2e3f4c] hover:bg-[#e6f4ef]')}>
            {t(`news.categories.${cat}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : announcements.length === 0 ? (
        <p className="text-sm text-[#637885]">{t('common.noResults')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {announcements.map((a) => (
            <NewsCard key={a.id} {...a} />
          ))}
        </div>
      )}
    </div>
  );
}