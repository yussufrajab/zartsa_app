'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wallet, Search, MapPin, Ticket, Package, FileText,
  Newspaper, Scale, User, LogIn, X,
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

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-drawer animate-slide-in-left">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
              Z
            </div>
            <span className="text-lg font-bold text-primary">ZARTSA</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isAuthenticated && user && (
          <div className="border-b border-slate-200 px-6 py-4">
            <p className="text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-slate-500">{user.phone}</p>
          </div>
        )}

        <nav className="overflow-y-auto px-3 py-4">
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
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
          <div className="h-1 rounded-full bg-gradient-to-r from-primary via-zartsa-gold to-primary" />
          {!isAuthenticated && (
            <Link
              href="/login"
              className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              <LogIn className="h-5 w-5" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}