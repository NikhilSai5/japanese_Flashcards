export function ScoreButtons({ isVisible, onMarkWrong, onMarkRight }) {
  if (!isVisible) return null;

  return (
    <div className="flex gap-2 mb-7">
      <button
        onClick={onMarkWrong}
        className="flex-1 max-w-36 py-2 border border-red text-red font-mono text-xs uppercase tracking-widest rounded transition-all hover:bg-red hover:text-white"
      >
        ✗ Again
      </button>
      <button
        onClick={onMarkRight}
        className="flex-1 max-w-36 py-2 border border-green-700 text-green-700 font-mono text-xs uppercase tracking-widest rounded transition-all hover:bg-green-700 hover:text-white"
      >
        ✓ Got it
      </button>
    </div>
  );
}
