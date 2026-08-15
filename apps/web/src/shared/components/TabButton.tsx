import { Link, useLocation } from 'react-router-dom';
import { Routes as AppRoutes } from '../../Routes';

export function TabButton({
  route,
  title,
  smallTitle = '',
  icon,
  collapsed = false,
}: {
  route: AppRoutes;
  title: string;
  smallTitle?: string;
  icon: JSX.Element;
  /** Desktop rail is icons only; the label becomes a hover tooltip. */
  collapsed?: boolean;
}) {
  const location = useLocation()?.pathname;
  const isActive =
    route === AppRoutes.Records
      ? location.startsWith(AppRoutes.Records)
      : route === AppRoutes.Utilities
        ? location.startsWith(AppRoutes.Utilities)
        : location === route;

  const linkClassName = `group relative flex w-24 flex-col items-center justify-center p-2 text-white duration-75 active:scale-90 sm:active:scale-95 md:m-1 md:w-auto md:flex-row md:rounded-md ${
    collapsed ? 'md:justify-center md:p-3' : 'md:justify-start md:p-4'
  } ${
    isActive
      ? 'bg-gray-0 md:bg-primary-700 border-primary border-t-2 md:border-t-0'
      : ''
  }`;

  const labelClass = `pt-1 text-xs md:pt-0 md:text-base md:text-white ${
    isActive ? 'text-primary font-bold' : 'text-slate-800'
  } ${collapsed ? 'md:hidden' : ''}`;

  return (
    <Link to={route} className={linkClassName}>
      <p
        className={`font-xs h-5 w-5 text-base md:h-8 md:w-8 md:text-white ${
          collapsed ? 'md:me-0' : 'md:me-4'
        } ${isActive ? 'text-primary font-bold' : 'text-slate-800'}`}
      >
        {icon}
      </p>
      {smallTitle ? (
        <>
          <p className={`hidden md:block ${labelClass}`}>{title}</p>
          <p className={`md:hidden ${labelClass}`}>{smallTitle}</p>
        </>
      ) : (
        <p className={labelClass}>{title}</p>
      )}
      <NavTooltip label={title} collapsed={collapsed} />
    </Link>
  );
}

/**
 * The label of a collapsed rail item.
 *
 * Collapsed, the icon is the only thing on screen naming the destination, so
 * the name has to survive twice over: `sr-only` for anyone not looking at it,
 * and a bubble on hover or keyboard focus for everyone else. `start-full`
 * places it on the content side of the rail in both reading directions.
 */
export function NavTooltip({
  label,
  collapsed,
}: {
  label: string;
  collapsed: boolean;
}) {
  if (!collapsed) return null;

  return (
    <>
      {/* `hidden md:inline` because the visible label is only suppressed from
          `md` up — below that the rail is the bottom bar and still shows it,
          and a second copy would read the name twice. */}
      <span className="sr-only hidden md:inline">{label}</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute start-full top-1/2 z-30 ms-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:transition-opacity md:block"
      >
        {label}
      </span>
    </>
  );
}
