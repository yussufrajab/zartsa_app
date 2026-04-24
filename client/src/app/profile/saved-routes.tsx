'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Plus, Trash2, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SavedRouteData {
  id: string;
  userId: string;
  departure: string;
  destination: string;
  label: string;
}

interface SavedRoutesProps {
  routes: SavedRouteData[];
  onRoutesChanged: (routes: SavedRouteData[]) => void;
}

const MAX_ROUTES = 10;

export function SavedRoutes({ routes, onRoutesChanged }: SavedRoutesProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ departure: '', destination: '', label: '' });

  const handleAdd = async () => {
    if (!form.departure || !form.destination || !form.label) return;
    setLoading(true);
    try {
      const response = await api.post<{ status: string; data: SavedRouteData }>('/users/me/routes', form);
      onRoutesChanged([...routes, response.data]);
      setForm({ departure: '', destination: '', label: '' });
      setShowForm(false);
      toast.success(t('profile.routeSaved'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (routeId: string) => {
    setLoading(true);
    try {
      await api.delete(`/users/me/routes/${routeId}`);
      onRoutesChanged(routes.filter((r) => r.id !== routeId));
      toast.success(t('profile.routeRemoved'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('profile.savedRoutes')}</h2>
        {routes.length < MAX_ROUTES && !showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-sm text-zartsa-green">
            <Plus className="h-4 w-4" />
            {t('profile.addRoute')}
          </button>
        )}
      </div>

      {routes.length >= MAX_ROUTES && (
        <p className="mb-3 text-xs text-amber-600">{t('profile.maxRoutesReached')}</p>
      )}

      {showForm && (
        <div className="mb-4 space-y-2 rounded-md bg-gray-50 p-3">
          <input type="text" placeholder={t('profile.departure')} value={form.departure}
            onChange={(e) => setForm({ ...form, departure: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm" />
          <input type="text" placeholder={t('profile.destination')} value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm" />
          <input type="text" placeholder={t('profile.label')} value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={loading || !form.departure || !form.destination || !form.label}
              className="rounded-md bg-zartsa-green px-3 py-1 text-sm text-white disabled:opacity-50">
              {t('common.save')}
            </button>
            <button onClick={() => { setShowForm(false); setForm({ departure: '', destination: '', label: '' }); }}
              className="rounded-md border px-3 py-1 text-sm">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {routes.length === 0 && !showForm && (
        <p className="text-sm text-gray-500">{t('common.noResults')}</p>
      )}

      <div className="space-y-2">
        {routes.map((route) => (
          <div key={route.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-zartsa-green" />
              <div>
                <p className="text-sm font-medium">{route.label}</p>
                <p className="text-xs text-gray-500">
                  {route.departure} <ArrowRight className="mx-1 inline h-3 w-3" /> {route.destination}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/tickets?from=${encodeURIComponent(route.departure)}&to=${encodeURIComponent(route.destination)}`}
                className="rounded-md bg-zartsa-green px-2 py-1 text-xs text-white">
                {t('profile.rebook')}
              </Link>
              <button onClick={() => handleRemove(route.id)} disabled={loading}
                className="text-red-500 hover:text-red-700 disabled:opacity-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}