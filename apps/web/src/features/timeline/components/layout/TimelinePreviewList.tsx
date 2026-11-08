import { ReactNode } from 'react';

export const TIMELINE_PREVIEW_LIMIT = 5;

type PreviewItem = {
  id: string;
  metadata?: { display_name?: string };
};

/** Limit only the card's summary; its expanded detail keeps the full list. */
export function TimelinePreviewList<T extends PreviewItem>({
  items,
  label,
  renderItem = (item) => item.metadata?.display_name,
  getItemId,
}: {
  items: readonly T[];
  label: string;
  renderItem?: (item: T) => ReactNode;
  getItemId?: (item: T) => string;
}) {
  return (
    <>
      <ul aria-label={label} className="list-inside list-disc">
        {items.slice(0, TIMELINE_PREVIEW_LIMIT).map((item) => (
          <li
            key={item.id}
            id={getItemId?.(item)}
            className="scroll-mt-24 break-words text-xs font-medium text-gray-900 md:text-sm"
          >
            {renderItem(item)}
          </li>
        ))}
      </ul>
      <TimelinePreviewMore total={items.length} />
    </>
  );
}

export function TimelinePreviewMore({ total }: { total: number }) {
  if (total <= TIMELINE_PREVIEW_LIMIT) return null;

  return (
    <p className="text-xs font-medium text-gray-900 md:text-sm">
      {`... and ${total - TIMELINE_PREVIEW_LIMIT} more`}
    </p>
  );
}
