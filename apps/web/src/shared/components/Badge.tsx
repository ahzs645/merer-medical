import { type ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-primary-100 text-primary-800',
};

/**
 * Shared status pill. Tabs previously re-implemented this per screen with
 * inconsistent shapes and colors for the same meaning; use this so a given
 * tone reads the same everywhere.
 */
export function Badge({
  tone = 'neutral',
  className = '',
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
