import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lost & Found',
  description: 'Report lost items or found items on Zanzibar transport.',
};

export default function LostFoundLayout({ children }: { children: React.ReactNode }) {
  return children;
}