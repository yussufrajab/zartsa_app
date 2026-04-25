'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  Wallet, Search, MapPin, Ticket, Package, FileText,
  Newspaper, Scale, User,
} from 'lucide-react';

const modules = [
  { href: '/fares', labelKey: 'nav.fares', icon: Wallet, color: 'from-[#12a07a] to-[#0a7c5c]', accent: 'from-[#0a7c5c] to-[#12a07a]', bg: 'from-[#e6f4ef] to-[#d0ecdf]', text: 'text-[#0a7c5c]', hoverText: 'group-hover:text-white' },
  { href: '/verify', labelKey: 'nav.verify', icon: Search, color: 'from-[#2d7ab0] to-[#1a5f8a]', accent: 'from-[#1a5f8a] to-[#2d7ab0]', bg: 'from-[#e4f0f8] to-[#cfe2f0]', text: 'text-[#1a5f8a]', hoverText: 'group-hover:text-white' },
  { href: '/track', labelKey: 'nav.track', icon: MapPin, color: 'from-[#12a07a] to-[#0a7c5c]', accent: 'from-[#0a7c5c] to-[#12a07a]', bg: 'from-[#e6f4ef] to-[#d0ecdf]', text: 'text-[#0a7c5c]', hoverText: 'group-hover:text-white' },
  { href: '/tickets', labelKey: 'nav.tickets', icon: Ticket, color: 'from-[#f0a23a] to-[#c8730a]', accent: 'from-[#c8730a] to-[#f0a23a]', bg: 'from-[#fef3e2] to-[#fce5c0]', text: 'text-[#c8730a]', hoverText: 'group-hover:text-white' },
  { href: '/lost-found', labelKey: 'nav.lostFound', icon: Package, color: 'from-[#2d7ab0] to-[#1a5f8a]', accent: 'from-[#1a5f8a] to-[#2d7ab0]', bg: 'from-[#e4f0f8] to-[#cfe2f0]', text: 'text-[#1a5f8a]', hoverText: 'group-hover:text-white' },
  { href: '/complaints', labelKey: 'nav.complaints', icon: FileText, color: 'from-[#f0a23a] to-[#c8730a]', accent: 'from-[#c8730a] to-[#f0a23a]', bg: 'from-[#fef3e2] to-[#fce5c0]', text: 'text-[#c8730a]', hoverText: 'group-hover:text-white' },
  { href: '/news', labelKey: 'nav.news', icon: Newspaper, color: 'from-[#12a07a] to-[#0a7c5c]', accent: 'from-[#0a7c5c] to-[#12a07a]', bg: 'from-[#e6f4ef] to-[#d0ecdf]', text: 'text-[#0a7c5c]', hoverText: 'group-hover:text-white' },
  { href: '/fines', labelKey: 'nav.fines', icon: Scale, color: 'from-[#f0a23a] to-[#c8730a]', accent: 'from-[#c8730a] to-[#f0a23a]', bg: 'from-[#fef3e2] to-[#fce5c0]', text: 'text-[#c8730a]', hoverText: 'group-hover:text-white' },
  { href: '/profile', labelKey: 'nav.profile', icon: User, color: 'from-[#2d7ab0] to-[#1a5f8a]', accent: 'from-[#1a5f8a] to-[#2d7ab0]', bg: 'from-[#e4f0f8] to-[#cfe2f0]', text: 'text-[#1a5f8a]', hoverText: 'group-hover:text-white' },
];

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a7c5c] via-[#0d9068] to-[#085a43] px-4 py-12 pb-16 text-white">
        {/* Decorative blurred circles */}
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-[#c8730a]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#1a5f8a]/15 blur-2xl pointer-events-none" />

        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0L60 30L30 60L0 30Z\' fill=\'none\' stroke=\'white\' stroke-width=\'0.5\'/%3E%3C/svg%3E")', backgroundSize: '60px 60px' }} />

        {/* Wave SVG */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 1440 120" fill="none">
            <path d="M0 64L48 58.7C96 53 192 43 288 48C384 53 480 75 576 80C672 85 768 75 864 64C960 53 1056 43 1152 42.7C1248 43 1344 53 1392 58.7L1440 64V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V64Z" fill="currentColor" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-widest text-white uppercase backdrop-blur-sm border border-white/20">
            ✦ ZARTSA · Zanzibar
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">{t('app.name')}</h1>
          <p className="mt-3 text-[#a7e6cf] text-base md:text-lg max-w-md mx-auto leading-relaxed">{t('app.tagline')}</p>
        </div>
      </section>

      {/* Module Grid */}
      <section className="relative mx-auto max-w-5xl px-4 -mt-8 z-10 pb-8">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-3">
          {modules.map((m, index) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href} className="group">
                <div
                  className="relative overflow-hidden rounded-2xl bg-white border border-[#d4dadf]/50 p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(10,124,92,0.16)] hover:border-[#0a7c5c]/20 animate-fade-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* Accent top bar */}
                  <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${m.accent}`} />

                  {/* Icon container */}
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${m.bg} ${m.text} transition-all duration-300 group-hover:bg-gradient-to-br group-hover:${m.color} group-hover:text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-display text-base font-semibold text-[#0d1820]">{t(m.labelKey)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}