import { ProgressRing } from './ProgressRing';

export function Navigation({
  currentIndex,
  deckLength,
  onPrev,
  onNext
}) {
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < deckLength - 1;

  return (
    <div className="flex items-center gap-5 mb-6">
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className="px-5 py-2 border-2 border-ink text-ink font-mono text-xs uppercase tracking-widest rounded transition-all hover:bg-ink hover:text-paper disabled:opacity-30 disabled:cursor-default"
      >
        ← Prev
      </button>
      <ProgressRing current={currentIndex} total={deckLength} />
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="px-5 py-2 border-2 border-ink text-ink font-mono text-xs uppercase tracking-widest rounded transition-all hover:bg-ink hover:text-paper disabled:opacity-30 disabled:cursor-default"
      >
        Next →
      </button>
    </div>
  );
}
