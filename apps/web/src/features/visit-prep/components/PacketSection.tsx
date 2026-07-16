import { formatDisplayText } from '../../../shared/utils/StyleUtils';
import { PacketItem } from '../types';

export function PacketSection({
  title,
  items,
}: {
  title: string;
  items: PacketItem[];
}) {
  return (
    <section className="break-inside-avoid">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 rounded-md border border-gray-200 p-3 text-sm text-gray-500">
          No matching records found.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-200 rounded-md border border-gray-200">
          {items.map((item) => (
            <li key={`${title}-${item.id}`} className="p-3">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <p className="font-medium text-gray-900">{item.title}</p>
                {item.date && (
                  <p className="text-sm text-gray-500">{item.date}</p>
                )}
              </div>
              {item.detail && (
                <p className="mt-1 text-sm text-gray-700">
                  {formatDisplayText(item.detail)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
