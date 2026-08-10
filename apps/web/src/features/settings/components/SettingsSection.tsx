import { PropsWithChildren, ReactNode } from 'react';

type SettingsSectionProps = PropsWithChildren<{
  /** Title shown in the card header. */
  title: string;
  /** Anchor id so the page can scroll to this section via `#id`. */
  id?: string;
  /** Optional supporting copy shown under the title. */
  description?: string;
  /** Optional leading icon for the header. */
  icon?: ReactNode;
  /** Optional control rendered at the end of the header row (e.g. a link). */
  action?: ReactNode;
}>;

/**
 * A single settings section rendered as a card. Gives every group on the
 * Settings page a consistent header, padding, and visual separation.
 */
export function SettingsSection({
  title,
  id,
  description,
  icon,
  action,
  children,
}: SettingsSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          {icon ? (
            <span className="text-primary-600 flex-shrink-0">{icon}</span>
          ) : null}
          <h2 className="min-w-0 flex-1 text-lg font-extrabold text-gray-900">
            {title}
          </h2>
          {action ? <div className="flex-shrink-0">{action}</div> : null}
        </div>
        {description ? (
          <p className="mt-1 max-w-xl text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
