'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ITEM_CATEGORIES } from '@zartsa/shared';
import type { ItemCategory } from '@zartsa/shared';
import { PageHeader } from '@/components/ui/page-header';

export default function ReportFoundPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ description: '', category: 'other' as ItemCategory, busNumber: '', route: '', foundDate: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated || (user?.role !== 'operator' && user?.role !== 'driver' && user?.role !== 'officer' && user?.role !== 'admin')) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('busNumber', form.busNumber);
      formData.append('route', form.route);
      formData.append('foundDate', new Date(form.foundDate).toISOString());
      if (photo) formData.append('photo', photo);
      // Use fetch directly since api client always sets Content-Type to application/json
      const token = api.getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      const res = await fetch(`${apiBase}/lost-found/found`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to report found item');
      router.push('/lost-found');
    } catch (err: any) { setError(err?.message || 'Failed to report'); }
    finally { setIsSubmitting(false); }
  };

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
      <PageHeader title={t('lostFound.reportFound')} backHref="/lost-found" />
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.description')}</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} maxLength={1000} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.category')}</label>
          <select value={form.category} onChange={(e) => update('category', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
            {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{t(`lostFound.categories.${c}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.busNumber')}</label>
          <input type="text" value={form.busNumber} onChange={(e) => update('busNumber', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.route')}</label>
          <input type="text" value={form.route} onChange={(e) => update('route', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.foundDate')}</label>
          <input type="date" value={form.foundDate} onChange={(e) => update('foundDate', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.photo')}</label>
          <input type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="w-full text-sm" />
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-[#0a7c5c] px-4 py-2 text-sm text-white disabled:opacity-50">
          {isSubmitting ? t('common.loading') : t('lostFound.submitReport')}
        </button>
      </form>
    </div>
  );
}