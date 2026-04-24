'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Menu, Globe } from 'lucide-react';
import { useState } from 'react';
import { MobileNav } from './MobileNav';

export function Header() {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const next = i18n.language === 'sw' ? 'en' : 'sw';
    i18n.changeLanguage(next);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-zartsa-green">
          ZARTSA
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-gray-100"
          >
            <Globe className="h-4 w-4" />
            {i18n.language === 'sw' ? 'EN' : 'SW'}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {menuOpen && <MobileNav onClose={() => setMenuOpen(false)} />}
    </header>
  );
}