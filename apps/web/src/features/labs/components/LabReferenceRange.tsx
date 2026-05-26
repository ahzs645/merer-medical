export function LabReferenceRange({ range }: { range?: string }) {
  if (!range) return null;

  return <div className="text-xs text-gray-600">Range: {range}</div>;
}
