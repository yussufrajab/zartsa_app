'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Pencil, Save, X } from 'lucide-react';

interface ProfileData {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  nationalId: string | null;
  preferredLanguage: 'sw' | 'en';
}

interface ProfileFormProps {
  profile: ProfileData;
  onUpdated: (profile: ProfileData) => void;
}

export function ProfileForm({ profile, onUpdated }: ProfileFormProps) {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email || '',
    nationalId: profile.nationalId || '',
    preferredLanguage: profile.preferredLanguage,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (form.firstName !== profile.firstName) updateData.firstName = form.firstName;
      if (form.lastName !== profile.lastName) updateData.lastName = form.lastName;
      if (form.email !== (profile.email || '')) updateData.email = form.email || null;
      if (form.nationalId !== (profile.nationalId || '')) updateData.nationalId = form.nationalId || null;
      if (form.preferredLanguage !== profile.preferredLanguage) updateData.preferredLanguage = form.preferredLanguage;

      if (Object.keys(updateData).length === 0) {
        setEditing(false);
        setLoading(false);
        return;
      }

      const response = await api.put<{ status: string; data: ProfileData }>('/users/me', updateData);
      onUpdated(response.data);
      setEditing(false);
      toast.success(t('profile.profileUpdated'));

      if (updateData.preferredLanguage && updateData.preferredLanguage !== i18n.language) {
        await i18n.changeLanguage(updateData.preferredLanguage as string);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email || '',
      nationalId: profile.nationalId || '',
      preferredLanguage: profile.preferredLanguage,
    });
    setEditing(false);
  };

  return (
    <div className="rounded-2xl border border-[#d4dadf] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-[#0d1820]">{t('profile.editProfile')}</h2>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-sm font-semibold text-[#0a7c5c] hover:text-[#085a43] transition-colors">
            <Pencil className="h-4 w-4" />
            {t('profile.editProfile')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="flex items-center gap-1 rounded-xl border border-[#d4dadf] px-3 py-1.5 text-sm text-[#2e3f4c] hover:bg-[#eaeef0] transition-colors">
              <X className="h-4 w-4" />
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} disabled={loading}
              className="flex items-center gap-1 rounded-xl bg-[#0a7c5c] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#085a43] disabled:opacity-50 transition-colors">
              <Save className="h-4 w-4" />
              {t('common.save')}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#637885]">{t('profile.firstName')}</label>
            {editing ? (
              <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#637885] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]" />
            ) : (
              <p className="text-sm font-medium text-[#0d1820]">{profile.firstName}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#637885]">{t('profile.lastName')}</label>
            {editing ? (
              <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#637885] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]" />
            ) : (
              <p className="text-sm font-medium text-[#0d1820]">{profile.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#637885]">{t('profile.phone')}</label>
          <p className="text-sm text-[#2e3f4c]">{profile.phone}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#637885]">{t('profile.email')}</label>
          {editing ? (
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#637885] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]" />
          ) : (
            <p className="text-sm text-[#2e3f4c]">{profile.email || '—'}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#637885]">{t('profile.nationalId')}</label>
          {editing ? (
            <input type="text" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
              className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] placeholder:text-[#637885] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]" />
          ) : (
            <p className="text-sm text-[#2e3f4c]">{profile.nationalId || '—'}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#637885]">{t('profile.language')}</label>
          {editing ? (
            <select value={form.preferredLanguage} onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value as 'sw' | 'en' })}
              className="w-full rounded-xl border border-[#d4dadf] bg-[#f5f9f7] px-4 py-2.5 text-sm text-[#0d1820] focus:border-[#0a7c5c] focus:outline-none focus:ring-1 focus:ring-[#0a7c5c]">
              <option value="sw">Kiswahili</option>
              <option value="en">English</option>
            </select>
          ) : (
            <p className="text-sm text-[#2e3f4c]">{profile.preferredLanguage === 'sw' ? 'Kiswahili' : 'English'}</p>
          )}
        </div>
      </div>
    </div>
  );
}