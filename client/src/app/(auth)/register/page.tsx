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
    <div className="mx-auto max-w-sm px-4 py-8 md:py-12">
      <Card variant="gradient" accentColor="green" size="spacious">
        <div className="flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-white shadow-md">
            Z
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t('auth.register')}</h1>
          <p className="mt-1 text-sm text-slate-500">Create your ZARTSA account</p>
        </div>

        <div className="mt-6 space-y-4">
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
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('auth.otp')}</label>
                <OtpInput onComplete={handleRegister} disabled={loading} />
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          <Link href="/login" className="text-primary hover:underline">{t('auth.login')}</Link>
        </p>
      </Card>
    </div>
  );
}