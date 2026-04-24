export const ROLES = {
  CITIZEN: 'citizen',
  OPERATOR: 'operator',
  DRIVER: 'driver',
  OFFICER: 'officer',
  ADMIN: 'admin',
} as const;

export const ROLE_LABELS: Record<string, { sw: string; en: string }> = {
  citizen: { sw: 'Mrahi', en: 'Citizen' },
  operator: { sw: 'Mwendeshaji', en: 'Operator' },
  driver: { sw: 'Dereva', en: 'Driver' },
  officer: { sw: 'Afisa', en: 'Officer' },
  admin: { sw: 'Msimamizi', en: 'Administrator' },
};