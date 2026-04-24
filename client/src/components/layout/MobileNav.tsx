'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const navItems = [
  { href: '/fares', labelKey: 'nav.fares' },
  { href: '/verify', labelKey: 'nav.verify' },
  { href: '/track', labelKey: 'nav.track' },
  { href: '/tickets', labelKey: 'nav.tickets' },
  { href: '/lost-found', labelKey: 'nav.lostFound' },
  { href: '/complaints', labelKey: 'nav.complaints' },
  { href: '/news', labelKey: 'nav.news' },
  { href: '/fines', labelKey: 'nav.fines' },
  { href: '/profile', labelKey: 'nav.profile' },
];

export function MobileNav({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-x-0 top-full border-b bg-white p-4 shadow-lg">
      <div className="mb-3 flex justify-end">
        <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm hover:bg-gray-100"
          >
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>
    </div>
  );
}