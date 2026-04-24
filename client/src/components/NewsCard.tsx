'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/utils';

interface NewsCardProps {
  id: string;
  titleSw: string;
  titleEn: string;
  contentSw: string;
  contentEn: string;
  category: string;
  publishedAt: string | null;
  sourceAuthority: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  FARE_ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
  ROAD_CLOSURE: 'bg-red-100 text-red-800',
  SCHEDULE_CHANGE: 'bg-blue-100 text-blue-800',
  REGULATORY_UPDATE: 'bg-purple-100 text-purple-800',
  GENERAL_NOTICE: 'bg-gray-100 text-gray-800',
};

export function NewsCard({ id, titleSw, titleEn, contentSw, contentEn, category, publishedAt, sourceAuthority }: NewsCardProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'sw' | 'en';
  const title = lang === 'sw' ? titleSw : titleEn;
  const content = lang === 'sw' ? contentSw : contentEn;
  const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800';

  return (
    <Link href={`/news/${id}`} className="block">
      <div className="rounded-lg border p-4 transition-colors hover:bg-gray-50">
        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
            {category.replace(/_/g, ' ')}
          </span>
          {publishedAt && (
            <span className="text-xs text-gray-400">{formatDate(publishedAt, lang)}</span>
          )}
        </div>
        <h3 className="mb-1 font-semibold">{title}</h3>
        <p className="line-clamp-2 text-sm text-gray-600">{content}</p>
        {sourceAuthority && (
          <p className="mt-1 text-xs text-gray-400">{sourceAuthority}</p>
        )}
      </div>
    </Link>
  );
}