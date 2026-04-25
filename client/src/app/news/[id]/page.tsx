'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { formatDate } from '@/lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  FARE_ADJUSTMENT: 'bg-[#fef3e2] text-[#c8730a]',
  ROAD_CLOSURE: 'bg-red-50 text-red-700',
  SCHEDULE_CHANGE: 'bg-[#e4f0f8] text-[#1a5f8a]',
  REGULATORY_UPDATE: 'bg-purple-50 text-purple-700',
  GENERAL_NOTICE: 'bg-[#eaeef0] text-[#2e3f4c]',
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

  if (isLoading) return <p className="p-4 text-sm text-[#637885]">{t('common.loading')}</p>;
  if (!announcement) return <p className="p-4 text-sm text-[#637885]">{t('news.notFound')}</p>;

  const lang = i18n.language as 'sw' | 'en';
  const title = lang === 'sw' ? announcement.titleSw : announcement.titleEn;
  const content = lang === 'sw' ? announcement.contentSw : announcement.contentEn;
  const colorClass = CATEGORY_COLORS[announcement.category] || 'bg-[#eaeef0] text-[#2e3f4c]';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={title} backHref="/news" />

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${colorClass}`}>
            {t(`news.categories.${announcement.category}`)}
          </span>
          {announcement.publishedAt && (
            <span className="text-xs text-[#637885]">{formatDate(announcement.publishedAt, lang)}</span>
          )}
        </div>

        <div className="prose prose-sm max-w-none text-[#0d1820]" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />

        {announcement.sourceAuthority && (
          <p className="mt-6 text-xs text-[#637885]">{t('news.source')}: {announcement.sourceAuthority}</p>
        )}
      </div>
    </div>
  );
}