import { Fragment, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { Dialog, Transition } from '@headlessui/react';
import {
  Cog6ToothIcon,
  DocumentIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
  PlusCircleIcon,
  PlusIcon,
  QueueListIcon,
  ShareIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

import logo from '../../assets/img/white-logo.svg';
import { Routes as AppRoutes } from '../../Routes';
import { useUser } from '../../app/providers/UserProvider';
import { TabButton } from './TabButton';
import { useLocalConfig } from '../../app/providers/LocalConfigProvider';
import { NotificationCenter } from '../../features/notifications/NotificationCenter';
import { CommandPalette } from './CommandPalette';
import { TutorialOverlay } from '../../features/tutorial/TutorialOverlay';
import { isDemoMode } from '../utils/demoMode';

export function TabWrapper() {
  const user = useUser(),
    { experimental__use_openai_rag } = useLocalConfig();
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="mobile-full-height relative flex min-h-0 max-w-[100vw] flex-col overflow-hidden md:flex-row-reverse">
      {!isDemoMode() && <TutorialOverlay />}
      <div className="min-h-0 flex-grow overflow-y-auto">
        <Outlet />
      </div>
      <div className="flex-0 md:bg-primary-800 z-20 w-full bg-slate-100 md:relative md:bottom-auto md:top-0 md:h-full md:w-auto">
        <div className="pb-safe md:pb-0 mx-auto flex w-full max-w-3xl justify-around md:h-full md:w-64 md:flex-col md:justify-start">
          <div className="hidden items-center md:flex">
            <img src={logo} className="h-20 w-20 p-4" alt="logo"></img>
            <div className="ml-auto flex items-center pr-2">
              <Link
                to={AppRoutes.Sharing}
                className="mx-1 my-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-primary-700 bg-primary-900/30 text-primary-100 hover:bg-primary-700"
                aria-label="Sharing"
                title="Sharing"
              >
                <ShareIcon className="h-5 w-5" />
              </Link>
              <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
            </div>
          </div>
          <TabButton
            route={AppRoutes.Timeline}
            title="Timeline"
            icon={<NewspaperIcon />}
          />
          <TabButton
            route={AppRoutes.Summary}
            title="Summary"
            icon={<QueueListIcon />}
          />
          {/* The Records tab used to carry an overlaid "+" pinned to its top
              corner: a second tap target inside a tab, too small to hit
              cleanly and unexplained by any label. Adding a record now lives
              where the records are — the "Add record" button in the Records
              banner — with a labelled entry in the More sheet as the reachable
              -from-anywhere path. */}
          <TabButton
            route={AppRoutes.Records}
            title="Records"
            icon={<DocumentIcon />}
          />
          <div className="hidden md:contents">
            <TabButton
              route={AppRoutes.Utilities}
              title="Utilities"
              icon={<WrenchScrewdriverIcon />}
            />
          </div>
          {experimental__use_openai_rag && (
            <div className="hidden md:contents">
              <TabButton
                route={AppRoutes.MereAIAssistant}
                title="Mere Assistant"
                smallTitle="Assistant"
                icon={<SparklesIcon />}
              />
            </div>
          )}
          <div className="hidden md:contents">
            <TabButton
              route={AppRoutes.AddConnection}
              title="Sources"
              icon={<PlusCircleIcon />}
            />
          </div>
          <div className="hidden md:contents">
            <TabButton
              route={AppRoutes.Settings}
              title="Settings"
              icon={<Cog6ToothIcon />}
            />
          </div>
          <div className="hidden md:contents">
            <NotificationCenter />
          </div>
          <MobileMoreButton
            open={moreOpen}
            setOpen={setMoreOpen}
            showAssistant={!!experimental__use_openai_rag}
            onOpenSearch={() => setSearchOpen(true)}
          />
          <div className="hidden md:block md:flex-1"></div>
          <div className="border-primary-700 hidden flex-shrink-0 border-t p-4 md:block">
            <div className="group block flex-shrink-0">
              <div className="flex items-center">
                <div className="inline-block h-10 w-10 rounded-full border-2 border-white bg-slate-100">
                  {user.profile_picture?.data === undefined ? (
                    <svg
                      className="h-full w-full rounded-full text-gray-800"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <img
                      className="h-full w-full rounded-full text-gray-300"
                      src={user.profile_picture.data}
                      alt="profile"
                    ></img>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-base font-medium text-white">
                    {user?.first_name
                      ? `${user.first_name} ${user.last_name}`
                      : 'Unknown User'}
                  </p>
                  <Link
                    to={AppRoutes.Settings}
                    className="-my-1 inline-flex min-h-[44px] items-center text-sm font-medium text-indigo-200 group-hover:text-white"
                  >
                    {user?.first_name ? 'View details' : 'Add User Details'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileMoreButton({
  open,
  setOpen,
  showAssistant,
  onOpenSearch,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  showAssistant: boolean;
  onOpenSearch: () => void;
}) {
  const location = useLocation();
  // When the user taps "Search", defer opening the palette until the sheet has
  // finished closing — otherwise the sheet's focus-restore fires after the
  // palette focuses its input and steals focus back (mobile focus race).
  const pendingSearch = useRef(false);
  const moreRoutes = [
    AppRoutes.Utilities,
    AppRoutes.MereAIAssistant,
    AppRoutes.AddConnection,
    AppRoutes.Settings,
  ];
  const isActive = moreRoutes.some((route) =>
    route === AppRoutes.Utilities
      ? location.pathname.startsWith(AppRoutes.Utilities)
      : location.pathname === route,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-24 flex-col items-center justify-center p-2 text-white duration-75 active:scale-90 sm:active:scale-95 md:hidden ${
          isActive ? 'bg-gray-0 border-primary border-t-2' : ''
        }`}
        aria-label="More navigation"
      >
        <span
          className={`h-5 w-5 text-base ${
            isActive ? 'text-primary font-bold' : 'text-slate-800'
          }`}
        >
          <EllipsisHorizontalIcon />
        </span>
        <span
          className={`pt-1 text-xs ${
            isActive ? 'text-primary font-bold' : 'text-slate-800'
          }`}
        >
          More
        </span>
      </button>

      <Transition.Root
        show={open}
        as={Fragment}
        afterLeave={() => {
          if (pendingSearch.current) {
            pendingSearch.current = false;
            onOpenSearch();
          }
        }}
      >
        <Dialog as="div" className="relative z-40 md:hidden" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-x-0 bottom-0 z-40">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              <Dialog.Panel className="pb-safe rounded-t-xl bg-white shadow-xl">
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300" />
                <Dialog.Title className="px-4 pb-2 pt-4 text-sm font-semibold text-gray-900">
                  More
                </Dialog.Title>
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  <MobileMoreLink
                    route={AppRoutes.AddRecord}
                    title="Add record"
                    icon={<PlusIcon />}
                    onClick={() => setOpen(false)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      pendingSearch.current = true;
                      setOpen(false);
                    }}
                    className="flex min-h-[44px] items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-slate-800"
                  >
                    <span className="h-5 w-5 flex-shrink-0">
                      <MagnifyingGlassIcon />
                    </span>
                    <span className="min-w-0 truncate">Search</span>
                  </button>
                  <MobileMoreLink
                    route={AppRoutes.Utilities}
                    title="Utilities"
                    icon={<WrenchScrewdriverIcon />}
                    onClick={() => setOpen(false)}
                  />
                  {showAssistant && (
                    <MobileMoreLink
                      route={AppRoutes.MereAIAssistant}
                      title="Assistant"
                      icon={<SparklesIcon />}
                      onClick={() => setOpen(false)}
                    />
                  )}
                  <MobileMoreLink
                    route={AppRoutes.AddConnection}
                    title="Sources"
                    icon={<PlusCircleIcon />}
                    onClick={() => setOpen(false)}
                  />
                  <MobileMoreLink
                    route={AppRoutes.Settings}
                    title="Settings"
                    icon={<Cog6ToothIcon />}
                    onClick={() => setOpen(false)}
                  />
                  <div className="col-span-2 [&>button]:w-full [&>button]:rounded-lg [&>button]:border [&>button]:border-gray-200 [&>button]:bg-gray-50 [&>button]:p-3 [&>button]:text-slate-800">
                    <NotificationCenter />
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}

function MobileMoreLink({
  route,
  title,
  icon,
  onClick,
}: {
  route: AppRoutes;
  title: string;
  icon: JSX.Element;
  onClick: () => void;
}) {
  const location = useLocation();
  const isActive =
    route === AppRoutes.Utilities
      ? location.pathname.startsWith(AppRoutes.Utilities)
      : location.pathname === route;

  return (
    <Link
      to={route}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border p-3 text-sm font-semibold ${
        isActive
          ? 'border-primary bg-primary-50 text-primary'
          : 'border-gray-200 bg-gray-50 text-slate-800'
      }`}
    >
      <span className="h-5 w-5 flex-shrink-0">{icon}</span>
      <span className="min-w-0 truncate">{title}</span>
    </Link>
  );
}
