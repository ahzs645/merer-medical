import { ReactNode, RefObject, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

const advancedAnchors = new Set([
  'advanced-tools',
  'terminology',
  'medication-interactions',
  'data',
  'downloadLink',
  'repair-source-links-hint',
  'experimental',
  'developer',
]);

const basicAnchors = new Set([
  'about-me',
  'interface-language',
  'privacy-and-security',
  'encrypt_database',
  'use_proxy',
  'about-mere',
]);

/** Keep the existing settings anchors usable when their group is in a panel. */
function activeLevel(hash: string, search: string): 'basic' | 'advanced' {
  const anchor = hash.replace(/^#/, '');
  if (advancedAnchors.has(anchor) || anchor.startsWith('experimental__')) {
    return 'advanced';
  }
  if (basicAnchors.has(anchor)) return 'basic';
  return new URLSearchParams(search).get('level') === 'advanced'
    ? 'advanced'
    : 'basic';
}

/** Scroll a settings destination without moving the surrounding app shell. */
export function scrollSettingsSectionIntoView(
  container: HTMLElement,
  section: HTMLElement,
  behavior: ScrollBehavior,
) {
  if (!container.contains(section)) return;
  const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
  const top =
    container.scrollTop +
    section.getBoundingClientRect().top -
    container.getBoundingClientRect().top -
    margin;
  container.scrollTo({ top: Math.max(0, top), behavior });
}

export function SettingsPanels({
  basic,
  advanced,
  scrollContainerRef,
}: {
  basic: ReactNode;
  advanced: ReactNode;
  scrollContainerRef: RefObject<HTMLElement>;
}) {
  const { t } = useInterfaceLanguage();
  const { pathname, search, hash } = useLocation();
  const level = activeLevel(hash, search);
  const [advancedVisited, setAdvancedVisited] = useState(level === 'advanced');

  useEffect(() => {
    if (level === 'advanced') setAdvancedVisited(true);
    if (!hash && scrollContainerRef.current) {
      // scrollIntoView also scrolls overflow-hidden ancestors, which can lift
      // the profile strip and bottom navigation out of the phone viewport.
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [level, hash, scrollContainerRef]);

  const destination = (nextLevel: 'basic' | 'advanced') => {
    const params = new URLSearchParams(search);
    if (nextLevel === 'advanced') params.set('level', 'advanced');
    else params.delete('level');
    const nextSearch = params.toString();
    return { pathname, search: nextSearch ? `?${nextSearch}` : '', hash: '' };
  };

  return (
    <>
      <nav
        aria-label={t('Settings sections')}
        className="sticky top-0 z-10 grid grid-cols-2 gap-2 bg-gray-50 py-1"
      >
        {(['basic', 'advanced'] as const).map((item) => (
          <Link
            key={item}
            to={destination(item)}
            aria-current={level === item ? 'page' : undefined}
            className={`focus:ring-primary-500 inline-flex min-h-9 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              level === item
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {item === 'basic' ? t('Basic') : t('Advanced')}
          </Link>
        ))}
      </nav>
      {/* Switching levels must not discard a selected import or unsaved form.
          Advanced tools are mounted on first use, then retained while hidden. */}
      <div
        role="region"
        aria-label={t('Basic settings')}
        hidden={level !== 'basic'}
        className="space-y-4"
      >
        <p className="hidden text-sm text-gray-600 sm:block">
          {t('Manage your profile, language, and privacy preferences.')}
        </p>
        {basic}
      </div>
      <div
        role="region"
        aria-label={t('Advanced settings')}
        hidden={level !== 'advanced'}
        className="space-y-4"
      >
        <p className="text-sm text-gray-600">
          {t(
            'Manage terminology, medication plugins, storage, and optional tools.',
          )}
        </p>
        {(advancedVisited || level === 'advanced') && advanced}
      </div>
    </>
  );
}
