'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { SmartPlateInput } from '@/components/SmartPlateInput';
import { formatDate } from '@/lib/utils';
import type { DocumentType, VerificationResult } from '@zartsa/shared';
import { DOCUMENT_TYPES } from '@zartsa/shared';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'neutral'> = {
  Valid: 'success',
  Expired: 'error',
  Suspended: 'warning',
  Invalid: 'error',
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
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!number) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await api.post<{ data: VerificationResult }>('/verify', { documentType, number });
      setResult(res.data);
    } catch (err: any) {
      toast.error(err?.message || t('verify.notFound'));
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = result ? (STATUS_ICONS[result.status] || AlertCircle) : AlertCircle;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('verify.title')} subtitle={t('app.tagline')} backHref="/" action={
        <Shield className="h-6 w-6 text-primary" />
      } />

      <Card size="default" className="mb-6">
        <div className="space-y-4">
          <Select label={t('verify.documentType')} value={documentType}
            onChange={(e) => { setDocumentType(e.target.value as DocumentType); setNumber(''); setResult(null); }}
            options={DOCUMENT_TYPES.map((dt) => ({ value: dt, label: t(`verify.types.${dt}`) }))}
            placeholder={t('verify.documentType')} />

          {['road_license', 'commercial_vehicle_license', 'vehicle_visitor_permit'].includes(documentType) ? (
            <SmartPlateInput value={number} onChange={setNumber} label={t('verify.plateNumber')} />
          ) : (
            <Input label={documentType === 'driver_conductor_badge' ? t('verify.badgeNumber') : t('verify.licenseNumber')}
              value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())}
              placeholder={t('verify.numberPlaceholder')} />
          )}

          <Button className="w-full" size="lg" onClick={handleVerify} loading={isLoading} disabled={!number}>
            {t('verify.verify')}
          </Button>
        </div>
      </Card>

      {result && (
        <Card variant="gradient" accentColor={STATUS_VARIANT[result.status] === 'success' ? 'green' : 'red'} size="spacious">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5" />
              <Badge variant={STATUS_VARIANT[result.status] || 'neutral'}>
                {t(`verify.${result.status.toLowerCase()}`)}
              </Badge>
            </div>
            <Shield className="h-5 w-5 text-primary" />
          </div>

          <div className="space-y-3 text-sm">
            {[
              { label: t('verify.documentType'), value: t(`verify.types.${result.documentType}`) },
              { label: t('verify.holderName'), value: result.holderName },
              { label: t('verify.documentNumber'), value: result.documentNumber },
              { label: t('verify.issueDate'), value: formatDate(result.issueDate, i18n.language as 'sw' | 'en') },
              { label: t('verify.expiryDate'), value: formatDate(result.expiryDate, i18n.language as 'sw' | 'en') },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-900">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}