import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';

export interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
  error?: string;
}

export function OtpInput({ length = 6, onComplete, disabled, error }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...values];
    newValues[index] = value.slice(-1);
    setValues(newValues);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const otp = newValues.join('');
    if (otp.length === length && !newValues.includes('')) {
      onComplete(otp);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const newValues = [...values];
    pasted.split('').forEach((char, i) => {
      if (i < length) newValues[i] = char;
    });
    setValues(newValues);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
    if (pasted.length === length) {
      onComplete(newValues.join(''));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-2">
        {values.map((value, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            className={cn(
              'h-14 w-12 rounded-xl border-2 text-center text-xl font-bold text-[#0d1820] transition-all duration-200',
              'focus:outline-none focus:border-[#0a7c5c] focus:ring-3 focus:ring-[#0a7c5c]/15 focus:bg-white',
              error
                ? 'border-[#d4322c]'
                : value
                  ? 'border-[#0a7c5c] bg-white shadow-[0_0_0_3px_rgba(10,124,92,0.12)]'
                  : 'border-[#d4dadf] bg-[#f5f9f7] hover:border-[#b0bcc5]'
            )}
          />
        ))}
      </div>
      {error && <p className="text-center text-xs text-[#d4322c]">{error}</p>}
    </div>
  );
}