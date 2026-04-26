import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fines',
  description: 'Check and pay traffic fines online.',
};

export default function FinesLayout({ children }: { children: React.ReactNode }) {
  return children;
}