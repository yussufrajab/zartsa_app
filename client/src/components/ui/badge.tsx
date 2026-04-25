import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors',
  {
    variants: {
      variant: {
        success: 'bg-[#e6f4ef] text-[#0a7c5c] ring-1 ring-[#0a7c5c]/20',
        error: 'bg-[#fce8e7] text-[#d4322c] ring-1 ring-[#d4322c]/20',
        warning: 'bg-[#fef3e2] text-[#c8730a] ring-1 ring-[#c8730a]/20',
        info: 'bg-[#e4f0f8] text-[#1a5f8a] ring-1 ring-[#1a5f8a]/20',
        neutral: 'bg-[#eaeef0] text-[#475a68] ring-1 ring-[#b0bcc5]/30',
        gold: 'bg-[#fef3e2] text-[#c8730a] ring-1 ring-[#c8730a]/20',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };