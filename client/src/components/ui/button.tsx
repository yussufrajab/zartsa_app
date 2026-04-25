import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0a7c5c]/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-b from-[#12a07a] to-[#0a7c5c] text-white shadow-md hover:shadow-lg hover:from-[#14b088] hover:to-[#0d9068] active:shadow-sm border border-[#0a7c5c]/20',
        gold:
          'bg-gradient-to-b from-[#f0a23a] to-[#c8730a] text-white shadow-md hover:shadow-lg hover:from-[#f5ae4d] hover:to-[#d97f12] active:shadow-sm border border-[#c8730a]/20',
        outline:
          'border-2 border-[#0a7c5c] text-[#0a7c5c] bg-transparent hover:bg-[#e6f4ef]',
        ghost:
          'text-[#0a7c5c] bg-transparent hover:bg-[#e6f4ef]',
        danger:
          'bg-gradient-to-b from-[#e8433d] to-[#d4322c] text-white shadow-md hover:shadow-lg active:shadow-sm border border-[#d4322c]/20',
      },
      size: {
        sm: 'h-8 px-4 text-xs rounded-lg',
        md: 'h-10 px-5 text-sm rounded-xl',
        lg: 'h-12 px-7 text-base rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };