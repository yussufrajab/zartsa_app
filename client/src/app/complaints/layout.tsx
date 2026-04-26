import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complaints',
  description: 'Submit and track complaints about transport services in Zanzibar.',
};

export default function ComplaintsLayout({ children }: { children: React.ReactNode }) {
  return children;
}