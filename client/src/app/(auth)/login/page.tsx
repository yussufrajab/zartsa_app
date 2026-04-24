'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { t } = useTranslation();
  const { requestOtp, login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      await requestOtp(phone);
      setOtpSent(true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      await login(phone, otp);
      router.push('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">{t('auth.login')}</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">{t('auth.phone')}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2557XXXXXXXX"
            className="w-full rounded-md border px-3 py-2 text-sm"
            disabled={otpSent}
          />
        </div>

        {!otpSent ? (
          <button
            onClick={handleSendOtp}
            disabled={loading || !phone}
            className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {t('auth.sendOtp')}
          </button>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm">{t('auth.otp')}</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading || otp.length !== 6}
              className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {t('auth.login')}
            </button>
          </>
        )}

        <p className="text-center text-xs text-gray-500">
          <Link href="/register">{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  );
}