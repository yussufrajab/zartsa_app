'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wallet, Search, MapPin, Ticket, Package, FileText,
  Newspaper, Scale, User, LogIn, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';

const navItems = [
  { href: '/fares', label: 'Fares', icon: Wallet },
  { href: '/verify', label: 'Verify', icon: Search },
  { href: '/track', label: 'Track', icon: MapPin },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/lost-found', label: 'Lost & Found', icon: Package },
  { href: '/complaints', label: 'Complaints', icon: FileText },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/fines', label: 'Fines', icon: Scale },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:border-[#eaeef0] lg:bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-[#eaeef0] px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#12a07a] to-[#0a7c5c] text-sm font-bold text-white shadow-md ring-1 ring-white/20 ring-inset">
            Z
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-[#0d1820]">ZARTSA<span className="text-[#0a7c5c]">.</span></span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-gradient-to-r from-[#e6f4ef] to-[#e6f4ef]/40 text-[#0a7c5c] font-semibold relative after:absolute after:right-0 after:top-2 after:bottom-2 after:w-[3px] after:rounded-full after:bg-[#0a7c5c]'
                      : 'text-[#637885] hover:bg-[#f5f9f7] hover:text-[#2e3f4c]'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[#eaeef0] p-4">
        {!isAuthenticated && (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#637885] transition-colors hover:bg-[#e6f4ef] hover:text-[#0a7c5c]"
          >
            <LogIn className="h-5 w-5" />
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}