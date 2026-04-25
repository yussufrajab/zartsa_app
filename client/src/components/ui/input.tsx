import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium tracking-wide text-[#2e3f4c]">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a9baa] transition-colors group-focus-within:text-[#0a7c5c]">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'h-11 w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#0d1820] transition-all duration-200',
              'placeholder:text-[#8a9baa]',
              'focus:outline-none focus:border-[#0a7c5c] focus:ring-3 focus:ring-[#0a7c5c]/15',
              'hover:border-[#b0bcc5]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-11',
              error
                ? 'border-[#d4322c] focus:border-[#d4322c] focus:ring-[#d4322c]/15'
                : 'border-[#d4dadf]',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[#d4322c]">{error}</p>}
        {hint && !error && <p className="text-xs text-[#637885]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };