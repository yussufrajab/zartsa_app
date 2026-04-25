import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'avatar' | 'image';
}

export function Skeleton({ variant = 'text', className, ...props }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-3/4 rounded',
    card: 'h-32 w-full rounded-xl',
    avatar: 'h-10 w-10 rounded-full',
    image: 'h-48 w-full rounded-lg',
  };

  return (
    <div
      className={cn('skeleton-shimmer', variantClasses[variant], className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 h-4 w-1/3 rounded skeleton-shimmer" />
      <div className="mb-2 h-3 w-full rounded skeleton-shimmer" />
      <div className="h-3 w-2/3 rounded skeleton-shimmer" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}