'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { t } = useTranslation();
  const { requestOtp, login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      await requestOtp(phone);
      setOtpSent(true);
      toast.success('OTP sent to your phone');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (otpValue: string) => {
    try {
      setLoading(true);
      await login(phone, otpValue);
      router.push('/profile');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-8 md:py-12">
      <Card variant="gradient" accentColor="green" size="spacious">
        <div className="flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-white shadow-md">
            Z
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t('auth.login')}</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back to ZARTSA</p>
        </div>

        <div className="mt-6 space-y-4">
          <Input
            label={t('auth.phone')}
            icon={<Phone className="h-4 w-4" />}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2557XXXXXXXX"
            disabled={otpSent}
          />

          {!otpSent ? (
            <Button className="w-full" onClick={handleSendOtp} loading={loading} disabled={!phone}>
              {t('auth.sendOtp')}
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('auth.otp')}</label>
                <OtpInput onComplete={handleLogin} disabled={loading} />
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          <Link href="/register" className="text-primary hover:underline">{t('auth.register')}</Link>
        </p>
      </Card>
    </div>
  );
}