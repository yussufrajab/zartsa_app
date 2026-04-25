'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { formatTZS, formatDate } from '@/lib/utils';
import { ArrowLeft, Copy, Check, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { PAYMENT_METHODS } from '@zartsa/shared';
import type { PaymentMethod, Fine, FinePaymentStatus, PaymentReceipt } from '@zartsa/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

const statusVariant: Record<FinePaymentStatus, 'error' | 'success' | 'warning' | 'neutral'> = {
  OUTSTANDING: 'error',
  PAID: 'success',
  DISPUTED: 'warning',
  WAIVED: 'neutral',
};

const MOBILE_METHODS: PaymentMethod[] = ['mpesa', 'airtel_money', 'zantel'];

export default function FineDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [fine, setFine] = useState<Fine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  // Dispute state
  const [disputeReason, setDisputeReason] = useState('');
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeError, setDisputeError] = useState('');
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  const [copiedControl, setCopiedControl] = useState(false);

  const locale = i18n.language === 'sw' ? 'sw' : 'en';

  useEffect(() => {
    const fetchFine = async () => {
      try {
        const res = await api.get<{ data: Fine }>(`/fines/${id}`);
        setFine(res.data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(t('common.error'));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchFine();
  }, [id, t]);

  const handlePay = async () => {
    if (!fine) return;
    setPaymentError('');
    setIsPaying(true);

    try {
      const body: { paymentMethod: PaymentMethod; phoneNumber?: string } = {
        paymentMethod,
      };
      if (MOBILE_METHODS.includes(paymentMethod)) {
        body.phoneNumber = phoneNumber;
      }
      const res = await api.post<{ data: PaymentReceipt }>(`/fines/${fine.id}/pay`, body);
      setReceipt(res.data);
      // Refresh fine to show updated status
      const updated = await api.get<{ data: Fine }>(`/fines/${fine.id}`);
      setFine(updated.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('common.error');
      setPaymentError(message);
    } finally {
      setIsPaying(false);
    }
  };

  const handleDispute = async () => {
    if (!fine || disputeReason.length < 20) return;
    setDisputeError('');
    setIsDisputing(true);

    try {
      await api.post<{ data: Fine }>(`/fines/${fine.id}/dispute`, {
        reason: disputeReason,
      });
      setDisputeSubmitted(true);
      // Refresh fine
      const updated = await api.get<{ data: Fine }>(`/fines/${fine.id}`);
      setFine(updated.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('common.error');
      setDisputeError(message);
    } finally {
      setIsDisputing(false);
    }
  };

  const copyControlNumber = (controlNumber: string) => {
    navigator.clipboard.writeText(controlNumber);
    setCopiedControl(true);
    setTimeout(() => setCopiedControl(false), 2000);
  };

  const statusLabel = (status: FinePaymentStatus) => {
    const key = `fines.status.${status.toLowerCase()}` as const;
    return t(key);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-[#eaeef0]" />
          <div className="h-64 rounded-2xl bg-[#eaeef0]" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
        <PageHeader title={t('fines.title')} backHref="/fines" />
        <EmptyState
          icon={<ArrowLeft className="h-12 w-12" />}
          title={t('fines.notFound')}
          actionLabel={t('fines.backToList')}
          onAction={() => router.push('/fines')}
        />
      </div>
    );
  }

  if (error || !fine) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
        <PageHeader title={t('fines.title')} backHref="/fines" />
        <div className="rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
          {error || t('common.error')}
        </div>
      </div>
    );
  }

  // Payment receipt display
  if (receipt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
        <PageHeader title={t('fines.title')} backHref="/fines" />

        <div className="rounded-2xl border border-[#0a7c5c]/20 bg-[#e6f4ef] p-6 text-center">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-[#0a7c5c]" />
          <h2 className="font-display text-xl font-semibold text-[#0a7c5c]">
            {t('fines.paymentSuccessful')}
          </h2>
          <div className="mt-4 space-y-2 text-left text-sm">
            <div className="flex justify-between rounded-xl bg-white/60 px-4 py-2">
              <span className="text-[#637885]">{t('fines.transactionRef')}</span>
              <span className="font-semibold text-[#0d1820]">{receipt.transactionRef}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-white/60 px-4 py-2">
              <span className="text-[#637885]">{t('fines.amount')}</span>
              <span className="font-semibold text-[#0d1820]">{formatTZS(receipt.amount)}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-white/60 px-4 py-2">
              <span className="text-[#637885]">{t('fines.method')}</span>
              <span className="font-semibold text-[#0d1820]">{t(`fines.paymentMethods.${receipt.paymentMethod}`)}</span>
            </div>
          </div>
          <Link
            href="/fines"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0a7c5c] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#085a43]"
          >
            {t('fines.backToList')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
      <PageHeader title={t('fines.title')} backHref="/fines" />

      {/* Fine detail card */}
      <Card variant="gradient" accentColor={statusVariant[fine.paymentStatus] === 'success' ? 'green' : statusVariant[fine.paymentStatus] === 'warning' ? 'gold' : statusVariant[fine.paymentStatus] === 'error' ? 'red' : 'blue'}>
        <CardHeader>
          <CardTitle>{fine.offenseType}</CardTitle>
          <Badge variant={statusVariant[fine.paymentStatus]}>
            {statusLabel(fine.paymentStatus)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('fines.offenseType')}</p>
              <p className="font-medium text-[#0d1820]">{fine.offenseType}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('fines.location')}</p>
              <p className="font-medium text-[#0d1820]">{fine.location}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('fines.offenseDate')}</p>
              <p className="font-medium text-[#0d1820]">{formatDate(fine.offenseDate, locale)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('fines.controlNumber')}</p>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-[#0d1820]">{fine.controlNumber}</span>
                <button
                  onClick={() => copyControlNumber(fine.controlNumber)}
                  className="text-[#0a7c5c] hover:text-[#085a43] transition-colors"
                >
                  {copiedControl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#f5f9f7] p-3 text-center">
            <p className="text-xs font-medium text-[#637885]">{t('fines.amount')}</p>
            <p className="text-2xl font-bold text-[#0d1820]">{formatTZS(fine.penaltyAmount)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Pay section - only if OUTSTANDING */}
      {fine.paymentStatus === 'OUTSTANDING' && (
        <div className="mt-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#0d1820]">{t('fines.payNow')}</h3>

          {/* Payment method selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#2e3f4c]">{t('fines.selectPaymentMethod')}</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer ${
                    paymentMethod === method
                      ? 'border-[#0a7c5c] bg-[#e6f4ef]'
                      : 'border-[#d4dadf] bg-white hover:border-[#b0bcc5]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="h-4 w-4 accent-[#0a7c5c]"
                  />
                  <span className="text-sm font-medium text-[#0d1820]">
                    {t(`fines.paymentMethods.${method}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Phone number for mobile money methods */}
          {MOBILE_METHODS.includes(paymentMethod) && (
            <Input
              label={t('auth.phone')}
              type="tel"
              placeholder="07XX XXX XXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          )}

          {paymentError && (
            <div className="rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
              {paymentError}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            loading={isPaying}
            onClick={handlePay}
          >
            {t('fines.confirmPayment')}
          </Button>
        </div>
      )}

      {/* Dispute section - only if OUTSTANDING */}
      {fine.paymentStatus === 'OUTSTANDING' && !disputeSubmitted && (
        <div className="mt-6 space-y-4 rounded-xl border border-[#d4dadf] bg-white p-5">
          <h3 className="font-display text-lg font-semibold text-[#0d1820]">{t('fines.dispute')}</h3>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium tracking-wide text-[#2e3f4c]">
              {t('complaints.description')}
            </label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full rounded-xl border border-[#d4dadf] bg-white px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#8a9baa] transition-all duration-200 focus:border-[#0a7c5c] focus:outline-none focus:ring-3 focus:ring-[#0a7c5c]/15 hover:border-[#b0bcc5]"
              placeholder={`${t('complaints.description')}...`}
            />
            <p className="text-xs text-[#637885]">
              {disputeReason.length}/2000 (min 20)
            </p>
          </div>

          {disputeError && (
            <div className="rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
              {disputeError}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            loading={isDisputing}
            disabled={disputeReason.length < 20}
            onClick={handleDispute}
          >
            {t('fines.dispute')}
          </Button>
        </div>
      )}

      {/* Dispute submitted confirmation */}
      {disputeSubmitted && (
        <div className="mt-6 rounded-2xl border border-[#c8730a]/20 bg-[#fef3e2] p-6 text-center">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-[#c8730a]" />
          <h2 className="font-display text-lg font-semibold text-[#c8730a]">
            {t('fines.status.disputed')}
          </h2>
        </div>
      )}

      {/* Back to list */}
      <div className="mt-6">
        <Link
          href="/fines"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0a7c5c] transition-colors hover:text-[#085a43]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('fines.backToList')}
        </Link>
      </div>
    </div>
  );
}