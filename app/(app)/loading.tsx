export default function Loading() {
  return (
    <div className="animate-pulse space-y-14" aria-busy="true" aria-label="Loading">
      <div className="space-y-5">
        <div className="h-12 w-80 max-w-full rounded-md bg-iron-800/70" />
        <div className="max-w-3xl space-y-3">
          <div className="h-6 rounded bg-iron-800/50" />
          <div className="h-6 w-2/3 rounded bg-iron-800/50" />
        </div>
      </div>
      <div className="h-80 rounded-lg bg-iron-800/40" />
    </div>
  );
}
