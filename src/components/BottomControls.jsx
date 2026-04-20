export function BottomControls({ onShuffle, onToggleReverse, isReversed }) {
  return (
    <div className="flex items-center gap-4 flex-wrap justify-center">
      <button
        onClick={onShuffle}
        className="text-muted font-mono text-xs uppercase tracking-widest underline decoration-border hover:text-ink transition-colors"
      >
        ⇄ Shuffle deck
      </button>
      <button
        onClick={onToggleReverse}
        className={`px-3 py-1 border border-solid font-mono text-xs uppercase tracking-widest rounded transition-all ${
          isReversed
            ? 'bg-gold border-gold text-white'
            : 'border-muted text-muted hover:bg-gold hover:border-gold hover:text-white'
        }`}
      >
        ⇅ Reverse mode
      </button>
    </div>
  );
}
