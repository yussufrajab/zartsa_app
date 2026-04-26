'use client';

import { useState, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial client hydration, render children with the fallback language.
  // After mounting, the client-side language detection kicks in and re-renders with the correct language.
  // This avoids React hydration mismatch errors (#418) caused by i18next-browser-languagedetector
  // reading from localStorage/navigator on the client but defaulting to fallbackLng on the server.
  if (!mounted) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}