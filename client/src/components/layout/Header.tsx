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
      <header className="sticky top-0 z-40 h-16 border-b border-[#d4dadf]/50 bg-white/90 backdrop-blur-xl shadow-[0_1px_0_rgba(10,124,92,0.06)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl p-2 text-[#637885] transition-colors hover:bg-[#e6f4ef] hover:text-[#0a7c5c] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#12a07a] to-[#0a7c5c] text-base font-bold text-white shadow-md ring-1 ring-white/20 ring-inset">
                Z
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-[#0d1820] hidden sm:inline">ZARTSA<span className="text-[#0a7c5c]">.</span></span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={toggleLanguage}
              className="rounded-full border border-[#d4dadf] px-3 py-1.5 text-xs font-bold tracking-widest text-[#475a68] transition-all hover:border-[#0a7c5c] hover:text-[#0a7c5c]"
            >
              <Globe className="mr-1.5 inline h-3.5 w-3.5" />
              {i18n.language === 'sw' ? 'EN' : 'SW'}
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}