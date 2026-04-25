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
        <div className="flex h-16 items-center justify-between border-b border-[#eaeef0] px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#12a07a] to-[#0a7c5c] text-sm font-bold text-white shadow-md ring-1 ring-white/20 ring-inset">
              Z
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-[#0d1820]">ZARTSA<span className="text-[#0a7c5c]">.</span></span>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-[#8a9baa] transition-colors hover:bg-[#e6f4ef] hover:text-[#0a7c5c]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isAuthenticated && user && (
          <div className="border-b border-[#eaeef0] bg-gradient-to-br from-[#e6f4ef] to-[#f5f9f7] px-6 py-4">
            <p className="text-sm font-semibold text-[#0d1820]">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-[#637885]">{user.phone}</p>
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
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-gradient-to-r from-[#e6f4ef] to-[#e6f4ef]/40 text-[#0a7c5c] font-semibold'
                        : 'text-[#637885] hover:bg-[#f5f9f7] hover:text-[#2e3f4c]'
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

        <div className="absolute bottom-0 left-0 right-0 border-t border-[#eaeef0] p-4">
          <div className="h-[3px] rounded-full bg-gradient-to-r from-[#0a7c5c] via-[#c8730a] to-[#1a5f8a]" />
          {!isAuthenticated && (
            <Link
              href="/login"
              className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#637885] transition-colors hover:bg-[#e6f4ef] hover:text-[#0a7c5c]"
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