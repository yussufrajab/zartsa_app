'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import type { AnnouncementCategory } from '@zartsa/shared';
import { CATEGORIES } from '@zartsa/shared';

interface Announcement {
  id: string;
  titleSw: string;
  titleEn: string;
  isPublished: boolean;
  category: AnnouncementCategory;
  publishedAt: string | null;
  createdAt: string;
}

export default function NewsAdminPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titleSw: '', titleEn: '', contentSw: '', contentEn: '',
    category: 'GENERAL_NOTICE' as AnnouncementCategory, sourceAuthority: '', publishNow: false,
  });

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'officer' && user?.role !== 'admin')) {
      router.push('/login');
      return;
    }
    loadAnnouncements();
  }, [isAuthenticated, user]);

  const loadAnnouncements = async () => {
    try {
      const res = await api.get<{ data: { items: Announcement[] } }>('/news/admin/all');
      setAnnouncements(res.data.items);
    } catch { setAnnouncements([]); }
    finally { setIsLoading(false); }
  };

  const handleCreate = async () => {
    try {
      await api.post('/news', form as unknown as Record<string, unknown>);
      setShowForm(false);
      setForm({ titleSw: '', titleEn: '', contentSw: '', contentEn: '', category: 'GENERAL_NOTICE', sourceAuthority: '', publishNow: false });
      loadAnnouncements();
    } catch { alert('Failed to create announcement'); }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/news/${id}/publish`, {});
      loadAnnouncements();
    } catch { alert('Failed to publish'); }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await api.post(`/news/${id}/unpublish`, {});
      loadAnnouncements();
    } catch { alert('Failed to unpublish'); }
  };

  if (isLoading) return <p className="p-4 text-sm text-[#637885]">{t('common.loading')}</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('news.manageTitle') || 'Manage Announcements'} backHref="/news" action={
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-xl bg-[#0a7c5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#085a43] transition-colors">
          <Plus className="h-4 w-4" />
          {t('news.createTitle')}
        </button>
      } />

      {showForm && (
        <div className="mb-6 rounded-2xl border border-[#d4dadf] bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-[#0d1820]">{t('news.createTitle')}</h2>
          <div className="space-y-3">
            <input placeholder={t('news.titleSwPlaceholder') || 'Title (Swahili)'} value={form.titleSw}
              onChange={(e) => setForm(f => ({ ...f, titleSw: e.target.value }))}
              className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#637885] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]" />
            <input placeholder={t('news.titleEnPlaceholder') || 'Title (English)'} value={form.titleEn}
              onChange={(e) => setForm(f => ({ ...f, titleEn: e.target.value }))}
              className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#637885] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]" />
            <textarea placeholder={t('news.contentSwPlaceholder') || 'Content (Swahili)'} value={form.contentSw}
              onChange={(e) => setForm(f => ({ ...f, contentSw: e.target.value }))}
              className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#637885] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]" rows={3} />
            <textarea placeholder={t('news.contentEnPlaceholder') || 'Content (English)'} value={form.contentEn}
              onChange={(e) => setForm(f => ({ ...f, contentEn: e.target.value }))}
              className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#637885] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]" rows={3} />
            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value as AnnouncementCategory }))}
              className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]">
              {CATEGORIES.map(c => <option key={c} value={c}>{t(`news.categories.${c}`)}</option>)}
            </select>
            <input placeholder={t('news.source') || 'Source authority'} value={form.sourceAuthority}
              onChange={(e) => setForm(f => ({ ...f, sourceAuthority: e.target.value }))}
              className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#637885] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]" />
            <label className="flex items-center gap-2 text-sm text-[#2e3f4c]">
              <input type="checkbox" checked={form.publishNow} onChange={(e) => setForm(f => ({ ...f, publishNow: e.target.checked }))} className="rounded border-[#d4dadf] text-[#0a7c5c] focus:ring-[#0a7c5c]" />
              {t('news.publish') || 'Publish immediately'}
            </label>
            <button onClick={handleCreate} disabled={!form.titleSw || !form.titleEn || !form.contentSw || !form.contentEn}
              className="w-full rounded-xl bg-[#0a7c5c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#085a43] disabled:opacity-50">
              {t('news.createTitle') || 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-2xl border border-[#d4dadf] bg-white p-4">
            <div>
              <p className="text-sm font-medium text-[#0d1820]">{a.titleEn}</p>
              <p className="text-xs text-[#637885]">{a.category.replace(/_/g, ' ')} &middot; {a.isPublished ? 'Published' : 'Draft'}</p>
            </div>
            <div className="flex gap-1">
              {a.isPublished ? (
                <button onClick={() => handleUnpublish(a.id)} className="rounded-xl p-2 text-[#637885] hover:bg-[#eaeef0] transition-colors" title={t('news.unpublish')}>
                  <EyeOff className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={() => handlePublish(a.id)} className="rounded-xl p-2 text-[#0a7c5c] hover:bg-[#e6f4ef] transition-colors" title={t('news.publish')}>
                  <Eye className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}