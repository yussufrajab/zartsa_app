'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const modules = [
  { href: '/fares', labelKey: 'nav.fares', icon: '💰' },
  { href: '/verify', labelKey: 'nav.verify', icon: '🔍' },
  { href: '/track', labelKey: 'nav.track', icon: '🚌' },
  { href: '/tickets', labelKey: 'nav.tickets', icon: '🎫' },
  { href: '/lost-found', labelKey: 'nav.lostFound', icon: '📦' },
  { href: '/complaints', labelKey: 'nav.complaints', icon: '📝' },
  { href: '/news', labelKey: 'nav.news', icon: '📰' },
  { href: '/fines', labelKey: 'nav.fines', icon: '⚖️' },
  { href: '/profile', labelKey: 'nav.profile', icon: '👤' },
];

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zartsa-green">{t('app.name')}</h1>
        <p className="text-sm text-gray-600">{t('app.tagline')}</p>
      </header>

      <nav className="grid grid-cols-3 gap-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors hover:bg-gray-50"
          >
            <span className="text-2xl">{m.icon}</span>
            <span className="text-xs font-medium">{t(m.labelKey)}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}