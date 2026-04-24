export const NOTIFICATION_TYPES = {
  LICENSE_EXPIRY_60: 'license_expiry_60',
  LICENSE_EXPIRY_30: 'license_expiry_30',
  LICENSE_EXPIRY_14: 'license_expiry_14',
  LICENSE_EXPIRY_7: 'license_expiry_7',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  PAYMENT_RECEIPT: 'payment_receipt',
  BUS_DELAY: 'bus_delay',
  ROUTE_CHANGE: 'route_change',
  NEW_FINE: 'new_fine',
  COMPLAINT_STATUS_UPDATE: 'complaint_status_update',
  LOST_ITEM_MATCH: 'lost_item_match',
  NEW_ANNOUNCEMENT: 'new_announcement',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { sw: string; en: string }> = {
  license_expiry_60: { sw: 'Leseni yako inaisha miezi 2', en: 'Your license expires in 60 days' },
  license_expiry_30: { sw: 'Leseni yako inaisha mwezi 1', en: 'Your license expires in 30 days' },
  license_expiry_14: { sw: 'Leseni yako inaisha wiki 2', en: 'Your license expires in 14 days' },
  license_expiry_7: { sw: 'Leseni yako inaisha siku 7', en: 'Your license expires in 7 days' },
  payment_confirmation: { sw: 'Malipo yamekubaliwa', en: 'Payment confirmed' },
  payment_receipt: { sw: 'Risiti ya malipo', en: 'Payment receipt' },
  bus_delay: { sw: 'Kuchelewa kwa bus', en: 'Bus delay alert' },
  route_change: { sw: 'Mabadiliko ya njia', en: 'Route change alert' },
  new_fine: { sw: 'Faini mpya', en: 'New fine issued' },
  complaint_status_update: { sw: 'Maslahi ya malalamiko', en: 'Complaint status update' },
  lost_item_match: { sw: 'Kifaa chako kimepatikana', en: 'Lost item match found' },
  new_announcement: { sw: 'Habari mpya', en: 'New announcement' },
};

export const DEFAULT_NOTIFICATION_PREFS: Record<NotificationType, { inApp: boolean; sms: boolean; email: boolean }> = {
  license_expiry_60: { inApp: true, sms: true, email: false },
  license_expiry_30: { inApp: true, sms: true, email: true },
  license_expiry_14: { inApp: true, sms: true, email: true },
  license_expiry_7: { inApp: true, sms: true, email: true },
  payment_confirmation: { inApp: true, sms: true, email: false },
  payment_receipt: { inApp: true, sms: false, email: true },
  bus_delay: { inApp: true, sms: true, email: false },
  route_change: { inApp: true, sms: true, email: false },
  new_fine: { inApp: true, sms: true, email: true },
  complaint_status_update: { inApp: true, sms: true, email: false },
  lost_item_match: { inApp: true, sms: true, email: true },
  new_announcement: { inApp: true, sms: false, email: false },
};