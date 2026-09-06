import { useState, useEffect } from 'react';
import { useFlashcards } from '../hooks/useFlashcards';
import { useCardNavigation } from '../hooks/useCardNavigation';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../hooks/useAuth';
import '../index.css';

function ProtectedApp({ levelFilter = 'n5' }) {
  const db = useSupabase();
  const { authUser } = useAuth();
  const { lessons, activeLessons, deck, isLoading, error, setActiveLesson, toggleActiveLesson, resetToLesson1 } = useFlashcards();
  const [localDeck, setLocalDeck] = useState([]);

  // Filter lessons based on JLPT level
  const levelLessons = lessons.filter(l => levelFilter === 'n5' ? l <= 25 : l >= 26 && l <= 50);
  const levelActiveLessons = new Set([...activeLessons].filter(l => levelFilter === 'n5' ? l <= 25 : l >= 26 && l <= 50));
  const levelLabel = levelFilter === 'n5' ? 'N5' : 'N4';
  const levelRange = levelFilter === 'n5' ? 'Lessons 1–25' : 'Lessons 26–50';

  const {
    currentIndex,
    correct,
    incorrect,
    isFlipped,
    isReversed,
    sessionComplete,
    getMissedDeck,
    nextCard,
    prevCard,
    flipCard,
    toggleReverse,
    markCorrect,
    markIncorrect,
    reset
  } = useCardNavigation(localDeck);

  useEffect(() => {
    // Only sync deck cards that belong to this level
    const levelDeck = deck.filter(c => levelFilter === 'n5' ? c.lesson <= 25 : c.lesson >= 26 && c.lesson <= 50);
    setLocalDeck(levelDeck);
  }, [deck, levelFilter]);

  const handleShuffle = () => {
    const newDeck = [...localDeck];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    setLocalDeck(newDeck);
    reset();
  };

  const handleReviewWrong = () => {
    const missed = getMissedDeck();
    if (missed.length === 0) return;
    setLocalDeck([...missed]);
    reset();
  };

  const handleMarkCard = async (isRight) => {
    const cardId = localDeck[currentIndex]?.id;
    if (cardId) {
      if (authUser) {
        // Save to Supabase for logged-in users
        try {
          const { data: existing } = await db
            .from('study_progress')
            .select('id, correct_count, incorrect_count')
            .eq('card_id', cardId)
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (existing) {
            await db.from('study_progress').update({
              correct_count: existing.correct_count + (isRight ? 1 : 0),
              incorrect_count: existing.incorrect_count + (isRight ? 0 : 1),
              last_studied: new Date().toISOString()
            }).eq('id', existing.id);
          } else {
            await db.from('study_progress').insert({
              card_id: cardId,
              user_id: authUser.id,
              correct_count: isRight ? 1 : 0,
              incorrect_count: isRight ? 0 : 1,
              last_studied: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Error saving progress:', err);
        }
      } else {
        // Save to localStorage for guests
        const guestProgress = JSON.parse(localStorage.getItem('guestProgress') || '{}');
        if (guestProgress[cardId]) {
          guestProgress[cardId].correct_count += isRight ? 1 : 0;
          guestProgress[cardId].incorrect_count += isRight ? 0 : 1;
          guestProgress[cardId].last_studied = new Date().toISOString();
        } else {
          guestProgress[cardId] = {
            correct_count: isRight ? 1 : 0,
            incorrect_count: isRight ? 0 : 1,
            last_studied: new Date().toISOString()
          };
        }
        localStorage.setItem('guestProgress', JSON.stringify(guestProgress));
      }
    }

    if (isRight) {
      markCorrect();
    } else {
      markIncorrect();
    }
  };

  const currentCard = localDeck[currentIndex];
  const pct = localDeck.length > 1 ? currentIndex / (localDeck.length - 1) : 1;
  const circ = 2 * Math.PI * 22;
  const ringOffset = circ * (1 - pct);

  return (
    <>
      <div className={`loading-overlay ${!isLoading ? 'hidden' : ''}`}>
        <div className="loading-title">読み込み中…</div>
        <div className="loading-subtitle">Loading cards from Supabase</div>
      </div>

      {isLoading ? null : error ? (
        <div className={`loading-overlay`}>
          <div className="error-container">
            <div className="error-message">⚠ Could not connect to Supabase</div>
            <div className="error-details">{error}</div>
            <div className="error-hint">Check that your anon key is correct and RLS policies allow user SELECT.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="vocab-page-header">
            <h2 className="vocab-page-title">語彙 <span>Vocabulary · JLPT {levelLabel}</span></h2>
            <p className="vocab-page-subtitle">Minna no Nihongo · {levelRange}</p>
          </div>

          <div className="controls">
            <button
              className={`lesson-btn ${levelActiveLessons.size === levelLessons.length ? 'active' : ''}`}
              onClick={() => setActiveLesson('all')}
            >
              All
            </button>
            <button
              className="lesson-btn"
              onClick={resetToLesson1}
            >
              Reset
            </button>
            {levelLessons.map((lesson) => (
              <button
                key={lesson}
                className={`lesson-btn ${activeLessons.has(lesson) ? 'active' : ''}`}
                onClick={() => toggleActiveLesson(lesson)}
              >
                Lesson {lesson}
              </button>
            ))}
          </div>

          <div className="stats">
            {localDeck.length} cards · {correct} correct this session
          </div>

          {sessionComplete ? (
            /* ── Completion Screen ── */
            <div className="vocab-complete">
              <div className="vocab-complete-icon">🎉</div>
              <h2 className="vocab-complete-title">Session Complete!</h2>
              <div className="vocab-complete-stats">
                <div className="vocab-complete-stat">
                  <span className="vocab-complete-number green">{correct}</span>
                  <span className="vocab-complete-label">Correct</span>
                </div>
                <div className="vocab-complete-stat">
                  <span className="vocab-complete-number red">{incorrect}</span>
                  <span className="vocab-complete-label">Incorrect</span>
                </div>
                <div className="vocab-complete-stat">
                  <span className="vocab-complete-number">
                    {correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0}%
                  </span>
                  <span className="vocab-complete-label">Accuracy</span>
                </div>
              </div>

              {getMissedDeck().length === 0 && (
                <div className="vocab-perfect">
                  <span>🌟</span>
                  <span>Perfect! No missed cards!</span>
                </div>
              )}

              <div className="vocab-complete-actions">
                <button className="kf-action-btn" onClick={reset}>↻ Study Again</button>
                <button className="kf-action-btn" onClick={handleShuffle}>⇄ Shuffle &amp; Retry</button>
              </div>

              {getMissedDeck().length > 0 && (
                <button className="kf-action-btn kf-study-missed-btn" onClick={handleReviewWrong}>
                  🔁 Review Wrong Cards ({getMissedDeck().length})
                </button>
              )}
            </div>
          ) : (
            /* ── Active Study ── */
            <>
              <div className="card-wrapper" onClick={flipCard}>
                <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
                  <div className="card-face front">
                    <span className="card-label">
                      {isReversed ? 'English' : 'Japanese'}
                    </span>
                    <span className="card-lesson">L{currentCard?.lesson}</span>
                    <div className="card-jp" style={isReversed ? { fontFamily: "'DM Serif Display', serif", fontSize: '1.9rem' } : {}}>
                      {isReversed ? currentCard?.en : currentCard?.jp}
                    </div>
                    <div className="card-kanji">
                      {isReversed ? '' : currentCard?.kanji}
                    </div>
                    <span className="tap-hint">tap to reveal</span>
                  </div>
                  <div className="card-face back">
                    {isFlipped && (
                      <>
                        <span className="card-label">
                          {isReversed ? 'Japanese' : 'English'}
                        </span>
                        <span className="card-lesson">L{currentCard?.lesson}</span>
                        <div className="card-en" style={isReversed ? { fontFamily: "'Noto Sans JP', sans-serif", fontSize: '2.5rem', fontWeight: '300' } : {}}>
                          {isReversed ? currentCard?.jp : currentCard?.en}
                        </div>
                        <div className="card-note">
                          {isReversed
                            ? currentCard?.kanji ? `${currentCard.kanji}${currentCard.note ? ' · ' + currentCard.note : ''}` : currentCard?.note
                            : currentCard?.note}
                        </div>
                        <span className="tap-hint">tap to flip back</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="nav">
                <button className="nav-btn" onClick={prevCard} disabled={currentIndex === 0}>
                  ← Prev
                </button>
                <div className="progress-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle className="bg" cx="26" cy="26" r="22" fill="none" strokeWidth="3"/>
                    <circle className="fg" cx="26" cy="26" r="22" fill="none" strokeWidth="3"
                      strokeDasharray="138.2" strokeDashoffset={ringOffset} strokeLinecap="round"/>
                  </svg>
                  <span>
                    {currentIndex + 1}
                    <br/>
                    <span style={{ fontSize: '0.5rem', color: 'var(--border)' }}>
                      {localDeck.length}
                    </span>
                  </span>
                </div>
                <button className="nav-btn" onClick={nextCard} disabled={currentIndex === localDeck.length - 1}>
                  Next →
                </button>
              </div>

              <div className="score-row" style={{ display: isFlipped ? 'flex' : 'none' }}>
                <button className="score-btn wrong" onClick={() => handleMarkCard(false)}>
                  ✗ Again
                </button>
                <button className="score-btn right" onClick={() => handleMarkCard(true)}>
                  ✓ Got it
                </button>
              </div>

              <div className="bottom-row">
                <button className="shuffle-btn" onClick={handleShuffle}>
                  ⇄ Shuffle deck
                </button>
                <button
                  className={`reverse-btn ${isReversed ? 'active' : ''}`}
                  onClick={toggleReverse}
                >
                  ⇅ Reverse mode
                </button>
                <button className="reset-btn" onClick={reset}>
                  ↻ Reset
                </button>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

export default ProtectedApp;
