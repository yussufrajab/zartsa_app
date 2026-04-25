import { cn } from '@/lib/utils';

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label, className, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('flex items-center gap-3', className)}
      {...props}
    >
      <div
        className={cn(
          'relative h-6 w-12 rounded-full transition-colors duration-200',
          checked ? 'bg-gradient-to-r from-[#12a07a] to-[#0a7c5c] shadow-inner' : 'bg-[#d4dadf]'
        )}
      >
        <div
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-0'
          )}
        />
      </div>
      {label && <span className="text-sm font-medium text-[#2e3f4c]">{label}</span>}
    </button>
  );
}