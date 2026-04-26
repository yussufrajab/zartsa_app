import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Bus',
  description: 'Track live bus locations on Zanzibar routes.',
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}