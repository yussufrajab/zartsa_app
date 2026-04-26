import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tickets',
  description: 'Book bus tickets and manage your travel reservations.',
};

export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return children;
}