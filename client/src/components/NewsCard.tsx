'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/utils';
import { Badge } from './ui/badge';

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

const CATEGORY_COLORS: Record<string, 'warning' | 'error' | 'info' | 'neutral' | 'gold'> = {
  FARE_ADJUSTMENT: 'gold',
  ROAD_CLOSURE: 'error',
  SCHEDULE_CHANGE: 'info',
  REGULATORY_UPDATE: 'neutral',
  GENERAL_NOTICE: 'neutral',
};

const CATEGORY_GRADIENT: Record<string, string> = {
  FARE_ADJUSTMENT: 'bg-gradient-to-r from-[#c8730a] to-[#f0a23a]',
  ROAD_CLOSURE: 'bg-gradient-to-r from-[#d4322c] to-[#e8433d]',
  SCHEDULE_CHANGE: 'bg-gradient-to-r from-[#1a5f8a] to-[#2d7ab0]',
  REGULATORY_UPDATE: 'bg-gradient-to-r from-[#475a68] to-[#637885]',
  GENERAL_NOTICE: 'bg-gradient-to-r from-[#637885] to-[#8a9baa]',
};

export function NewsCard({ id, titleSw, titleEn, contentSw, contentEn, category, publishedAt, sourceAuthority }: NewsCardProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'sw' | 'en';
  const title = lang === 'sw' ? titleSw : titleEn;
  const content = lang === 'sw' ? contentSw : contentEn;
  const badgeVariant = CATEGORY_COLORS[category] || 'neutral';
  const gradientClass = CATEGORY_GRADIENT[category] || 'bg-gradient-to-r from-[#637885] to-[#8a9baa]';

  return (
    <Link href={`/news/${id}`} className="group block">
      <div className="group rounded-2xl bg-white border border-[#d4dadf]/50 overflow-hidden hover:shadow-[0_8px_32px_rgba(10,124,92,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer">
        <div className={`h-[3px] w-full ${gradientClass}`} />
        <div className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={badgeVariant}>{category.replace(/_/g, ' ')}</Badge>
            {publishedAt && (
              <span className="text-[10px] font-bold tracking-widest text-[#8a9baa] uppercase">{formatDate(publishedAt, lang)}</span>
            )}
          </div>
          <h3 className="font-display text-base font-semibold text-[#0d1820] mt-1.5 leading-snug line-clamp-2 group-hover:text-[#0a7c5c] transition-colors">
            {title}
          </h3>
          <p className="mt-1.5 text-sm text-[#637885] leading-relaxed line-clamp-2">{content}</p>
          {sourceAuthority && (
            <p className="mt-2 text-xs text-[#8a9baa]">{sourceAuthority}</p>
          )}
        </div>
      </div>
    </Link>
  );
}