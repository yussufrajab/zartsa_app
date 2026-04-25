import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, backHref, action, className }: PageHeaderProps) {
  return (
    <div className={cn('relative mb-8 pl-4', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl text-[#637885] transition-colors hover:bg-[#e6f4ef] hover:text-[#0a7c5c] -ml-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <div className="absolute -left-0 top-1 h-6 w-1 rounded-full bg-gradient-to-b from-[#12a07a] to-[#0a7c5c]" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0d1820] leading-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-[#637885] leading-relaxed">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}