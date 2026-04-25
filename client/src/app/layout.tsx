import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/sidebar';
import { Toaster } from 'sonner';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZARTSA - Zanzibar Road Transport & Safety Authority',
  description: 'Citizen services portal for Zanzibar road transport',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sw" suppressHydrationWarning>
      <body className={`${outfit.variable} ${jakarta.variable} font-body flex min-h-screen flex-col antialiased`}>
        <I18nProvider>
          <AuthProvider>
            <NotificationProvider>
              <Sidebar />
              <div className="flex flex-1 flex-col lg:ml-64">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <Toaster position="bottom-right" toastOptions={{ className: 'font-body' }} />
            </NotificationProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}