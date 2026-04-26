import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'News & Announcements',
  description: 'Latest transport news, fare adjustments, and regulatory updates.',
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}