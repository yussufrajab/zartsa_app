'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteAccountProps {
  onDeleted: () => void;
}

export function DeleteAccount({ onDeleted }: DeleteAccountProps) {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmation !== 'DELETE') return;
    setLoading(true);
    try {
      await api.delete('/users/me', { body: JSON.stringify({ confirmation: 'DELETE' }) } as RequestInit);
      toast.success(t('profile.accountDeleted'));
      localStorage.removeItem('zartsa_token');
      onDeleted();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
      setShowDialog(false);
      setConfirmation('');
    }
  };

  return (
    <div className="rounded-lg border border-red-200 p-4">
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="text-lg font-semibold">{t('profile.deleteAccount')}</h2>
      </div>
      <p className="mt-2 text-sm text-gray-600">{t('profile.deleteWarning')}</p>
      <button onClick={() => setShowDialog(true)}
        className="mt-3 flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700">
        <Trash2 className="h-4 w-4" />
        {t('profile.deleteButton')}
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">{t('profile.deleteAccount')}</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600">{t('profile.deleteWarning')}</p>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">{t('profile.deleteConfirm')}</label>
              <input type="text" value={confirmation} onChange={(e) => setConfirmation(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" placeholder="DELETE" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowDialog(false); setConfirmation(''); }}
                className="rounded-md border px-4 py-2 text-sm">{t('common.cancel')}</button>
              <button onClick={handleDelete} disabled={confirmation !== 'DELETE' || loading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                {t('profile.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}