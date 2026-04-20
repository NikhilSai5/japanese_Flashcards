export function LoadingOverlay({ isLoading, error }) {
  if (!isLoading && !error) return null;

  return (
    <div className="fixed inset-0 bg-paper flex flex-col items-center justify-center z-50 gap-3">
      {isLoading && (
        <>
          <div className="font-jp text-4xl text-ink">読み込み中…</div>
          <div className="text-xs tracking-widest text-muted uppercase">
            Loading cards from Supabase
          </div>
        </>
      )}
      {error && (
        <div className="font-mono text-red text-center p-6 max-w-sm">
          <div className="text-base mb-2">⚠ Could not connect to Supabase</div>
          <div className="text-xs text-muted mb-3">{error}</div>
          <div className="text-xs text-border">
            Check that your anon key is correct and RLS policies allow public SELECT.
          </div>
        </div>
      )}
    </div>
  );
}
