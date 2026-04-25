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
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:border-slate-200 lg:bg-slate-50">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            Z
          </div>
          <span className="text-lg font-bold text-primary">ZARTSA</span>
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
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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

      <div className="border-t border-slate-200 p-4">
        {!isAuthenticated && (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogIn className="h-5 w-5" />
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}