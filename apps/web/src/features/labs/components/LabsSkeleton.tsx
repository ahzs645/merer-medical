export function LabsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-36 animate-pulse rounded-md bg-white shadow-sm ring-1 ring-gray-200"
        />
      ))}
    </>
  );
}
