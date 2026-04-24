import type { Metadata } from 'next';
import { I18nProvider } from '@/components/providers/I18nProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZARTSA - Zanzibar Road Transport & Safety Authority',
  description: 'Citizen services portal for Zanzibar road transport',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sw" suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}