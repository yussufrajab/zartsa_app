'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { OtpInput } from '@/components/ui/otp-input';
import { toast } from 'sonner';

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
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      await requestOtp(form.phone);
      setOtpSent(true);
      toast.success('OTP sent to your phone');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (otpValue: string) => {
    try {
      setLoading(true);
      await register({ ...form, otp: otpValue });
      router.push('/profile');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 md:py-12">
      {/* Background accent circles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-[#0a7c5c]/5 blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-[#c8730a]/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="rounded-3xl bg-white shadow-[0_20px_60px_rgba(10,124,92,0.15)] border border-[#d4dadf]/40 p-8">
          <div className="flex flex-col items-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#12a07a] to-[#0a7c5c] shadow-xl ring-4 ring-[#e6f4ef]">
              <span className="font-display text-3xl font-bold text-white">Z</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#0d1820] mt-4">{t('auth.register')}</h1>
            <p className="text-sm text-[#637885] mt-1">Create your ZARTSA account</p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[#d4dadf] to-transparent my-6" />

          <div className="space-y-4">
            <Input label={t('auth.phone')} type="tel" value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+2557XXXXXXXX" disabled={otpSent} />

            <div className="grid grid-cols-2 gap-3">
              <Input label={t('auth.firstName')} type="text" value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)} />
              <Input label={t('auth.lastName')} type="text" value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)} />
            </div>

            <Input label={`${t('auth.email')} (optional)`} type="email" value={form.email}
              onChange={(e) => update('email', e.target.value)} />

            <Select label={t('auth.language')} value={form.preferredLanguage}
              onChange={(e) => update('preferredLanguage', e.target.value)}
              options={[{ value: 'sw', label: 'Kiswahili' }, { value: 'en', label: 'English' }]} />

            {!otpSent ? (
              <Button className="w-full" onClick={handleSendOtp}
                loading={loading} disabled={!form.phone || !form.firstName || !form.lastName}>
                {t('auth.sendOtp')}
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium tracking-wide text-[#2e3f4c]">{t('auth.otp')}</label>
                  <OtpInput onComplete={handleRegister} disabled={loading} />
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-[#637885]">
            <Link href="/login" className="text-[#0a7c5c] hover:underline font-semibold">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}