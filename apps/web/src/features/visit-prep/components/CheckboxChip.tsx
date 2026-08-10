import { CheckIcon } from '@heroicons/react/24/solid';

/**
 * A checkbox that hugs its label instead of claiming a row.
 *
 * `CheckboxField` is right for a settings list, where each option is a
 * sentence ("Include embedded PDFs and attachments"). It is wrong for a set of
 * one-word toggles: eight of them stacked one per row on a phone is 400px of
 * white boxes holding a single word each, and nothing in that wall shows at a
 * glance which ones are on. These wrap two or three to a line and carry their
 * state in the fill, so the group reads as a set rather than as a list.
 *
 * The checkmark keeps its space when unchecked so toggling one chip does not
 * re-wrap the rest of the group under the reader's thumb.
 */
export function CheckboxChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer">
      {/* The chip itself is the control's face, so the box is taken out of the
          layout rather than stretched over it: the forms plugin paints a
          checked box with its own fill, which at chip size covers the label.
          The 44px target is the chip, which the label makes clickable. */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-600 peer-focus-visible:ring-offset-1 ${
          checked
            ? 'border-primary-300 bg-primary-50 text-primary-900'
            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        <CheckIcon
          className={`h-4 w-4 shrink-0 ${
            checked ? 'text-primary-700' : 'text-transparent'
          }`}
        />
        {label}
      </span>
    </label>
  );
}
