import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fares',
  description: 'Check bus and shamba fares for routes across Zanzibar.',
};

export default function FaresLayout({ children }: { children: React.ReactNode }) {
  return children;
}