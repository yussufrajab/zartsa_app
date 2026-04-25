'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { COMPLAINT_CATEGORIES } from '@zartsa/shared';
import { ArrowLeft, Upload, X, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Link from 'next/link';

export default function ComplaintsPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    vehiclePlate: '',
    route: '',
    incidentDate: '',
    category: '' as string,
    description: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedRef, setSubmittedRef] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const combined = [...files, ...newFiles].slice(0, 3);
    setFiles(combined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.vehiclePlate || !form.route || !form.incidentDate || !form.category || !form.description) {
      setError(t('common.required'));
      return;
    }

    if (form.description.length < 10) {
      setError(t('complaints.descriptionMinError') || 'Description must be at least 10 characters');
      return;
    }

    if (!isAuthenticated && !form.contactEmail && !form.contactPhone) {
      setError(t('complaints.contactRequired') || 'Please provide email or phone for tracking');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('vehiclePlate', form.vehiclePlate);
      formData.append('route', form.route);
      formData.append('incidentDate', new Date(form.incidentDate).toISOString());
      formData.append('category', form.category);
      formData.append('description', form.description);
      if (!isAuthenticated) {
        if (form.contactEmail) formData.append('contactEmail', form.contactEmail);
        if (form.contactPhone) formData.append('contactPhone', form.contactPhone);
      }
      files.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await api.upload<{ data: { referenceNumber: string } }>('/complaints', formData);
      setSubmittedRef(res.data.referenceNumber);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.error');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedRef) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
        <PageHeader title={t('complaints.title')} backHref="/" />

        <div className="rounded-2xl border border-[#0a7c5c]/20 bg-[#e6f4ef] p-6 text-center">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-[#0a7c5c]" />
          <h2 className="font-display text-xl font-semibold text-[#0a7c5c]">
            {t('complaints.submitted')}
          </h2>
          <p className="mt-2 text-sm text-[#2e3f4c]">
            {t('complaints.referenceLabel')} <strong className="text-[#0a7c5c]">{submittedRef}</strong>
          </p>
          <Link
            href={`/complaints/track?ref=${submittedRef}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0a7c5c] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#085a43]"
          >
            {t('complaints.trackThis')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
      <PageHeader title={t('complaints.title')} backHref="/" />

      {!isAuthenticated && (
        <div className="mb-5 rounded-xl border border-[#f0a23a]/30 bg-[#fef3e2] p-4">
          <p className="text-sm text-[#c8730a]">{t('complaints.anonymousNote')}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label={t('complaints.vehiclePlate')}
          placeholder="Z123ABC"
          value={form.vehiclePlate}
          onChange={(e) => handleChange('vehiclePlate', e.target.value)}
          required
        />

        <Input
          label={t('complaints.route')}
          placeholder={t('complaints.route') + '...'}
          value={form.route}
          onChange={(e) => handleChange('route', e.target.value)}
          required
        />

        <Input
          label={t('complaints.incidentDate')}
          type="datetime-local"
          value={form.incidentDate}
          onChange={(e) => handleChange('incidentDate', e.target.value)}
          required
        />

        <Select
          label={t('complaints.category')}
          options={COMPLAINT_CATEGORIES.map((cat) => ({
            value: cat,
            label: t(`complaints.categories.${cat}`),
          }))}
          value={form.category}
          onChange={(e) => handleChange('category', e.target.value)}
          placeholder={t('complaints.category') + '...'}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium tracking-wide text-[#2e3f4c]">
            {t('complaints.description')}
          </label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full rounded-xl border border-[#d4dadf] bg-white px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#8a9baa] transition-all duration-200 focus:border-[#0a7c5c] focus:outline-none focus:ring-3 focus:ring-[#0a7c5c]/15 hover:border-[#b0bcc5]"
            required
          />
          <p className="text-xs text-[#637885]">
            {form.description.length}/1000
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium tracking-wide text-[#2e3f4c]">
            {t('complaints.attachments')}
          </label>
          <p className="text-xs text-[#637885]">{t('complaints.attachmentsHint')}</p>
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-1.5 rounded-lg border border-[#d4dadf] bg-[#f5f9f7] px-3 py-1.5 text-xs text-[#2e3f4c]">
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-[#637885] hover:text-[#d4322c] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {files.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#d4dadf] px-3 py-1.5 text-xs text-[#637885] transition-colors hover:border-[#0a7c5c] hover:text-[#0a7c5c]"
              >
                <Upload className="h-3.5 w-3.5" />
                Add file
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {!isAuthenticated && (
          <div className="space-y-4 rounded-xl border border-[#d4dadf] bg-[#f5f9f7] p-4">
            <p className="text-sm font-medium text-[#2e3f4c]">{t('complaints.contactForTracking')}</p>
            <Input
              label={t('complaints.contactEmail')}
              type="email"
              value={form.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
            />
            <Input
              label={t('complaints.contactPhone')}
              type="tel"
              value={form.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
          {t('complaints.submit')}
        </Button>
      </form>
    </div>
  );
}