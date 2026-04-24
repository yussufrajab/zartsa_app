'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface SmartPlateInputProps {
  value: string;
  onChange: (formatted: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export function SmartPlateInput({ value, onChange, placeholder, label, error }: SmartPlateInputProps) {
  const { t } = useTranslation();

  const formatAndValidate = useCallback((raw: string): string => {
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return cleaned;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAndValidate(e.target.value);
    onChange(formatted);
  };

  const isValidFormat = (val: string): boolean => {
    return /^[A-Z]\d{1,5}[A-Z]{0,3}$/.test(val);
  };

  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium">{label}</label>}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder || t('verify.plateNumberPlaceholder')}
        className={`w-full rounded-md border px-3 py-2 text-sm uppercase ${error ? 'border-red-500' : isValidFormat(value) ? 'border-green-500' : ''}`}
        maxLength={10}
        autoComplete="off"
        spellCheck={false}
      />
      {value && !isValidFormat(value) && value.length > 2 && (
        <p className="mt-1 text-xs text-amber-600">
          {t('verify.formatHint')}
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {isValidFormat(value) && (
        <p className="mt-1 text-xs text-green-600">{t('verify.formatValid')}</p>
      )}
    </div>
  );
}