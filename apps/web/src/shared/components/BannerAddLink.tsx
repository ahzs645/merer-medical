import { PlusIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';

/**
 * Consistent "Add" button for record banners. Routes to the manual-entry form,
 * optionally with a `type`/`specialty` preset so the guided picker is skipped.
 */
export function BannerAddLink({ to, label }: { to: string; label: string }) {
  const { t } = useInterfaceLanguage();
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/25 md:self-auto"
    >
      <PlusIcon className="h-5 w-5" />
      {t(label)}
    </Link>
  );
}
