export function CheckboxField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    // min-h keeps the whole row a 44px touch target.
    <label className="flex min-h-[44px] items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="rounded border-gray-300 text-primary focus:ring-primary"
      />
      <span>{label}</span>
    </label>
  );
}
