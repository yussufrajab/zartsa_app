'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NotificationBell } from '../NotificationBell';
import { MobileDrawer } from './mobile-drawer';

export function Header() {
  const { i18n } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleLanguage = () => {
    const next = i18n.language === 'sw' ? 'en' : 'sw';
    i18n.changeLanguage(next);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold shadow-sm">
                Z
              </div>
              <span className="text-xl font-bold text-primary hidden sm:inline">ZARTSA</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Globe className="h-4 w-4" />
              {i18n.language === 'sw' ? 'EN' : 'SW'}
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}