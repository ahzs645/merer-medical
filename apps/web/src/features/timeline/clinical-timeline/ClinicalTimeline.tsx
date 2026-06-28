import { format } from 'date-fns';
import {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  DurationItem,
  LaneCategory,
  TimelineLane,
} from './types';
import { useClinicalTimelineData } from './useClinicalTimelineData';
import { CommentModal } from './CommentModal';
import {
  CommentTarget,
  commentKey,
  dayKeyFromMs,
  useTimelineComments,
} from './useTimelineComments';

/** Opens the comment modal for a specific data point. */
type CommentClick = (
  category: LaneCategory,
  item: string,
  t: number,
  laneTitle: string,
) => void;

const HEADER_W = 150;
const HEADER_W_SM = 104;
const YAXIS_W = 48;
const SERIES_H = 64;
const MARKER_H = 44;
const DURATION_ROW_H = 20;
const X_AXIS_H = 26;
const CONTEXT_H = 46;
const DAY_MS = 86_400_000;

const CATEGORY_ORDER: LaneCategory[] = [
  'labs',
  'vitals',
  'medications',
  'conditions',
  'encounters',
];

// --------------------------------------------------------------------------

function useElementWidth() {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  // Callback ref so the observer attaches whenever the node mounts — including
  // after an early `loading` return, when a plain useEffect ref would miss it.
  const ref = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    const update = () => setWidth(Math.max(0, Math.floor(node.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    observerRef.current = observer;
  }, []);
  return [ref, width] as const;
}

/** Pad an extent by ~3% (or ±1 day when it collapses to a point). */
function padExtent([min, max]: [number, number]): [number, number] {
  if (min === max) return [min - DAY_MS, max + DAY_MS];
  const pad = (max - min) * 0.03;
  return [min - pad, max + pad];
}

function makeTicks([d0, d1]: [number, number], count: number): number[] {
  if (d1 <= d0) return [d0];
  const step = (d1 - d0) / count;
  return Array.from({ length: count + 1 }, (_, i) => d0 + i * step);
}

function formatTick(t: number, spanMs: number): string {
  if (spanMs > 730 * DAY_MS) return format(t, 'yyyy');
  if (spanMs > 90 * DAY_MS) return format(t, 'MMM yy');
  return format(t, 'MMM d');
}

/** Pack duration items into non-overlapping rows (in time space, zoom-stable). */
function packRows(items: DurationItem[], spanMs: number): number {
  const gap = Math.max(DAY_MS, spanMs * 0.004);
  const rowEnds: number[] = [];
  for (const item of items) {
    const end = Math.max(item.end, item.start);
    let placed = false;
    for (let i = 0; i < rowEnds.length; i++) {
      if (rowEnds[i] + gap < item.start) {
        rowEnds[i] = end;
        item.rowIndex = i;
        placed = true;
        break;
      }
    }
    if (!placed) {
      item.rowIndex = rowEnds.length;
      rowEnds.push(end);
    }
  }
  return Math.max(1, rowEnds.length);
}

function laneHeight(lane: TimelineLane, spanMs: number): number {
  if (lane.kind === 'series') return SERIES_H;
  if (lane.kind === 'marker') return MARKER_H;
  const rows = packRows(lane.durations || [], spanMs);
  return Math.max(56, 14 + rows * DURATION_ROW_H);
}

/** Categories whose packed duration lane can be split into per-item lanes. */
const SPLITTABLE: ReadonlySet<LaneCategory> = new Set<LaneCategory>([
  'medications',
  'conditions',
]);
/** Cap how many per-item lanes a split produces; the rest fold into "Other". */
const MAX_SPLIT_LANES = 24;

function latestStart(items: DurationItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.start), -Infinity);
}

/**
 * When a category is "expanded", replace its single packed duration lane with
 * one lane per distinct item label. The most-recent items win the individual
 * lanes; any overflow beyond MAX_SPLIT_LANES collapses into one "Other" lane so
 * a large record can't explode into hundreds of rows.
 */
