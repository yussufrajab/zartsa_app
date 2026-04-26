import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your ZARTSA account.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}