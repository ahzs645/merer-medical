import { Fragment, type ReactNode } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

/**
 * A sentence of explanation parked behind an ⓘ, opened by press.
 *
 * Press, not hover: a phone has no hover, so a hover-only tooltip is simply
 * invisible to half the people reading this app. One affordance for both —
 * press to open, press outside or Escape to close, focusable from a keyboard —
 * beats a tooltip on the desktop and nothing on the phone.
 *
 * The bubble is positioned against the nearest positioned ancestor, not the
 * trigger: an ⓘ sitting two thirds of the way across a 390px line has no room
 * for a 288px bubble on either side of it, so anchoring to the trigger runs off
 * the screen whichever edge you pick. Give the row a `relative` and the bubble
 * spans it.
 */
export function InfoTip({
  label,
  children,
  panelClassName = 'inset-x-0 top-full mt-1 sm:inset-x-auto sm:start-0 sm:w-96',
}: {
  /** The accessible name of the button — say what the explanation is about. */
  label: string;
  children: ReactNode;
  panelClassName?: string;
}) {
  return (
    <Popover as="span" className="inline-flex">
      {/* 44px of target, 20px of layout: `-my-3` pulls the button's own height
          back out of the line so an ⓘ costs a glyph's worth of row, not a
          control's. Callers need 12px of clearance under the line — less than
          that and the target starts stealing taps from whatever is below. */}
      <Popover.Button className="focus-visible:ring-primary-500 -my-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2">
        <InformationCircleIcon className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="motion-safe:transition-opacity motion-safe:duration-100"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="motion-safe:transition-opacity motion-safe:duration-75"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        {/* Same skin as the collapsed rail's tooltip, so the app has one
            tooltip rather than two that nearly match. */}
        <Popover.Panel
          className={`absolute z-30 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium leading-relaxed text-white shadow-lg ring-1 ring-white/10 ${panelClassName}`}
        >
          {children}
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
