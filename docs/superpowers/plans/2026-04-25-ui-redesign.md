# ZARTSA UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain white mobile-only UI with a bold, energetic design system and responsive layout across all pages.

**Architecture:** Build a component library (Button, Card, Badge, Input, Select, PageHeader, EmptyState, Skeleton, Toggle, OtpInput) in `client/src/components/ui/`, then rewrite the navigation shell (Header, Sidebar, MobileDrawer, Footer) to be responsive, then restyle every page using these components. The theme uses zartsa-green + gold palette on slate neutrals with micro-interactions. All existing functionality is preserved — only visual and structural changes.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript, class-variance-authority, clsx + tailwind-merge (cn), @radix-ui/react-slot, sonner, react-hook-form + zod, lucide-react

---

## File Structure

### New files
```
client/src/components/ui/button.tsx       — Button with variants (primary/gold/outline/ghost/danger)
client/src/components/ui/card.tsx         — Card with variants (default/interactive/gradient)
client/src/components/ui/badge.tsx        — Badge with semantic color variants
client/src/components/ui/input.tsx        — Form input with label/error/icon
client/src/components/ui/select.tsx       — Select matching Input style
client/src/components/ui/page-header.tsx  — Consistent page header with back arrow
client/src/components/ui/empty-state.tsx  — Empty/loading/error state placeholder
client/src/components/ui/skeleton.tsx    — Shimmer loading placeholder
client/src/components/ui/toggle.tsx      — Toggle switch for preferences
client/src/components/ui/otp-input.tsx    — 6-digit OTP input for auth
client/src/components/layout/sidebar.tsx  — Desktop sidebar navigation
client/src/components/layout/mobile-drawer.tsx — Mobile slide-in drawer
```

### Modified files
```
client/tailwind.config.ts                 — Extended palette, animations, custom shadows
client/src/app/globals.css                — CSS variables, keyframes, base styles
client/src/app/layout.tsx                 — Responsive sidebar logic, Toaster provider
client/src/app/page.tsx                   — Home page redesign (hero + grid)
client/src/app/(auth)/login/page.tsx      — Auth redesign with Card + OtpInput + toast
client/src/app/(auth)/register/page.tsx    — Auth redesign with Card + OtpInput + toast
client/src/app/fares/page.tsx             — Fares redesign with components
client/src/app/track/page.tsx             — Track redesign with responsive layout
client/src/app/verify/page.tsx            — Verify redesign with components
client/src/app/lost-found/page.tsx        — Lost & Found redesign
client/src/app/lost-found/item/[id]/page.tsx — Item detail redesign
client/src/app/lost-found/report-lost/page.tsx — Report form redesign
client/src/app/lost-found/report-found/page.tsx — Report form redesign
client/src/app/news/page.tsx              — News list redesign
client/src/app/news/[id]/page.tsx          — News detail redesign
client/src/app/news/admin/page.tsx        — News admin redesign
client/src/app/notifications/page.tsx      — Notifications redesign
client/src/app/notifications/preferences/page.tsx — Preferences redesign
client/src/app/profile/page.tsx           — Profile redesign
client/src/app/profile/profile-form.tsx   — Profile form redesign
client/src/app/profile/dashboard-tabs.tsx — Dashboard tabs redesign
client/src/app/profile/saved-routes.tsx   — Saved routes redesign
client/src/app/profile/delete-account.tsx  — Delete account redesign
client/src/app/complaints/page.tsx        — Placeholder with EmptyState
client/src/app/fines/page.tsx             — Placeholder with EmptyState
client/src/app/tickets/page.tsx           — Placeholder with EmptyState
client/src/components/layout/header.tsx   — Rewritten responsive header
client/src/components/layout/footer.tsx   — Upgraded footer
client/src/components/layout/mobile-nav.tsx — Removed (replaced by mobile-drawer)
client/src/components/news-card.tsx        — Upgraded with Card component
client/src/components/notification-bell.tsx — Upgraded with Badge component
client/src/lib/utils.ts                    — Ensure cn() is exported and used
```

---

### Task 1: Theme — Tailwind Config + Global CSS

