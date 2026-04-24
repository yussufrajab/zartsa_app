'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { SmartPlateInput } from '@/components/SmartPlateInput';
import { formatDate } from '@/lib/utils';
import type { DocumentType, VerificationResult } from '@zartsa/shared';
import { DOCUMENT_TYPES } from '@zartsa/shared';
import { ArrowLeft, Search, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  Valid: 'bg-green-100 text-green-800',
  Expired: 'bg-red-100 text-red-800',
  Suspended: 'bg-yellow-100 text-yellow-800',
  Invalid: 'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  Valid: CheckCircle,
  Expired: AlertCircle,
  Suspended: AlertCircle,
  Invalid: AlertCircle,
};

export default function VerifyPage() {
  const { t, i18n } = useTranslation();
  const [documentType, setDocumentType] = useState<DocumentType>('driving_license');
  const [number, setNumber] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!number) return;
    setIsLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await api.post<{ data: VerificationResult }>('/verify', { documentType, number });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.message || t('verify.notFound'));
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = result ? (STATUS_ICONS[result.status] || AlertCircle) : AlertCircle;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="rounded-md p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('verify.title')}</h1>
      </div>

      {/* Document Type Selector */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">{t('verify.documentType')}</label>
        <select value={documentType} onChange={(e) => { setDocumentType(e.target.value as DocumentType); setNumber(''); setResult(null); }}
          className="w-full rounded-md border px-3 py-2 text-sm">
          {DOCUMENT_TYPES.map((dt) => (
            <option key={dt} value={dt}>{t(`verify.types.${dt}`)}</option>
          ))}
        </select>
      </div>

      {/* Number Input */}
      <div className="mb-4">
        {['road_license', 'commercial_vehicle_license', 'vehicle_visitor_permit'].includes(documentType) ? (
          <SmartPlateInput value={number} onChange={setNumber} label={t('verify.plateNumber')} />
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium">
              {documentType === 'driver_conductor_badge' ? t('verify.badgeNumber') : t('verify.licenseNumber')}
            </label>
            <input type="text" value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())}
              placeholder={t('verify.numberPlaceholder')} maxLength={50}
              className="w-full rounded-md border px-3 py-2 text-sm uppercase" />
          </div>
        )}
      </div>

      {/* Verify Button */}
      <button onClick={handleVerify} disabled={isLoading || !number}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
        <Search className="h-4 w-4" />
        {isLoading ? t('common.loading') : t('verify.verify')}
      </button>

      {/* Result */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5" />
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[result.status] || 'bg-gray-100 text-gray-800'}`}>
                {t(`verify.${result.status.toLowerCase()}`)}
              </span>
            </div>
            <Shield className="h-5 w-5 text-zartsa-green" />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('verify.documentType')}</span>
              <span className="font-medium">{t(`verify.types.${result.documentType}`)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('verify.holderName')}</span>
              <span className="font-medium">{result.holderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('verify.documentNumber')}</span>
              <span className="font-medium">{result.documentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('verify.issueDate')}</span>
              <span className="font-medium">{formatDate(result.issueDate, i18n.language as 'sw' | 'en')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('verify.expiryDate')}</span>
              <span className="font-medium">{formatDate(result.expiryDate, i18n.language as 'sw' | 'en')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}