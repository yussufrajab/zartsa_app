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
import { PageHeader } from '@/components/ui/page-header';
import { ListSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

type ProfileTab = 'profile' | 'routes' | 'dashboard';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

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
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
        <PageHeader title={t('profile.title')} backHref="/" />
        <ListSkeleton count={4} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
        <PageHeader title={t('profile.title')} backHref="/" />
        <p className="text-sm text-[#637885]">{t('common.error')}</p>
      </div>
    );
  }

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'profile', label: t('profile.editProfile') },
    { key: 'routes', label: t('profile.savedRoutes') },
    { key: 'dashboard', label: t('profile.dashboard') },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('profile.title')} backHref="/" />

      {/* User info card with gradient header */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="bg-gradient-to-br from-[#0a7c5c] to-[#085a43] px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/25 border-4 border-white/50 backdrop-blur-sm text-3xl font-bold text-white">
              {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">{profile.firstName} {profile.lastName}</h2>
              <p className="text-sm text-white/70">{profile.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex gap-1 p-1 rounded-2xl bg-[#eaeef0] mb-6">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              'rounded-xl px-5 py-2 text-sm font-semibold transition-all',
              activeTab === tab.key
                ? 'bg-white shadow-sm text-[#0d1820]'
                : 'text-[#637885] hover:text-[#2e3f4c]'
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileForm profile={profile} onUpdated={handleProfileUpdated} />}
      {activeTab === 'routes' && <SavedRoutes routes={profile.savedRoutes} onRoutesChanged={handleRoutesChanged} />}
      {activeTab === 'dashboard' && <DashboardTabs />}
      {activeTab === 'profile' && <DeleteAccount onDeleted={handleAccountDeleted} />}
    </div>
  );
}