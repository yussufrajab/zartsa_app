'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { requestOtp, register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
    preferredLanguage: i18n.language as 'sw' | 'en',
  });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      await requestOtp(form.phone);
      setOtpSent(true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      await register({ ...form, otp });
      router.push('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">{t('auth.register')}</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">{t('auth.phone')}</label>
          <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
            placeholder="+2557XXXXXXXX" disabled={otpSent}
            className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm">{t('auth.firstName')}</label>
          <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm">{t('auth.lastName')}</label>
          <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm">{t('auth.email')} ({t('common.required').toLowerCase()})</label>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm">{t('auth.language')}</label>
          <select value={form.preferredLanguage} onChange={(e) => update('preferredLanguage', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="sw">Kiswahili</option>
            <option value="en">English</option>
          </select>
        </div>

        {!otpSent ? (
          <button onClick={handleSendOtp} disabled={loading || !form.phone || !form.firstName || !form.lastName}
            className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
            {t('auth.sendOtp')}
          </button>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm">{t('auth.otp')}</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6}
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <button onClick={handleRegister} disabled={loading || otp.length !== 6}
              className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
              {t('auth.register')}
            </button>
          </>
        )}

        <p className="text-center text-xs text-gray-500">
          <Link href="/login">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
}