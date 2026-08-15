import React, { Fragment, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { Dialog, Transition } from '@headlessui/react';
import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
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
import { buildAddRecordPath } from '../../features/manual-entry/addRecordPath';
import { NavTooltip, TabButton } from './TabButton';
import {
  useLocalConfig,
  useUpdateLocalConfig,
} from '../../app/providers/LocalConfigProvider';
import { NotificationCenter } from '../../features/notifications/NotificationCenter';
import { CommandPalette } from './CommandPalette';
import { TutorialOverlay } from '../../features/tutorial/TutorialOverlay';
import { isDemoMode } from '../utils/demoMode';

/**
 * Suspense fallback for a route whose chunk hasn't arrived yet.
 *
 * Held back for a beat before it draws anything: on a warm cache a chunk
 * resolves within a frame or two, and a spinner that appears and vanishes that
 * fast reads as a flicker on every navigation rather than as loading.
 */
function RouteLoading() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full w-full items-center justify-center p-8"
    >
      {visible && (
        <>
          <span className="border-primary-600 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent motion-reduce:animate-none" />
          <span className="sr-only">Loading…</span>
        </>
      )}
    </div>
  );
}

export function TabWrapper() {
  const user = useUser(),
    { experimental__use_openai_rag, side_nav_collapsed } = useLocalConfig();
  const updateLocalConfig = useUpdateLocalConfig();
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Only the `md`+ rail collapses. Below that the same markup is the bottom
  // bar, which has nothing to collapse, so every collapsed style is `md:`.
  const collapsed = Boolean(side_nav_collapsed);
  const toggleNav = () => updateLocalConfig({ side_nav_collapsed: !collapsed });
  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name}`
    : 'Unknown User';

  return (
    <div className="mobile-full-height relative flex min-h-0 max-w-[100vw] flex-col overflow-hidden md:flex-row-reverse">
      {!isDemoMode() && <TutorialOverlay />}
      {/* First stop in the tab order on every route, and the only way past the
          secondary navigation some pages open with — the timeline's date rail,
          the Records category list. It targets the `main` below, which is why
          `main` is here and not inside each page: one landmark, 46 routes. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-dialog focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-md focus:bg-white focus:px-4 focus:text-sm focus:font-semibold focus:text-primary-800 focus:shadow-lg focus:ring-2 focus:ring-primary-600"
      >
        Skip to content
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-0 flex-grow overflow-y-auto focus:outline-none"
      >
        {/* Routes are code-split, so opening one for the first time can
            suspend while its chunk arrives. The fallback is deliberately quiet
            — a centred spinner, no banner or skeleton furniture — because on a
            warm cache it is on screen for a frame or two, and anything with
            layout in it would flash. */}
        <React.Suspense fallback={<RouteLoading />}>
          <Outlet />
        </React.Suspense>
      </main>
      <div className="flex-0 md:bg-primary-800 z-20 w-full bg-slate-100 print:hidden md:relative md:bottom-auto md:top-0 md:h-full md:w-auto">
        <div
          className={`pb-safe md:pb-0 mx-auto flex w-full max-w-3xl justify-around md:h-full md:flex-col md:justify-start motion-safe:md:transition-[width] motion-safe:md:duration-200 ${
            collapsed ? 'md:w-[4.5rem]' : 'md:w-64'
          }`}
        >
          <div
            className={`hidden md:flex ${
              collapsed
                ? 'flex-col items-center gap-1 px-2 pt-3'
                : 'items-center'
            }`}
          >
            <img
              src={logo}
              className={collapsed ? 'h-10 w-10' : 'h-20 w-20 p-4'}
              alt="logo"
            ></img>
            <div
              className={`flex items-center ${
                collapsed ? 'flex-col gap-1' : 'ml-auto pr-2'
              }`}
            >
              <Link
                to={AppRoutes.Sharing}
                className="group relative mx-1 my-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-primary-700 bg-primary-900/30 text-primary-100 hover:bg-primary-700"
                aria-label="Sharing"
              >
                <ShareIcon className="h-5 w-5" />
                <NavTooltip label="Sharing" collapsed={collapsed} />
              </Link>
              <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
              <button
                type="button"
                onClick={toggleNav}
                aria-pressed={collapsed}
                className="group relative mx-1 my-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-primary-700 bg-primary-900/30 text-primary-100 hover:bg-primary-700"
                aria-label={
                  collapsed ? 'Expand navigation' : 'Collapse navigation'
                }
              >
                {collapsed ? (
                  <ChevronDoubleRightIcon className="h-5 w-5 rtl:rotate-180" />
                ) : (
                  <ChevronDoubleLeftIcon className="h-5 w-5 rtl:rotate-180" />
                )}
                <NavTooltip label="Expand navigation" collapsed={collapsed} />
              </button>
            </div>
          </div>
          <RailAddRecordButton collapsed={collapsed} />
          <TabButton
            route={AppRoutes.Timeline}
            title="Timeline"
            icon={<NewspaperIcon />}
            collapsed={collapsed}
          />
          <TabButton
            route={AppRoutes.Summary}
            title="Summary"
            icon={<QueueListIcon />}
            collapsed={collapsed}
          />
          {/* The Records tab used to carry an overlaid "+" pinned to its top
              corner: a second tap target inside a tab, too small to hit
              cleanly and unexplained by any label. Adding a record now lives
              where the records are — the "Add record" button in the Records
              banner — with the labelled entries above and in the More sheet as
              the reachable-from-anywhere path on each size. */}
          <TabButton
            route={AppRoutes.Records}
            title="Records"
            icon={<DocumentIcon />}
            collapsed={collapsed}
          />
          <div className="hidden md:contents">
            <TabButton
              route={AppRoutes.Utilities}
              title="Utilities"
              icon={<WrenchScrewdriverIcon />}
              collapsed={collapsed}
            />
          </div>
          {experimental__use_openai_rag && (
            <div className="hidden md:contents">
              <TabButton
                route={AppRoutes.MereAIAssistant}
                title="Mere Assistant"
                smallTitle="Assistant"
                icon={<SparklesIcon />}
                collapsed={collapsed}
              />
            </div>
          )}
          <div className="hidden md:contents">
            <TabButton
              route={AppRoutes.AddConnection}
              title="Sources"
              icon={<PlusCircleIcon />}
              collapsed={collapsed}
            />
          </div>
          <div className="hidden md:contents">
            <TabButton
              route={AppRoutes.Settings}
              title="Settings"
              icon={<Cog6ToothIcon />}
              collapsed={collapsed}
            />
          </div>
          <div className="hidden md:contents">
            <NotificationCenter collapsed={collapsed} />
          </div>
          <MobileMoreButton
            open={moreOpen}
            setOpen={setMoreOpen}
            showAssistant={!!experimental__use_openai_rag}
            onOpenSearch={() => setSearchOpen(true)}
          />
          <div className="hidden md:block md:flex-1"></div>
          <div
            className={`border-primary-700 hidden flex-shrink-0 border-t md:block ${
              collapsed ? 'p-2' : 'p-4'
            }`}
          >
            {/* Collapsed, the whole card becomes the avatar and the link that
                was under it, so the rail still reaches Settings in one tap. */}
            <Link
              to={AppRoutes.Settings}
              className={`group relative block flex-shrink-0 ${
                collapsed ? 'flex justify-center rounded-md py-1' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="inline-block h-10 w-10 shrink-0 rounded-full border-2 border-white bg-slate-100">
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
                <div className={`ml-3 ${collapsed ? 'md:hidden' : ''}`}>
                  <p className="text-base font-medium text-white">{userName}</p>
                  <span className="-my-1 inline-flex min-h-[44px] items-center text-sm font-medium text-indigo-200 group-hover:text-white">
                    {user?.first_name ? 'View details' : 'Add User Details'}
                  </span>
                </div>
              </div>
              <NavTooltip label={userName} collapsed={collapsed} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The link behind both global adds.
 *
 * The rail and the More sheet are on screen everywhere, so "the page the button
 * lives on" — what `returnTo` is for — is wherever the user happens to be. The
 * one path that cannot be a return is the form itself, which would send them
 * round the loop again.
 */
function useGlobalAddRecordPath(): string {
  const { pathname } = useLocation();

  return buildAddRecordPath({
    returnTo: pathname === AppRoutes.AddRecord ? undefined : pathname,
  });
}

/**
 * Adding a record was the one thing a phone could do from anywhere and a
 * desktop could not: the More sheet has carried "Add record" ever since the
 * unlabelled "+" came off the Records tab, while the 16rem rail offered six
 * destinations and no action, sending anyone not already on a record page
 * through the Records hub or Sources to reach the form.
 *
 * It sits above the tabs instead of among them because it is not a seventh
 * place to be, and wears the record banner's solid-action skin so the rail's
 * add and the banner's add read as the same button rather than two different
 * ones. Collapsed it is a glyph — the shape that was wrong on the Records tab —
 * but only because the name survives as `sr-only` text and a `NavTooltip`, the
 * same contract every collapsed rail item keeps.
 *
 * `md:` only: the phone's bottom bar has four items and the More sheet already
 * has this entry.
 */
function RailAddRecordButton({ collapsed }: { collapsed: boolean }) {
  const addRecordPath = useGlobalAddRecordPath();

  return (
    <Link
      to={addRecordPath}
      className={`group text-primary-800 ring-primary-100 hover:bg-primary-50 relative hidden items-center rounded-md bg-white text-sm font-semibold shadow-sm ring-1 ring-inset md:flex ${
        collapsed
          ? 'md:mx-auto md:my-3 md:h-11 md:w-11 md:justify-center'
          : // 44px expanded as well as collapsed: `py-2.5` around a 20px line
            // is 40px, and this app's own audit counts a 38px Save button as a
            // defect.
            'md:mx-3 md:my-3 md:min-h-[44px] md:gap-2 md:px-3 md:py-2.5'
      }`}
    >
      <PlusIcon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span>Add record</span>}
      <NavTooltip label="Add record" collapsed={collapsed} />
    </Link>
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
  const addRecordPath = useGlobalAddRecordPath();
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
        <Dialog
          as="div"
          className="relative z-dialog md:hidden"
          onClose={setOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-out duration-200 motion-reduce:transition-none"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150 motion-reduce:transition-none"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-x-0 bottom-0 z-dialog">
            {/* The sheet already slid up; it was just doing it on `transition:
                all` with the default curve, so it read as a jump. Transform
                only, and a decelerating curve over 280ms — the shape a sheet
                pushed by a thumb has. Reduced motion gets the end state. */}
            <Transition.Child
              as={Fragment}
              enter="transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="transition-transform duration-200 ease-in motion-reduce:transition-none"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              {/* `pt-2.5` on the panel, not `mt-` on the grabber: a top margin
                  on the first child collapses out through the panel, which
                  pushed the sheet down and left the grabber sitting on its
                  edge instead of inside it. */}
              <Dialog.Panel className="pb-safe rounded-t-2xl bg-white pt-2.5 shadow-xl">
                <div
                  aria-hidden="true"
                  className="mx-auto h-1.5 w-10 rounded-full bg-gray-300"
                />
                <Dialog.Title className="px-4 pb-2 pt-3 text-sm font-semibold text-gray-900">
                  More
                </Dialog.Title>
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  <MobileMoreLink
                    route={AppRoutes.AddRecord}
                    to={addRecordPath}
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
  to,
  title,
  icon,
  onClick,
}: {
  route: AppRoutes;
  /**
   * The link, when it carries more than the route — the add entry appends a
   * `returnTo` so a record logged from the sheet lands the user back on the
   * page they opened it from, the same as the desktop rail's add. `route`
   * stays the plain route, because it is what decides the active style.
   */
  to?: string;
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
      to={to ?? route}
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
