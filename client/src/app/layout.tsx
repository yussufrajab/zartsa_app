import type { Metadata } from 'next';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZARTSA - Zanzibar Road Transport & Safety Authority',
  description: 'Citizen services portal for Zanzibar road transport',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sw" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-white antialiased">
        <I18nProvider>
          <AuthProvider>
            <NotificationProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </NotificationProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}