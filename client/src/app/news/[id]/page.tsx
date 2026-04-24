'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  FARE_ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
  ROAD_CLOSURE: 'bg-red-100 text-red-800',
  SCHEDULE_CHANGE: 'bg-blue-100 text-blue-800',
  REGULATORY_UPDATE: 'bg-purple-100 text-purple-800',
  GENERAL_NOTICE: 'bg-gray-100 text-gray-800',
};

export default function NewsDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const [announcement, setAnnouncement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: any }>(`/news/${id}`)
      .then((res) => setAnnouncement(res.data))
      .catch(() => setAnnouncement(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>;
  if (!announcement) return <p className="p-4 text-sm text-gray-500">{t('news.notFound')}</p>;

  const lang = i18n.language as 'sw' | 'en';
  const title = lang === 'sw' ? announcement.titleSw : announcement.titleEn;
  const content = lang === 'sw' ? announcement.contentSw : announcement.contentEn;
  const colorClass = CATEGORY_COLORS[announcement.category] || 'bg-gray-100 text-gray-800';

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link href="/news" className="mb-4 flex items-center gap-1 text-sm text-zartsa-green hover:underline">
        <ArrowLeft className="h-4 w-4" />
        {t('news.backToList')}
      </Link>

      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
          {t(`news.categories.${announcement.category}`)}
        </span>
        {announcement.publishedAt && (
          <span className="text-xs text-gray-400">{formatDate(announcement.publishedAt, lang)}</span>
        )}
      </div>

      <h1 className="mb-4 text-xl font-bold">{title}</h1>
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />

      {announcement.sourceAuthority && (
        <p className="mt-4 text-xs text-gray-400">{t('news.source')}: {announcement.sourceAuthority}</p>
      )}
    </div>
  );
}