'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ProfileForm } from './profile-form';
import { SavedRoutes } from './saved-routes';
import { DashboardTabs } from './dashboard-tabs';
import { DeleteAccount } from './delete-account';
import { useAuth } from '@/components/providers/AuthProvider';

interface SavedRouteData {
  id: string; userId: string; departure: string; destination: string; label: string;
}

interface ProfileData {
  id: string; phone: string; email: string | null; firstName: string;
  lastName: string; nationalId: string | null; preferredLanguage: 'sw' | 'en';
}

interface FullProfile extends ProfileData {
  savedRoutes: SavedRouteData[];
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchProfile();
    }
  }, [user, authLoading]);

  async function fetchProfile() {
    try {
      const response = await api.get<{ status: string; data: FullProfile }>('/users/me');
      setProfile(response.data);
    } catch {
      // Will show empty state
    } finally {
      setLoading(false);
    }
  }

  const handleProfileUpdated = (updated: ProfileData) => {
    if (profile) {
      setProfile({ ...profile, ...updated });
    }
  };

  const handleRoutesChanged = (routes: SavedRouteData[]) => {
    if (profile) {
      setProfile({ ...profile, savedRoutes: routes });
    }
  };

  const handleAccountDeleted = () => {
    router.push('/');
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <p className="text-sm text-gray-500">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">{t('profile.title')}</h1>

      <ProfileForm profile={profile} onUpdated={handleProfileUpdated} />

      <SavedRoutes routes={profile.savedRoutes} onRoutesChanged={handleRoutesChanged} />

      <DashboardTabs />

      <DeleteAccount onDeleted={handleAccountDeleted} />
    </div>
  );
}