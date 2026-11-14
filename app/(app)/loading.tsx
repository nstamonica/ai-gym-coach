export default function Loading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-64 rounded-lg bg-slate-800/70" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-800/50" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-slate-800/40" />
    </div>
  );
}
