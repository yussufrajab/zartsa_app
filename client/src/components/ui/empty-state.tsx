import { cn } from '@/lib/utils';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#e6f4ef] to-[#d0ecdf] text-[#0a7c5c]">
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl font-semibold text-[#2e3f4c]">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-sm text-[#637885] leading-relaxed">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}