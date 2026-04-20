export function Card({ card, isFlipped, isReversed, onFlip }) {
  if (!card) {
    return (
      <div className="w-full max-w-xl h-80 mb-6 cursor-pointer flex items-center justify-center bg-white border-2 border-border rounded shadow-lg">
        <div className="text-ink">No cards</div>
      </div>
    );
  }

  const frontText = isReversed ? card.en : card.jp;
  const backText = isReversed ? card.jp : card.en;
  const frontLabel = isReversed ? 'English' : 'Japanese';
  const backLabel = isReversed ? 'Japanese' : 'English';
  const frontStyle = isReversed ? 'font-serif text-3xl' : 'font-jp text-5xl font-light';
  const backStyle = isReversed ? 'font-jp text-4xl font-light' : 'font-serif text-3xl';

  return (
    <div className="w-full max-w-2xl h-80 mb-6 cursor-pointer" onClick={onFlip}>
      <div className="card-inner relative w-full h-full" style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
      }}>
        {/* Front */}
        <div
          className="card-face absolute inset-0 bg-white border-2 border-border rounded flex flex-col items-center justify-center p-8 shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="absolute top-4 left-5 text-xs text-muted uppercase tracking-widest">
            {frontLabel}
          </span>
          <span className="absolute top-4 right-5 text-xs text-border">
            L{card.lesson}
          </span>
          <div className={`text-center text-ink leading-tight ${frontStyle}`}>
            {frontText}
          </div>
          {!isReversed && card.kanji && (
            <div className="font-jp text-lg text-gold mt-2 text-center">
              {card.kanji}
            </div>
          )}
          <span className="absolute bottom-4 text-xs text-border">tap to reveal</span>
        </div>

        {/* Back */}
        <div
          className="card-face absolute inset-0 bg-cream border-2 border-border rounded flex flex-col items-center justify-center p-8 shadow-lg"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <span className="absolute top-4 left-5 text-xs text-muted uppercase tracking-widest">
            {backLabel}
          </span>
          <span className="absolute top-4 right-5 text-xs text-border">
            L{card.lesson}
          </span>
          <div className={`text-center text-ink leading-tight ${backStyle}`}>
            {backText}
          </div>
          {isReversed && card.kanji && (
            <div className="text-xs text-muted mt-2 text-center">
              {card.kanji}{card.note ? ' · ' + card.note : ''}
            </div>
          )}
          {!isReversed && card.note && (
            <div className="text-xs text-muted text-center mt-2 italic max-w-72 leading-relaxed">
              {card.note}
            </div>
          )}
          <span className="absolute bottom-4 text-xs text-border">tap to flip back</span>
        </div>
      </div>
    </div>
  );
}