function expandLanes(
  lanes: TimelineLane[],
  expanded: Set<LaneCategory>,
): TimelineLane[] {
  const out: TimelineLane[] = [];
  for (const lane of lanes) {
    const splittable =
      lane.kind === 'duration' && SPLITTABLE.has(lane.category);
    if (!splittable || !expanded.has(lane.category) || !lane.durations) {
      out.push(lane);
      continue;
    }
    const byLabel = new Map<string, DurationItem[]>();
    for (const item of lane.durations) {
      const arr = byLabel.get(item.label) || [];
      arr.push(item);
      byLabel.set(item.label, arr);
    }
    const labels = [...byLabel.keys()].sort(
      (a, b) =>
        latestStart(byLabel.get(b) || []) - latestStart(byLabel.get(a) || []),
    );
    for (const label of labels.slice(0, MAX_SPLIT_LANES)) {
      const items = byLabel.get(label) || [];
      out.push({
        id: `${lane.id}::${label}`,
        title: label,
        subtitle: items.length > 1 ? `${items.length} periods` : undefined,
        kind: 'duration',
        category: lane.category,
        durations: items,
      });
    }
    const rest = labels.slice(MAX_SPLIT_LANES);
    if (rest.length > 0) {
      const restItems = rest.flatMap((label) => byLabel.get(label) || []);
      out.push({
        id: `${lane.id}::__other`,
        title: `Other (${rest.length})`,
        subtitle: `${restItems.length} items`,
        kind: 'duration',
        category: lane.category,
        durations: restItems,
      });
    }
  }
  return out;
}

// --------------------------------------------------------------------------

interface TooltipSection {
  category: LaneCategory;
  rows: {
    label: string;
    value: string;
    abnormal?: boolean;
    tone?: 'amended' | 'missing';
  }[];
}

