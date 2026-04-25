import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'bg-white rounded-2xl border border-[#d4dadf]/60 transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'shadow-card',
        interactive: 'shadow-card hover:shadow-card-hover hover:-translate-y-1 hover:border-[#0a7c5c]/20 cursor-pointer',
        gradient: 'shadow-card overflow-hidden',
      },
      size: {
        compact: 'p-4',
        default: 'p-5',
        spacious: 'p-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  accentColor?: 'green' | 'gold' | 'blue' | 'red';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, accentColor, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, className }))}
      {...props}
    >
      {accentColor && variant === 'gradient' && (
        <div
          className={cn(
            'h-[3px] w-full',
            accentColor === 'green' && 'bg-gradient-to-r from-[#0a7c5c] to-[#12a07a]',
            accentColor === 'gold' && 'bg-gradient-to-r from-[#c8730a] to-[#f0a23a]',
            accentColor === 'blue' && 'bg-gradient-to-r from-[#1a5f8a] to-[#2d7ab0]',
            accentColor === 'red' && 'bg-gradient-to-r from-[#d4322c] to-[#e8433d]'
          )}
        />
      )}
      {children}
    </div>
  )
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-3 flex items-center justify-between', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-base font-semibold leading-snug text-[#0d1820]', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-[#637885] leading-relaxed', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mt-4 flex items-center gap-2', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };