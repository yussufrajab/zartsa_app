'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
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

  if (isLoading) return <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/news" className="rounded-md p-1 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{t('news.manageTitle') || 'Manage Announcements'}</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md bg-zartsa-green px-3 py-1.5 text-sm text-white">
          <Plus className="h-4 w-4" />
          {t('news.createTitle')}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">{t('news.createTitle')}</h2>
          <div className="space-y-3">
            <input placeholder={t('news.titleSwPlaceholder') || 'Title (Swahili)'} value={form.titleSw}
              onChange={(e) => setForm(f => ({ ...f, titleSw: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm" />
            <input placeholder={t('news.titleEnPlaceholder') || 'Title (English)'} value={form.titleEn}
              onChange={(e) => setForm(f => ({ ...f, titleEn: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm" />
            <textarea placeholder={t('news.contentSwPlaceholder') || 'Content (Swahili)'} value={form.contentSw}
              onChange={(e) => setForm(f => ({ ...f, contentSw: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm" rows={3} />
            <textarea placeholder={t('news.contentEnPlaceholder') || 'Content (English)'} value={form.contentEn}
              onChange={(e) => setForm(f => ({ ...f, contentEn: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm" rows={3} />
            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value as AnnouncementCategory }))}
              className="w-full rounded-md border px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{t(`news.categories.${c}`)}</option>)}
            </select>
            <input placeholder={t('news.source') || 'Source authority'} value={form.sourceAuthority}
              onChange={(e) => setForm(f => ({ ...f, sourceAuthority: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.publishNow} onChange={(e) => setForm(f => ({ ...f, publishNow: e.target.checked }))} />
              {t('news.publish') || 'Publish immediately'}
            </label>
            <button onClick={handleCreate} disabled={!form.titleSw || !form.titleEn || !form.contentSw || !form.contentEn}
              className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
              {t('news.createTitle') || 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {announcements.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{a.titleEn}</p>
              <p className="text-xs text-gray-500">{a.category.replace(/_/g, ' ')} &middot; {a.isPublished ? 'Published' : 'Draft'}</p>
            </div>
            <div className="flex gap-1">
              {a.isPublished ? (
                <button onClick={() => handleUnpublish(a.id)} className="rounded p-1.5 hover:bg-gray-100" title={t('news.unpublish')}>
                  <EyeOff className="h-4 w-4 text-gray-500" />
                </button>
              ) : (
                <button onClick={() => handlePublish(a.id)} className="rounded p-1.5 hover:bg-gray-100" title={t('news.publish')}>
                  <Eye className="h-4 w-4 text-zartsa-green" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}