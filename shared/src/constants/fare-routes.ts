export const DALADALA_DEPARTURES = [
  'Stone Town',
  'Malindi',
  'Darajani',
  'Kariakoo',
  'Amaan',
] as const;

export const SHAMBA_DEPARTURES = [
  'Stone Town',
  'Malindi',
] as const;

export const DALADALA_DESTINATIONS: Record<string, string[]> = {
  'Stone Town': ['Fuoni', 'Mwanakwerekwe', 'Kiembe Samaki', 'Mikunguni', 'Chukwani'],
  'Malindi': ['Fuoni', 'Mwanakwerekwe', 'Stone Town'],
  'Darajani': ['Kiembe Samaki', 'Stone Town', 'Mikunguni'],
  'Kariakoo': ['Mwanakwerekwe', 'Fuoni'],
  'Amaan': ['Stone Town', 'Mwanakwerekwe'],
};

export const SHAMBA_DESTINATIONS: Record<string, string[]> = {
  'Stone Town': ['Paje', 'Jambiani', 'Nungwi', 'Kendwa', 'Matemwe', 'Michamvi', 'Uroa', 'Dongwe', 'Bwejuu'],
  'Malindi': ['Paje', 'Nungwi', 'Jambiani'],
};