export function ClinicalTimeline() {
  const { lanes, allTimestamps, extent, status } = useClinicalTimelineData();
  const comments = useTimelineComments();
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(
    null,
  );
  const [wrapRef, wrapWidth] = useElementWidth();

  const [domain, setDomain] = useState<[number, number] | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<LaneCategory>>(
    new Set(),
  );
  const [hiddenLanes, setHiddenLanes] = useState<Set<string>>(new Set());
  const [showLanePicker, setShowLanePicker] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<
    Set<LaneCategory>
  >(new Set());
  const [laneOrder, setLaneOrder] = useState<string[]>([]);
  const laneDragIndexRef = useRef<number | null>(null);
  const [hover, setHover] = useState<{
    t: number;
    px: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  const fullExtent = useMemo(
    () => (extent ? padExtent(extent) : null),
    [extent],
  );

  // Reset the brushed window whenever the underlying extent changes.
  useEffect(() => {
    setDomain(fullExtent);
  }, [fullExtent]);

  const headerW = wrapWidth > 0 && wrapWidth < 560 ? HEADER_W_SM : HEADER_W;
  const contentW = Math.max(0, wrapWidth - headerW - YAXIS_W);

  // Visible (unsplit) lanes — drives the cross-parameter tooltip so its grouping
  // stays stable regardless of expand/collapse.
  const filteredLanes = useMemo(
    () =>
      lanes.filter(
        (lane) =>
          !hiddenCategories.has(lane.category) && !hiddenLanes.has(lane.id),
      ),
    [lanes, hiddenCategories, hiddenLanes],
  );

  // What actually renders: per-item split applied, then user reordering.
  const displayLanes = useMemo(
    () => expandLanes(filteredLanes, expandedCategories),
    [filteredLanes, expandedCategories],
  );

  const orderedLanes = useMemo(() => {
    const rank = (id: string) => {
      const i = laneOrder.indexOf(id);
      return i === -1 ? Number.POSITIVE_INFINITY : i;
    };
    return displayLanes
      .map((lane, naturalIndex) => ({ lane, naturalIndex }))
      .sort((a, b) => {
        const ra = rank(a.lane.id);
        const rb = rank(b.lane.id);
        return ra === rb ? a.naturalIndex - b.naturalIndex : ra - rb;
      })
      .map((entry) => entry.lane);
  }, [displayLanes, laneOrder]);

  const span = domain ? domain[1] - domain[0] : 0;
  const xFor = (t: number) =>
    domain && span > 0 ? ((t - domain[0]) / span) * contentW : 0;

  // ---- Brush interactions -------------------------------------------------
  const contextSvgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    mode: 'left' | 'right' | 'pan';
    anchorT: number;
    grabOffset: number;
  } | null>(null);

  const clampT = (t: number): number => {
    if (!fullExtent) return t;
    return Math.min(fullExtent[1], Math.max(fullExtent[0], t));
  };
  const contextTFromClientX = (clientX: number): number => {
    const svg = contextSvgRef.current;
    if (!svg || !fullExtent) return 0;
    const rect = svg.getBoundingClientRect();
    const px = clientX - rect.left;
    return clampT(
      fullExtent[0] + (px / contentW) * (fullExtent[1] - fullExtent[0]),
    );
  };

  useEffect(() => {
    if (!fullExtent) return undefined;
    const onMove = (e: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      const svg = contextSvgRef.current;
      if (!drag || !domain || !svg) return;
      const rect = svg.getBoundingClientRect();
      const rawT =
        fullExtent[0] +
        ((e.clientX - rect.left) / contentW) * (fullExtent[1] - fullExtent[0]);
      const t = Math.min(fullExtent[1], Math.max(fullExtent[0], rawT));
      const minSpan = Math.max(DAY_MS, (fullExtent[1] - fullExtent[0]) / 400);
      if (drag.mode === 'left') {
        setDomain([Math.min(t, domain[1] - minSpan), domain[1]]);
      } else if (drag.mode === 'right') {
        setDomain([domain[0], Math.max(t, domain[0] + minSpan)]);
      } else {
        const width = domain[1] - domain[0];
        let start = t - drag.grabOffset;
        start = Math.min(Math.max(start, fullExtent[0]), fullExtent[1] - width);
        setDomain([start, start + width]);
      }
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [fullExtent, domain, contentW]);

  const beginDrag =
    (mode: 'left' | 'right' | 'pan') => (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!domain) return;
      const t = contextTFromClientX(e.clientX);
      dragRef.current = { mode, anchorT: t, grabOffset: t - domain[0] };
    };

  const onContextTrackDown = (e: ReactPointerEvent) => {
    if (!fullExtent) return;
    const t = contextTFromClientX(e.clientX);
    // Start a fresh selection anchored where the user pressed.
    dragRef.current = { mode: 'right', anchorT: t, grabOffset: 0 };
    const minSpan = Math.max(DAY_MS, (fullExtent[1] - fullExtent[0]) / 400);
    setDomain([t, Math.min(fullExtent[1], t + minSpan)]);
  };

  // ---- Hover / unified tooltip -------------------------------------------
  const onLanesMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!domain || contentW <= 0 || commentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - headerW;
    if (px < 0 || px > contentW) {
      setHover(null);
      return;
    }
    const t = domain[0] + (px / contentW) * span;
    setHover({ t, px, clientX: e.clientX, clientY: e.clientY });
  };

  // ---- Lane reorder / expand ---------------------------------------------
  const onLaneDragStart = (index: number) => {
    laneDragIndexRef.current = index;
  };
  const onLaneDrop = (index: number) => {
    const from = laneDragIndexRef.current;
    laneDragIndexRef.current = null;
    if (from === null || from === index) return;
    const ids = orderedLanes.map((lane) => lane.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(index, 0, moved);
    setLaneOrder(ids);
  };
  const toggleCategoryExpand = (category: LaneCategory, expand: boolean) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (expand) next.add(category);
      else next.delete(category);
      return next;
    });
  };

  // ---- Commenting ---------------------------------------------------------
  const openComment: CommentClick = (category, item, t, laneTitle) => {
    setHover(null);
    setCommentTarget({ category, item, dayKey: dayKeyFromMs(t), laneTitle });
  };
  const laneCommentCount = (lane: TimelineLane): number => {
    const labels =
      lane.kind === 'series'
        ? [lane.title]
        : lane.kind === 'duration'
          ? [...new Set((lane.durations || []).map((d) => d.label))]
          : [...new Set((lane.markers || []).map((m) => m.label))];
    return labels.reduce(
      (sum, label) =>
        sum +
        (comments.countByCategoryItem.get(`${lane.category}|${label}`) || 0),
      0,
    );
  };

  const tooltipSections = useMemo<TooltipSection[]>(() => {
    if (!hover || !domain) return [];
    const thr = (span * 26) / Math.max(1, contentW); // ~26px window
    const byCategory = new Map<LaneCategory, TooltipSection['rows']>();
    const add = (
      category: LaneCategory,
      label: string,
      value: string,
      abnormal?: boolean,
      tone?: 'amended' | 'missing',
    ) => {
      const rows = byCategory.get(category) || [];
      rows.push({ label, value, abnormal, tone });
      byCategory.set(category, rows);
    };
    for (const lane of filteredLanes) {
      if (lane.kind === 'series' && lane.series) {
        let nearest = lane.series[0];
        for (const p of lane.series) {
          if (Math.abs(p.t - hover.t) < Math.abs(nearest.t - hover.t))
            nearest = p;
        }
        const nearMissing = (lane.missingDates || []).some(
          (t) => Math.abs(t - hover.t) <= thr,
        );
        if (nearest && Math.abs(nearest.t - hover.t) <= thr) {
          add(
            lane.category,
            lane.title,
            nearest.display,
            nearest.abnormal,
            nearest.amended ? 'amended' : undefined,
          );
        } else if (nearMissing) {
          add(lane.category, lane.title, 'not available', false, 'missing');
        }
      } else if (lane.kind === 'duration' && lane.durations) {
        for (const item of lane.durations) {
          const within =
            item.end > item.start
              ? hover.t >= item.start && hover.t <= item.end
              : Math.abs(item.start - hover.t) <= thr;
          if (within) add(lane.category, lane.title, item.label);
        }
      } else if (lane.kind === 'marker' && lane.markers) {
        for (const m of lane.markers) {
          if (Math.abs(m.t - hover.t) <= thr)
            add(lane.category, lane.title, m.label);
        }
      }
    }
    return CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => ({
      category,
      rows: byCategory.get(category) || [],
    }));
  }, [hover, domain, span, contentW, filteredLanes]);

  // ---- Context density ----------------------------------------------------
  const densityPath = useMemo(() => {
    if (!fullExtent || allTimestamps.length === 0 || contentW <= 0) return '';
    const bins = 48;
    const [f0, f1] = fullExtent;
    const counts = new Array(bins).fill(0);
    for (const t of allTimestamps) {
      const idx = Math.min(
        bins - 1,
        Math.max(0, Math.floor(((t - f0) / (f1 - f0)) * bins)),
      );
      counts[idx] += 1;
    }
    const maxCount = Math.max(...counts, 1);
    const top = 6;
    const base = CONTEXT_H - 10;
    let path = `M 0 ${base}`;
    counts.forEach((count, i) => {
      const x = ((i + 0.5) / bins) * contentW;
      const y = base - (count / maxCount) * (base - top);
      path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    path += ` L ${contentW} ${base} Z`;
    return path;
  }, [fullExtent, allTimestamps, contentW]);

  // ---- Render states ------------------------------------------------------
  if (status === 'loading') {
    return <Placeholder text="Loading clinical timeline…" />;
  }
  if (!extent || lanes.length === 0) {
    return (
      <Placeholder text="No chartable labs, vitals, medications, conditions, or encounters were found to plot on a timeline yet." />
    );
  }

  const categoryCounts = CATEGORY_ORDER.map((category) => ({
    category,
    count: lanes.filter((l) => l.category === category).length,
  })).filter((c) => c.count > 0);

  const spanMs = span;
  const ticks = domain ? makeTicks(domain, headerW < HEADER_W ? 4 : 6) : [];

  return (
    <div className="flex h-full w-full select-none flex-col bg-white">
      {/* Filter / control bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2">
        {categoryCounts.map(({ category, count }) => {
          const on = !hiddenCategories.has(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() =>
                setHiddenCategories((prev) => {
                  const next = new Set(prev);
                  if (next.has(category)) next.delete(category);
                  else next.add(category);
                  return next;
                })
              }
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                on
                  ? 'border-transparent text-white'
                  : 'border-gray-300 bg-gray-50 text-gray-400 line-through'
              }`}
              style={
                on ? { backgroundColor: CATEGORY_COLOR[category] } : undefined
              }
            >
              {CATEGORY_LABEL[category]}
              <span className={on ? 'opacity-80' : 'opacity-60'}>{count}</span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLanePicker((v) => !v)}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-gray-400"
          >
            Lanes
          </button>
          <button
            type="button"
            onClick={() => setDomain(fullExtent)}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-gray-400"
          >
            Reset zoom
          </button>
        </div>
      </div>

      {showLanePicker && (
        <div className="max-h-44 overflow-y-auto border-b border-gray-200 bg-gray-50 px-3 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {lanes.map((lane) => {
              const on = !hiddenLanes.has(lane.id);
              return (
                <label
                  key={lane.id}
                  className="flex cursor-pointer items-center gap-2 text-xs text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setHiddenLanes((prev) => {
                        const next = new Set(prev);
                        if (next.has(lane.id)) next.delete(lane.id);
                        else next.add(lane.id);
                        return next;
                      })
                    }
                    className="h-3.5 w-3.5"
                  />
                  <span
                    className="inline-block h-2 w-2 flex-shrink-0 rounded-sm"
                    style={{ backgroundColor: CATEGORY_COLOR[lane.category] }}
                  />
                  <span className="truncate">{lane.title}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Lanes (vertically scrollable) with synchronized cursor */}
      <div ref={wrapRef} className="relative min-h-0 flex-1">
        {hover && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-primary-500"
            style={{ left: headerW + hover.px }}
          />
        )}
        <div
          className="h-full overflow-y-auto"
          onMouseMove={onLanesMove}
          onMouseLeave={() => setHover(null)}
        >
          {orderedLanes.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              All lanes are hidden. Re-enable a category or lane above.
            </div>
          ) : (
            orderedLanes.map((lane, index) => {
              const isSplit = lane.id.includes('::');
              const splittable =
                lane.kind === 'duration' && SPLITTABLE.has(lane.category);
              const expandControl = isSplit
                ? {
                    mode: 'collapse' as const,
                    onClick: () => toggleCategoryExpand(lane.category, false),
                  }
                : splittable
                  ? {
                      mode: 'expand' as const,
                      onClick: () => toggleCategoryExpand(lane.category, true),
                    }
                  : undefined;
              return (
                <LaneRow
                  key={lane.id}
                  lane={lane}
                  index={index}
                  headerW={headerW}
                  contentW={contentW}
                  xFor={xFor}
                  spanMs={spanMs}
                  expandControl={expandControl}
                  onDragStartLane={onLaneDragStart}
                  onDropLane={onLaneDrop}
                  commentCount={laneCommentCount(lane)}
                  keysWithComments={comments.keysWithComments}
                  onComment={openComment}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Shared x-axis */}
      <div className="flex border-t border-gray-200 bg-white">
        <div style={{ width: headerW }} className="flex-shrink-0" />
        <svg width={contentW} height={X_AXIS_H} className="flex-shrink-0">
          {ticks.map((t, i) => (
            <text
              key={i}
              x={xFor(t)}
              y={17}
              textAnchor="middle"
              fill="#6b7280"
              style={{ fontSize: 10 }}
            >
              {formatTick(t, spanMs)}
            </text>
          ))}
        </svg>
        <div style={{ width: YAXIS_W }} className="flex-shrink-0" />
      </div>

      {/* Context / brush lane */}
      <div className="flex border-t border-gray-200 bg-white">
        <div
          style={{ width: headerW }}
          className="flex flex-shrink-0 flex-col justify-center px-3"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-700">
            Timeline
          </span>
          <span className="text-[10px] text-gray-400">Drag to zoom</span>
        </div>
        <svg
          ref={contextSvgRef}
          width={contentW}
          height={CONTEXT_H}
          className="flex-shrink-0"
          style={{ touchAction: 'none' }}
        >
          <rect
            x={0}
            y={0}
            width={contentW}
            height={CONTEXT_H}
            fill="#fafafa"
            onPointerDown={onContextTrackDown}
          />
          {densityPath && (
            <path
              d={densityPath}
              fill="var(--cl-accent, #0071e3)"
              fillOpacity={0.15}
              stroke="#0071e3"
              strokeOpacity={0.5}
              strokeWidth={1}
              style={{ pointerEvents: 'none' }}
            />
          )}
          {domain && fullExtent && (
            <ContextSelection
              domain={domain}
              fullExtent={fullExtent}
              contentW={contentW}
              onBodyDown={beginDrag('pan')}
              onLeftDown={beginDrag('left')}
              onRightDown={beginDrag('right')}
            />
          )}
        </svg>
        <div style={{ width: YAXIS_W }} className="flex-shrink-0" />
      </div>

      {/* Unified tooltip */}
      {hover && !commentTarget && tooltipSections.length > 0 && (
        <UnifiedTooltip
          t={hover.t}
          clientX={hover.clientX}
          clientY={hover.clientY}
          sections={tooltipSections}
        />
      )}

      {/* Point-level comments */}
      {commentTarget && (
        <CommentModal
          target={commentTarget}
          comments={comments.getComments(commentTarget)}
          onPost={(body) => comments.addComment(commentTarget, body)}
          onDelete={(id) => comments.deleteComment(id)}
          onClose={() => setCommentTarget(null)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------

function ContextSelection({
  domain,
  fullExtent,
  contentW,
  onBodyDown,
  onLeftDown,
  onRightDown,
}: {
  domain: [number, number];
  fullExtent: [number, number];
  contentW: number;
  onBodyDown: (e: ReactPointerEvent) => void;
  onLeftDown: (e: ReactPointerEvent) => void;
  onRightDown: (e: ReactPointerEvent) => void;
}) {
  const [f0, f1] = fullExtent;
  const xFor = (t: number) => ((t - f0) / (f1 - f0)) * contentW;
  const x0 = xFor(domain[0]);
  const x1 = xFor(domain[1]);
  const width = Math.max(2, x1 - x0);
  return (
    <g>
      <rect
        x={x0}
        y={0}
        width={width}
        height={CONTEXT_H}
        fill="#0071e3"
        fillOpacity={0.1}
        stroke="#0071e3"
        strokeWidth={1}
        style={{ cursor: 'grab' }}
        onPointerDown={onBodyDown}
      />
      <rect
        x={x0 - 3}
        y={CONTEXT_H / 2 - 9}
        width={6}
        height={18}
        rx={2}
        fill="#0071e3"
        style={{ cursor: 'ew-resize' }}
        onPointerDown={onLeftDown}
      />
      <rect
        x={x1 - 3}
        y={CONTEXT_H / 2 - 9}
        width={6}
        height={18}
        rx={2}
        fill="#0071e3"
        style={{ cursor: 'ew-resize' }}
        onPointerDown={onRightDown}
      />
    </g>
  );
}

// --------------------------------------------------------------------------

function LaneRow({
  lane,
  index,
  headerW,
  contentW,
  xFor,
  spanMs,
  expandControl,
  onDragStartLane,
  onDropLane,
  commentCount,
  keysWithComments,
  onComment,
}: {
  lane: TimelineLane;
  index: number;
  headerW: number;
  contentW: number;
  xFor: (t: number) => number;
  spanMs: number;
  expandControl?: { mode: 'expand' | 'collapse'; onClick: () => void };
  onDragStartLane: (index: number) => void;
  onDropLane: (index: number) => void;
  commentCount: number;
  keysWithComments: Set<string>;
  onComment: CommentClick;
}) {
  const [dragOver, setDragOver] = useState(false);
  const height = laneHeight(lane, spanMs);
  const cleanTitle =
    lane.title.replace(/\s*\(.*?\)\s*/g, '').trim() || lane.title;
  const abnormalCount =
    lane.kind === 'series'
      ? (lane.series || []).filter((p) => p.abnormal).length
      : 0;
  const amendedCount =
    lane.kind === 'series'
      ? (lane.series || []).filter((p) => p.amended).length
      : 0;
  const missingCount = lane.missingDates?.length || 0;

  return (
    <div className="flex border-b border-gray-100">
      <div
        style={{ width: headerW }}
        draggable
        onDragStart={() => onDragStartLane(index)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onDropLane(index);
        }}
        title="Drag to reorder"
        className={`flex flex-shrink-0 cursor-grab flex-col justify-center border-r bg-gray-50 px-3 py-1 ${
          dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: CATEGORY_COLOR[lane.category] }}
          />
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase leading-tight tracking-tight text-gray-800">
            {cleanTitle}
          </span>
          {expandControl && (
            <button
              type="button"
              draggable={false}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                expandControl.onClick();
              }}
              title={
                expandControl.mode === 'expand'
                  ? 'Split into one lane per item'
                  : 'Collapse back into one lane'
              }
              className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[11px] leading-none text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              {expandControl.mode === 'expand' ? '＋' : '－'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 pl-3.5">
          {lane.subtitle && (
            <span className="truncate text-[10px] text-gray-400">
              {lane.subtitle}
            </span>
          )}
          {lane.isNew && (
            <span className="rounded bg-emerald-100 px-1 text-[9px] font-bold text-emerald-700">
              NEW
            </span>
          )}
          {abnormalCount > 0 && (
            <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700">
              ⚠ {abnormalCount}
            </span>
          )}
          {amendedCount > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1 text-[9px] font-bold text-purple-700">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              {amendedCount}
            </span>
          )}
          {missingCount > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1 text-[9px] font-bold text-red-600">
              <span className="h-1.5 w-1.5 rounded-full border border-red-500" />
              {missingCount}
            </span>
          )}
          {commentCount > 0 && (
            <span className="text-primary-700 inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 text-[9px] font-bold">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-2.5 w-2.5"
                aria-hidden="true"
              >
                <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
              </svg>
              {commentCount}
            </span>
          )}
        </div>
      </div>
      <svg width={contentW} height={height} className="flex-shrink-0 bg-white">
        {lane.kind === 'series' && (
          <SeriesLane
            lane={lane}
            contentW={contentW}
            height={height}
            xFor={xFor}
            keysWithComments={keysWithComments}
            onComment={onComment}
          />
        )}
        {lane.kind === 'duration' && (
          <DurationLane
            lane={lane}
            contentW={contentW}
            xFor={xFor}
            keysWithComments={keysWithComments}
            onComment={onComment}
          />
        )}
        {lane.kind === 'marker' && (
          <MarkerLane
            lane={lane}
            height={height}
            xFor={xFor}
            contentW={contentW}
            keysWithComments={keysWithComments}
            onComment={onComment}
          />
        )}
      </svg>
      <SeriesYAxis lane={lane} height={height} />
    </div>
  );
}

function seriesScale(lane: TimelineLane, height: number) {
  const values = (lane.series || []).map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (lane.refLow !== undefined) min = Math.min(min, lane.refLow);
  if (lane.refHigh !== undefined) max = Math.max(max, lane.refHigh);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (min === max) {
    min -= Math.abs(min) * 0.1 || 1;
    max += Math.abs(max) * 0.1 || 1;
  }
  const top = 8;
  const bottom = height - 8;
  const yFor = (v: number) =>
    bottom - ((v - min) / (max - min)) * (bottom - top);
  return { yFor, min, max };
}

function SeriesLane({
  lane,
  contentW,
  height,
  xFor,
  keysWithComments,
  onComment,
}: {
  lane: TimelineLane;
  contentW: number;
  height: number;
  xFor: (t: number) => number;
  keysWithComments: Set<string>;
  onComment: CommentClick;
}) {
  const points = lane.series || [];
  if (points.length === 0) return null;
  const { yFor } = seriesScale(lane, height);
  const color = CATEGORY_COLOR[lane.category];
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${xFor(p.t).toFixed(1)} ${yFor(p.value).toFixed(1)}`,
    )
    .join(' ');
  return (
    <g>
      {lane.refHigh !== undefined && (
        <line
          x1={0}
          x2={contentW}
          y1={yFor(lane.refHigh)}
          y2={yFor(lane.refHigh)}
          stroke="#aeaeb2"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}
      {lane.refLow !== undefined && (
        <line
          x1={0}
          x2={contentW}
          y1={yFor(lane.refLow)}
          y2={yFor(lane.refLow)}
          stroke="#aeaeb2"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}
      {points.length > 1 && (
        <path d={path} fill="none" stroke={color} strokeWidth={1.75} />
      )}
      {points.map((p, i) => {
        const hasComment = keysWithComments.has(
          commentKey(lane.category, lane.title, dayKeyFromMs(p.t)),
        );
        return (
          <g key={i}>
            {p.amended && (
              <circle
                cx={xFor(p.t)}
                cy={yFor(p.value)}
                r={5.5}
                fill="none"
                stroke="#8e44ad"
                strokeWidth={1.5}
                style={{ pointerEvents: 'none' }}
              />
            )}
            <circle
              cx={xFor(p.t)}
              cy={yFor(p.value)}
              r={p.abnormal ? 3.75 : 3}
              fill={p.abnormal ? '#ff3b30' : color}
              stroke="#fff"
              strokeWidth={1}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onComment(lane.category, lane.title, p.t, lane.title);
              }}
            />
            {hasComment && (
              <circle
                cx={xFor(p.t)}
                cy={yFor(p.value) - 7}
                r={2}
                fill="#0071e3"
                style={{ pointerEvents: 'none' }}
              />
            )}
          </g>
        );
      })}
      {(lane.missingDates || []).map((t, i) => (
        <g
          key={`m${i}`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            onComment(lane.category, lane.title, t, lane.title);
          }}
        >
          <circle
            cx={xFor(t)}
            cy={height / 2}
            r={4}
            fill="#fff"
            stroke="#ff3b30"
            strokeWidth={1.5}
          />
          <line
            x1={xFor(t) - 2}
            y1={height / 2}
            x2={xFor(t) + 2}
            y2={height / 2}
            stroke="#ff3b30"
            strokeWidth={1.5}
          />
        </g>
      ))}
    </g>
  );
}

function SeriesYAxis({ lane, height }: { lane: TimelineLane; height: number }) {
  if (lane.kind !== 'series' || (lane.series || []).length === 0) {
    return (
      <div style={{ width: YAXIS_W }} className="flex-shrink-0 bg-white" />
    );
  }
  const { yFor, min, max } = seriesScale(lane, height);
  const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1));
  return (
    <svg
      width={YAXIS_W}
      height={height}
      className="flex-shrink-0 border-l border-gray-100 bg-white"
    >
      {[max, min].map((v, i) => (
        <text
          key={i}
          x={4}
          y={yFor(v) + 3}
          fill="#9ca3af"
          style={{ fontSize: 9 }}
        >
          {fmt(v)}
        </text>
      ))}
    </svg>
  );
}

function DurationLane({
  lane,
  contentW,
  xFor,
  keysWithComments,
  onComment,
}: {
  lane: TimelineLane;
  contentW: number;
  xFor: (t: number) => number;
  keysWithComments: Set<string>;
  onComment: CommentClick;
}) {
  const items = lane.durations || [];
  const color = CATEGORY_COLOR[lane.category];
  const barH = 13;
  const gap = DURATION_ROW_H - barH;
  return (
    <g>
      {items.map((item, i) => {
        const rowIndex = item.rowIndex || 0;
        const y = 8 + rowIndex * (barH + gap);
        let startX = xFor(item.start);
        let endX = xFor(Math.max(item.end, item.start));
        if (endX - startX < 7) {
          const mid = (startX + endX) / 2;
          startX = mid - 3.5;
          endX = mid + 3.5;
        }
        if (endX < 0 || startX > contentW) return null;
        const drawStart = Math.max(0, startX);
        const drawEnd = Math.min(contentW, endX);
        const drawW = Math.max(2, drawEnd - drawStart);
        const showLabel = drawW > 34;
        const hasComment = keysWithComments.has(
          commentKey(lane.category, item.label, dayKeyFromMs(item.start)),
        );
        return (
          <g key={i}>
            <rect
              x={drawStart}
              y={y}
              width={drawW}
              height={barH}
              rx={3}
              fill={color}
              fillOpacity={0.85}
              stroke="#fff"
              strokeWidth={1}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onComment(lane.category, item.label, item.start, lane.title);
              }}
            />
            {hasComment && (
              <circle
                cx={drawStart + 2}
                cy={y - 1}
                r={2}
                fill="#0071e3"
                style={{ pointerEvents: 'none' }}
              />
            )}
            {showLabel && (
              <text
                x={drawStart + 4}
                y={y + barH - 3}
                fill="#ffffff"
                style={{ fontSize: 9, fontWeight: 600, pointerEvents: 'none' }}
              >
                {item.label.length > Math.floor(drawW / 6)
                  ? `${item.label.slice(0, Math.max(1, Math.floor(drawW / 6)))}…`
                  : item.label}
              </text>
            )}
            {item.ongoing && (
              <text
                x={drawEnd - 2}
                y={y + barH - 3}
                textAnchor="end"
                fill="#ffffff"
                style={{ fontSize: 10, pointerEvents: 'none' }}
              >
                →
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function MarkerLane({
  lane,
  height,
  xFor,
  contentW,
  keysWithComments,
  onComment,
}: {
  lane: TimelineLane;
  height: number;
  xFor: (t: number) => number;
  contentW: number;
  keysWithComments: Set<string>;
  onComment: CommentClick;
}) {
  const markers = lane.markers || [];
  const color = CATEGORY_COLOR[lane.category];
  const cy = height / 2;
  return (
    <g>
      <line
        x1={0}
        x2={contentW}
        y1={cy}
        y2={cy}
        stroke="#ededf2"
        strokeWidth={1}
      />
      {markers.map((m, i) => {
        const cx = xFor(m.t);
        if (cx < -6 || cx > contentW + 6) return null;
        const hasComment = keysWithComments.has(
          commentKey(lane.category, m.label, dayKeyFromMs(m.t)),
        );
        return (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r={4}
              fill={color}
              stroke="#fff"
              strokeWidth={1.25}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onComment(lane.category, m.label, m.t, lane.title);
              }}
            />
            {hasComment && (
              <circle
                cx={cx}
                cy={cy - 8}
                r={2}
                fill="#0071e3"
                style={{ pointerEvents: 'none' }}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

// --------------------------------------------------------------------------

function UnifiedTooltip({
  t,
  clientX,
  clientY,
  sections,
}: {
  t: number;
  clientX: number;
  clientY: number;
  sections: TooltipSection[];
}) {
  const width = 250;
  const flipX = clientX + width + 24 > window.innerWidth;
  const left = flipX ? clientX - width - 16 : clientX + 16;
  const top = Math.min(clientY + 16, window.innerHeight - 240);
  return (
    <div
      className="pointer-events-none fixed z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
      style={{ left: Math.max(8, left), top: Math.max(8, top), width }}
    >
      <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900">
        {format(t, 'EEE, MMM d, yyyy')}
      </div>
      <div className="max-h-56 overflow-y-auto px-3 py-2">
        {sections.map((section) => (
          <div key={section.category} className="mb-2 last:mb-0">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
              {CATEGORY_LABEL[section.category]}
            </div>
            <div className="flex flex-col gap-1">
              {section.rows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="truncate text-[11px] text-gray-700">
                    {row.label}
                  </span>
                  <span
                    className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      row.tone === 'missing'
                        ? 'bg-red-100 text-red-600'
                        : row.tone === 'amended'
                          ? 'bg-purple-100 text-purple-700'
                          : row.abnormal
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {row.abnormal && !row.tone ? '⚠ ' : ''}
                    {row.value}
                    {row.tone === 'amended' ? ' ✎' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50 p-8 text-center">
      <p className="max-w-md text-sm text-gray-500">{text}</p>
    </div>
  );
}
