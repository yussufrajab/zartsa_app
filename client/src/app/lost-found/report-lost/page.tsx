'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ITEM_CATEGORIES } from '@zartsa/shared';
import type { ItemCategory } from '@zartsa/shared';

export default function ReportLostPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ description: '', category: 'other' as ItemCategory, route: '', travelDate: '', contactInfo: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated) { router.push('/login'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/lost-found/lost', { ...form, travelDate: new Date(form.travelDate).toISOString() });
      router.push('/lost-found');
    } catch (err: any) { setError(err?.message || 'Failed to report'); }
    finally { setIsSubmitting(false); }
  };

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/lost-found" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('lostFound.reportLost')}</h1>
      </div>
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
          <label className="mb-1 block text-sm font-medium">{t('lostFound.route')}</label>
          <input type="text" value={form.route} onChange={(e) => update('route', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.travelDate')}</label>
          <input type="date" value={form.travelDate} onChange={(e) => update('travelDate', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.contactInfo')}</label>
          <input type="text" value={form.contactInfo} onChange={(e) => update('contactInfo', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
          {isSubmitting ? t('common.loading') : t('lostFound.submitReport')}
        </button>
      </form>
    </div>
  );
}