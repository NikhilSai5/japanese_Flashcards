import { useState } from 'react';
import { playJapaneseAudio, getStoredVoice } from '../utils/edgeTts';

export function Card({ card, isFlipped, isReversed, onFlip }) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!card) {
    return (
      <div className="w-full max-w-xl h-80 mb-6 cursor-pointer flex items-center justify-center bg-white border-2 border-border rounded shadow-lg">
        <div className="text-ink">No cards</div>
      </div>
    );
  }

  const handleAudioClick = async (e) => {
    e.stopPropagation();
    if (isPlaying) return;
    
    setIsPlaying(true);
    try {
      const voice = getStoredVoice();
      await playJapaneseAudio(card.jp, voice);
    } catch (error) {
      console.error('Failed to play audio:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const frontText = isReversed ? card.en : card.jp;
  const backText = isReversed ? card.jp : card.en;
  const frontLabel = isReversed ? 'English' : 'Japanese';
  const backLabel = isReversed ? 'Japanese' : 'English';
  const frontStyle = isReversed ? 'font-serif text-3xl' : 'font-jp text-5xl font-light';
  const backStyle = isReversed ? 'font-jp text-4xl font-light' : 'font-serif text-3xl';

  const audioButton = (
    <button
      className={`card-audio-btn ${isPlaying ? 'playing' : ''}`}
      onClick={handleAudioClick}
      disabled={isPlaying}
      aria-label="Play Japanese pronunciation"
      title="Play pronunciation"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    </button>
  );

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
          {audioButton}
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
          {audioButton}
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
