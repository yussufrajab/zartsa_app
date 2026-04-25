'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  Wallet, Search, MapPin, Ticket, Package, FileText,
  Newspaper, Scale, User,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const modules = [
  { href: '/fares', labelKey: 'nav.fares', icon: Wallet, color: 'green' as const },
  { href: '/verify', labelKey: 'nav.verify', icon: Search, color: 'blue' as const },
  { href: '/track', labelKey: 'nav.track', icon: MapPin, color: 'green' as const },
  { href: '/tickets', labelKey: 'nav.tickets', icon: Ticket, color: 'gold' as const },
  { href: '/lost-found', labelKey: 'nav.lostFound', icon: Package, color: 'blue' as const },
  { href: '/complaints', labelKey: 'nav.complaints', icon: FileText, color: 'gold' as const },
  { href: '/news', labelKey: 'nav.news', icon: Newspaper, color: 'green' as const },
  { href: '/fines', labelKey: 'nav.fines', icon: Scale, color: 'gold' as const },
  { href: '/profile', labelKey: 'nav.profile', icon: User, color: 'blue' as const },
];

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary to-primary-900 px-4 py-12 pb-16 text-white">
        <div className="absolute inset-0 opacity-10">
          <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 1440 120" fill="none">
            <path d="M0 64L48 58.7C96 53 192 43 288 48C384 53 480 75 576 80C672 85 768 75 864 64C960 53 1056 43 1152 42.7C1248 43 1344 53 1392 58.7L1440 64V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V64Z" fill="currentColor" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-5xl text-center">
          <h1 className="text-3xl font-bold md:text-4xl">{t('app.name')}</h1>
          <p className="mt-2 text-primary-100">{t('app.tagline')}</p>
        </div>
      </section>

      {/* Module Grid */}
      <section className="mx-auto max-w-5xl px-4 -mt-8 relative z-10 pb-8">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href}>
                <Card variant="gradient" accentColor={m.color} size="compact" className="flex flex-col items-center gap-1.5 py-4">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium text-slate-700">{t(m.labelKey)}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}