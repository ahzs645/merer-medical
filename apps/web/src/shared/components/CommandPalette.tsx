import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BeakerIcon,
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentArrowDownIcon,
  DocumentIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  EyeIcon,
  FaceSmileIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
  PlusCircleIcon,
  QueueListIcon,
  ShareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../Routes';

type CommandPaletteItem = {
  title: string;
  description: string;
  route: string;
  keywords: string[];
  icon: typeof MagnifyingGlassIcon;
};

const COMMAND_ITEMS: CommandPaletteItem[] = [
  {
    title: 'Timeline',
    description: 'Review records by date',
    route: AppRoutes.Timeline,
    keywords: ['feed', 'history', 'recent', 'today', 'for you', 'activity'],
    icon: NewspaperIcon,
  },
  {
    title: 'Summary',
    description: 'Current health snapshot',
    route: AppRoutes.Summary,
    keywords: ['overview', 'health summary', 'wallet card', 'conditions'],
    icon: QueueListIcon,
  },
  {
    title: 'Labs',
    description: 'Results, ranges, and trends',
    route: AppRoutes.Labs,
    keywords: [
      'test results',
      'blood work',
      'bloodwork',
      'pathology',
      'reference range',
      'loinc',
      'glucose',
      'cbc',
    ],
    icon: BeakerIcon,
  },
  {
    title: 'Documents',
    description: 'Letters, referrals, consents, and attachments',
    route: AppRoutes.Documents,
    keywords: [
      'document center',
      'letters',
      'forms',
      'pdf',
      'referrals',
      'consent',
      'visit records',
    ],
    icon: DocumentTextIcon,
  },
  {
    title: 'Imaging',
    description: 'Imaging reports and studies',
    route: AppRoutes.Imaging,
    keywords: ['x-ray', 'xray', 'scan', 'mri', 'ct', 'ultrasound'],
    icon: DocumentIcon,
  },
  {
    title: 'Medications',
    description: 'Medication records and prescriptions',
    route: AppRoutes.Medications,
    keywords: ['medicine', 'meds', 'pills', 'prescriptions', 'rx', 'pharmacy'],
    icon: DocumentTextIcon,
  },
  {
    title: 'Problems',
    description: 'Conditions and health issues',
    route: AppRoutes.Problems,
    keywords: ['conditions', 'diagnoses', 'problem list', 'health issues'],
    icon: DocumentTextIcon,
  },
  {
    title: 'Care plans',
    description: 'Plans, goals, and care journeys',
    route: AppRoutes.CarePlans,
    keywords: ['care journey', 'goals', 'plan of care', 'tasks'],
    icon: ChartBarIcon,
  },
  {
    title: 'Trackers',
    description: 'Vitals and self-tracked measurements',
    route: AppRoutes.Trackers,
    keywords: ['vitals', 'blood pressure', 'weight', 'measurements'],
    icon: ChartBarIcon,
  },
  {
    title: 'Sharing',
    description: 'Export, emergency profile, and share grants',
    route: AppRoutes.Sharing,
    keywords: [
      'share my record',
      'download',
      'export',
      'proxy',
      'family access',
      'emergency',
      'vdt',
    ],
    icon: ShareIcon,
  },
  {
    title: 'Visit prep',
    description: 'Prepare for visits and review next steps',
    route: AppRoutes.VisitPrep,
    keywords: ['appointments', 'visits', 'to do', 'questionnaires', 'orders'],
    icon: DocumentArrowDownIcon,
  },
  {
    title: 'Audit log',
    description: 'Review access and provenance activity',
    route: AppRoutes.AuditLog,
    keywords: ['who accessed', 'access log', 'audit trail', 'provenance'],
    icon: ClockIcon,
  },
  {
    title: 'Dental',
    description: 'Dental records',
    route: AppRoutes.Dental,
    keywords: ['teeth', 'odontogram'],
    icon: FaceSmileIcon,
  },
  {
    title: 'Optometry',
    description: 'Eye care records',
    route: AppRoutes.Optometry,
    keywords: ['eye', 'vision', 'glasses', 'prescription'],
    icon: EyeIcon,
  },
  {
    title: 'Add record',
    description: 'Enter or upload a record manually',
    route: AppRoutes.AddRecord,
    keywords: ['upload', 'manual entry', 'new record', 'add lab'],
    icon: DocumentPlusIcon,
  },
  {
    title: 'Connections',
    description: 'Connect or import health sources',
    route: AppRoutes.AddConnection,
    keywords: ['sync', 'mychart', 'epic', 'cerner', 'healow', 'connect'],
    icon: PlusCircleIcon,
  },
  {
    title: 'Settings',
    description: 'Preferences, backups, and local security',
    route: AppRoutes.Settings,
    keywords: ['account', 'backup', 'import', 'password', 'security'],
    icon: Cog6ToothIcon,
  },
];

export function CommandPalette() {
  const { t } = useInterfaceLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return COMMAND_ITEMS;

    return COMMAND_ITEMS.map((item) => {
      const haystack = [
        item.title,
        item.description,
        item.route,
        ...item.keywords,
      ]
        .join(' ')
        .toLowerCase();
      const startsWithTitle = item.title
        .toLowerCase()
        .startsWith(normalizedQuery);
      const keywordHit = item.keywords.some((keyword) =>
        keyword.toLowerCase().includes(normalizedQuery),
      );
      const score = startsWithTitle
        ? 3
        : keywordHit
          ? 2
          : haystack.includes(normalizedQuery)
            ? 1
            : 0;
      return { item, score };
    })
      .filter(({ score }) => score > 0)
      .sort(
        (a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title),
      )
      .map(({ item }) => item);
  }, [query]);

  function runCommand(item: CommandPaletteItem) {
    setOpen(false);
    navigate(item.route);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-2 my-1 hidden items-center gap-2 rounded-md border border-primary-700 bg-primary-900/30 px-3 py-2 text-sm text-primary-100 hover:bg-primary-700 md:flex"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        {t('Search')}
        <span className="ml-auto rounded bg-primary-950 px-1.5 py-0.5 text-xs text-primary-100">
          ⌘K
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/40 p-3 sm:p-6">
      <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-gray-200">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Search records, pages, and actions')}
            className="min-w-0 flex-1 border-0 p-0 text-base text-gray-900 placeholder:text-gray-400 focus:ring-0"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label={t('Close search')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.length > 0 ? (
            results.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => runCommand(item)}
                  className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left hover:bg-primary-50"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {t(item.title)}
                      </span>
                      {active ? (
                        <span className="rounded bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-700">
                          {t('Current')}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-sm text-gray-600">
                      {t(item.description)}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-sm text-gray-600">
              {t('No matching pages or actions')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