**Files:**
- Modify: `client/tailwind.config.ts`
- Modify: `client/src/app/globals.css`

- [ ] **Step 1: Update tailwind.config.ts with full palette and animations**

```ts
// client/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        zartsa: {
          green: '#059669',
          blue: '#1d4ed8',
          gold: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-out-left': 'slideOutLeft 0.3s ease-in',
        'fade-in': 'fadeIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'glow': '0 0 0 3px rgb(5 150 105 / 0.3)',
        'drawer': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Update globals.css with CSS variables and base styles**

```css
/* client/src/app/globals.css */
@import "tailwindcss";
@config "../../tailwind.config.ts";

:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --primary: #059669;
  --primary-foreground: #ffffff;
  --accent: #d97706;
  --accent-foreground: #ffffff;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --border: #e2e8f0;
  --ring: #059669;
  --radius: 0.75rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0f172a;
    --foreground: #f8fafc;
    --card: #1e293b;
    --card-foreground: #f8fafc;
    --primary: #34d399;
    --primary-foreground: #0f172a;
    --accent: #fbbf24;
    --accent-foreground: #0f172a;
    --muted: #1e293b;
    --muted-foreground: #94a3b8;
    --border: #334155;
    --ring: #34d399;
  }
}

* {
  border-color: var(--border);
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Focus ring style */
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Skeleton shimmer */
.skeleton-shimmer {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite linear;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

- [ ] **Step 3: Verify the app still builds**

Run: `cd /home/yusuf/zartsa/client && npx next build 2>&1 | tail -20`
Expected: Build completes without errors

- [ ] **Step 4: Commit**

```bash
git add client/tailwind.config.ts client/src/app/globals.css
git commit -m "feat: update theme with full color palette, animations, and CSS variables"
```

---

### Task 2: UI Components — Button, Card, Badge

**Files:**
- Create: `client/src/components/ui/button.tsx`
- Create: `client/src/components/ui/card.tsx`
- Create: `client/src/components/ui/badge.tsx`

- [ ] **Step 1: Create Button component**

```tsx
// client/src/components/ui/button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-sm hover:opacity-90',
        gold: 'bg-zartsa-gold text-white shadow-sm hover:opacity-90',
        outline: 'border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white',
        ghost: 'text-primary hover:bg-primary/10',
        danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
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
```

- [ ] **Step 2: Create Card component**

```tsx
// client/src/components/ui/card.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-xl border border-slate-200 bg-white text-slate-900 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'shadow-card',
        interactive: 'shadow-card hover:shadow-card-hover hover:scale-[1.02] cursor-pointer',
        gradient: 'shadow-card overflow-hidden',
      },
      size: {
        compact: 'p-3',
        default: 'p-4',
        spacious: 'p-6',
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
            'h-1 w-full',
            accentColor === 'green' && 'bg-primary',
            accentColor === 'gold' && 'bg-zartsa-gold',
            accentColor === 'blue' && 'bg-zartsa-blue',
            accentColor === 'red' && 'bg-red-500'
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
    <h3 ref={ref} className={cn('text-base font-semibold text-slate-900', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-slate-500', className)} {...props} />
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
```

- [ ] **Step 3: Create Badge component**

```tsx
// client/src/components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800',
        warning: 'bg-amber-100 text-amber-800',
        info: 'bg-blue-100 text-blue-800',
        neutral: 'bg-slate-100 text-slate-800',
        gold: 'bg-yellow-100 text-yellow-800',
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
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ui/button.tsx client/src/components/ui/card.tsx client/src/components/ui/badge.tsx
git commit -m "feat: add Button, Card, and Badge UI components"
```

---

### Task 3: UI Components — Input, Select, PageHeader, EmptyState, Skeleton, Toggle, OtpInput

**Files:**
- Create: `client/src/components/ui/input.tsx`
- Create: `client/src/components/ui/select.tsx`
- Create: `client/src/components/ui/page-header.tsx`
- Create: `client/src/components/ui/empty-state.tsx`
- Create: `client/src/components/ui/skeleton.tsx`
- Create: `client/src/components/ui/toggle.tsx`
- Create: `client/src/components/ui/otp-input.tsx`

- [ ] **Step 1: Create Input component**

```tsx
// client/src/components/ui/input.tsx
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
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors',
              'placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-10',
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-200 hover:border-slate-300',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
```

- [ ] **Step 2: Create Select component**

```tsx
// client/src/components/ui/select.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'flex h-10 w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10 text-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-200 hover:border-slate-300',
              className
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
```

- [ ] **Step 3: Create PageHeader component**

```tsx
// client/src/components/ui/page-header.tsx
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
    <div className={cn('mb-6', className)}>
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create EmptyState component**

```tsx
// client/src/components/ui/empty-state.tsx
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
      {icon && <div className="mb-4 text-slate-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create Skeleton component**

```tsx
// client/src/components/ui/skeleton.tsx
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
```

- [ ] **Step 6: Create Toggle component**

```tsx
// client/src/components/ui/toggle.tsx
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
          'relative h-6 w-11 rounded-full transition-colors duration-200',
          checked ? 'bg-primary' : 'bg-slate-200'
        )}
      >
        <div
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </div>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </button>
  );
}
```

- [ ] **Step 7: Create OtpInput component**

```tsx
// client/src/components/ui/otp-input.tsx
import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';

export interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
  error?: string;
}

export function OtpInput({ length = 6, onComplete, disabled, error }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...values];
    newValues[index] = value.slice(-1);
    setValues(newValues);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const otp = newValues.join('');
    if (otp.length === length && !newValues.includes('')) {
      onComplete(otp);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const newValues = [...values];
    pasted.split('').forEach((char, i) => {
      if (i < length) newValues[i] = char;
    });
    setValues(newValues);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
    if (pasted.length === length) {
      onComplete(newValues.join(''));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-2">
        {values.map((value, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            className={cn(
              'h-12 w-12 rounded-lg border-2 text-center text-lg font-bold transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              error
                ? 'border-red-500'
                : value
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300'
            )}
          />
        ))}
      </div>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add client/src/components/ui/
git commit -m "feat: add Input, Select, PageHeader, EmptyState, Skeleton, Toggle, and OtpInput components"
```

---

### Task 4: Layout Shell — Header, Sidebar, MobileDrawer, Footer

**Files:**
- Create: `client/src/components/layout/sidebar.tsx`
- Create: `client/src/components/layout/mobile-drawer.tsx`
- Modify: `client/src/components/layout/header.tsx`
- Modify: `client/src/components/layout/footer.tsx`

- [ ] **Step 1: Create Sidebar component for desktop**

```tsx
// client/src/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wallet, Search, MapPin, Ticket, Package, FileText,
  Newspaper, Scale, User, LogIn, ChevronRight,
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

export function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:border-slate-200 lg:bg-slate-50">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            Z
          </div>
          <span className="text-lg font-bold text-primary">ZARTSA</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 p-4">
        {!isAuthenticated && (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogIn className="h-5 w-5" />
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create MobileDrawer component**

```tsx
// client/src/components/layout/mobile-drawer.tsx
'use client';

import { useEffect, useRef } from 'react';
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
  const drawerRef = useRef<HTMLDivElement>(null);

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
  }, [pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={drawerRef}
        className="fixed inset-y-0 left-0 w-72 bg-white shadow-drawer animate-slide-in-left"
      >
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
```

- [ ] **Step 3: Rewrite Header component**

```tsx
// client/src/components/layout/header.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Globe } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { MobileDrawer } from '@/components/layout/mobile-drawer';

export function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold shadow-sm">
                Z
              </div>
              <span className="text-xl font-bold text-primary hidden sm:inline">ZARTSA</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <LanguageToggle />
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

function LanguageToggle() {
  const [lang, setLang] = useState<'sw' | 'en'>('sw');
  const toggle = () => setLang((l) => (l === 'sw' ? 'en' : 'sw'));

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
    >
      <Globe className="h-4 w-4" />
      {lang.toUpperCase()}
    </button>
  );
}
```

- [ ] **Step 4: Upgrade Footer component**

```tsx
// client/src/components/layout/footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-primary via-zartsa-gold to-primary" />
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} ZARTSA — Zanzibar Road Transport & Safety Authority
          </p>
          <div className="flex gap-4 text-xs text-slate-400">
            <span>Terms</span>
            <span>Privacy</span>
            <span>Contact</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/layout/
git commit -m "feat: add Sidebar, MobileDrawer, rewrite Header, upgrade Footer for responsive shell"
```

---

### Task 5: Root Layout — Responsive Shell + Sonner Toaster

**Files:**
- Modify: `client/src/app/layout.tsx`

- [ ] **Step 1: Update root layout with responsive sidebar logic and Toaster**

Read the current `layout.tsx` first, then rewrite it to include the Sidebar for desktop, the Toaster from sonner, and the responsive content wrapper that shifts right on desktop.

The key changes:
1. Import `Sidebar` from `@/components/layout/sidebar`
2. Import `Toaster` from `sonner`
3. Wrap the content area in a `div` that has `lg:ml-64` to make room for the sidebar
4. Add `<Toaster position="bottom-right" />` inside the providers

- [ ] **Step 2: Commit**

```bash
git add client/src/app/layout.tsx
git commit -m "feat: add responsive sidebar and Sonner toaster to root layout"
```

---

### Task 6: Home Page Redesign

**Files:**
- Modify: `client/src/app/page.tsx`

- [ ] **Step 1: Rewrite home page with hero banner and upgraded card grid**

Replace the current page.tsx content with a redesigned home page featuring:
- Hero section with green gradient background, white text, wave SVG divider
- 3x3 grid of Card(interactive, gradient) with lucide icons (Wallet, Search, MapPin, Ticket, Package, FileText, Newspaper, Scale, User)
- Each card gets a green top accent bar and hover lift effect
- Responsive: 1 col mobile, 3 cols tablet/desktop

- [ ] **Step 2: Verify home page renders correctly**

Run: `cd /home/yusuf/zartsa/client && npx next dev --port 3000 &`
Then visit http://localhost:3000 and confirm hero + grid displays

- [ ] **Step 3: Commit**

```bash
git add client/src/app/page.tsx
git commit -m "feat: redesign home page with hero banner and interactive card grid"
```

---

### Task 7: Auth Pages Redesign

**Files:**
- Modify: `client/src/app/(auth)/login/page.tsx`
- Modify: `client/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Rewrite login page**

Replace the current login page with:
- Centered Card(spacious) with green gradient top bar
- ZARTSA logo centered
- Phone input using Input component with Phone icon
- OTP step using OtpInput component with auto-advance
- Sonner toast for errors instead of inline red box
- Ghost link to switch between login/register

- [ ] **Step 2: Rewrite register page**

Same visual pattern as login, with additional fields for first name, last name, email, language preference. Use Input components for all fields.

- [ ] **Step 3: Commit**

```bash
git add client/src/app/\(auth\)/
git commit -m "feat: redesign auth pages with Card, OtpInput, and sonner toasts"
```

---

### Task 8: Main Pages Redesign (Fares, Verify, Track, Lost & Found, News)

**Files:**
- Modify: `client/src/app/fares/page.tsx`
- Modify: `client/src/app/verify/page.tsx`
- Modify: `client/src/app/track/page.tsx`
- Modify: `client/src/app/track/bus-map.tsx`
- Modify: `client/src/app/track/bus-stop-list.tsx`
- Modify: `client/src/app/track/filter-panel.tsx`
- Modify: `client/src/app/track/delay-alert.tsx`
- Modify: `client/src/app/lost-found/page.tsx`
- Modify: `client/src/app/lost-found/item/[id]/page.tsx`
- Modify: `client/src/app/lost-found/report-lost/page.tsx`
- Modify: `client/src/app/lost-found/report-found/page.tsx`
- Modify: `client/src/app/news/page.tsx`
- Modify: `client/src/app/news/[id]/page.tsx`
- Modify: `client/src/app/news/admin/page.tsx`
- Modify: `client/src/components/news-card.tsx`

- [ ] **Step 1: Redesign Fares page**

Replace with: PageHeader, segmented route-type toggle, Card with Select inputs, results as Card(interactive, gradient) with Badge for total fare.

- [ ] **Step 2: Redesign Verify page**

Replace with: PageHeader with Shield icon, form Card, Button(primary, lg), result Card with Badge and key-value rows.

- [ ] **Step 3: Redesign Track page**

Replace with: PageHeader with live pulse dot, map Card(rounded-xl, shadow-lg), responsive filter panel, accordion bus stops, amber-bordered delay alerts.

- [ ] **Step 4: Redesign Lost & Found pages**

Replace list page, item detail, report-lost, report-found with: Input with Search icon, Button variants (outline/primary), Card(interactive) items, Badge status indicators.

- [ ] **Step 5: Redesign News pages**

Replace news list, detail, admin with: Badge category filter, upgraded NewsCard with gradient top bar, spacious detail Card, form Card for admin.

- [ ] **Step 6: Commit**

```bash
git add client/src/app/fares/ client/src/app/verify/ client/src/app/track/ client/src/app/lost-found/ client/src/app/news/ client/src/components/news-card.tsx
git commit -m "feat: redesign fares, verify, track, lost-found, and news pages with design system"
```

---

### Task 9: Profile & Notifications Redesign

**Files:**
- Modify: `client/src/app/profile/page.tsx`
- Modify: `client/src/app/profile/profile-form.tsx`
- Modify: `client/src/app/profile/dashboard-tabs.tsx`
- Modify: `client/src/app/profile/saved-routes.tsx`
- Modify: `client/src/app/profile/delete-account.tsx`
- Modify: `client/src/app/notifications/page.tsx`
- Modify: `client/src/app/notifications/preferences/page.tsx`
- Modify: `client/src/components/notification-bell.tsx`

- [ ] **Step 1: Redesign Profile page and sub-components**

Replace with: Card sections, PageHeader, ghost edit toggle, inline editing with Input components, danger zone Card with red border.

- [ ] **Step 2: Redesign DashboardTabs**

Replace with: pill-style tab bar with green underline for active tab, count Badges.

- [ ] **Step 3: Redesign Notifications and Preferences**

Replace notifications with: Card list with green dot indicator for unread. Replace preferences with: Toggle switches with green active state.

- [ ] **Step 4: Upgrade NotificationBell**

Update badge styling to use the Badge component.

- [ ] **Step 5: Commit**

```bash
git add client/src/app/profile/ client/src/app/notifications/ client/src/components/notification-bell.tsx
git commit -m "feat: redesign profile, notifications, and preferences with design system components"
```

---

### Task 10: Placeholder Pages + Polish

**Files:**
- Modify: `client/src/app/complaints/page.tsx`
- Modify: `client/src/app/fines/page.tsx`
- Modify: `client/src/app/tickets/page.tsx`
- Modify: Any remaining inline `alert()` calls across all pages

- [ ] **Step 1: Replace placeholder pages with EmptyState component**

Each placeholder page (Complaints, Fines, Tickets) gets PageHeader + EmptyState with a relevant lucide icon.

- [ ] **Step 2: Replace all `alert()` calls with sonner toast**

Search all page files for `alert(` and replace with `toast.error()`, `toast.success()`, or `toast.info()` from sonner. Add `import { toast } from 'sonner'` where needed.

- [ ] **Step 3: Replace inline error boxes with toast or Input error prop**

Search for `bg-red-50` / `text-red-600` error display patterns. Replace form-level error boxes with `toast.error()`, and field-level errors with Input's `error` prop.

- [ ] **Step 4: Add Skeleton loading states**

Search for "Loading..." text in pages and replace with Skeleton/ListSkeleton components.

- [ ] **Step 5: Final visual review and commit**

Run the dev server, browse all pages, verify:
- All pages render without errors
- Responsive layout works (mobile + desktop sidebar)
- Colors and spacing match the design system
- No console errors

```bash
git add client/src/app/complaints/ client/src/app/fines/ client/src/app/tickets/
git add -u  # catch any remaining modified files
git commit -m "feat: add EmptyState to placeholders, replace alerts with toasts, add skeleton loading"
```