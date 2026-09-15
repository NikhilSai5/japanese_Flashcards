import { useState, useEffect, useRef } from 'react';
import { motion as Motion, useMotionValue, useTransform, animate } from 'framer-motion';
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
  const [exitDir, setExitDir] = useState(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(true);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-14, 14]);
  const cardOpacity = useTransform(x, [-500, -260, 0, 260, 500], [0.35, 0.95, 1, 0.95, 0.35]);

  // Underneath card scale and opacity for tactile card-deck feel
  const nextCardScale = useTransform(x, [-260, 0, 260], [1, 0.96, 1]);
  const nextCardOpacity = useTransform(x, [-260, 0, 260], [1, 0.85, 1]);

  // Subtle background color tint when swiping right (green) or left (red)
  const bgOverlay = useTransform(x, [-160, -25, 0, 25, 160], [
    'rgba(239, 68, 68, 0.22)',   // subtle red on left swipe
    'rgba(239, 68, 68, 0.05)',
    'rgba(0, 0, 0, 0)',
    'rgba(34, 197, 94, 0.05)',
    'rgba(34, 197, 94, 0.22)'    // subtle green on right swipe
  ]);

  // Subtle stamp badge opacity
  const gotOpacity = useTransform(x, [25, 90], [0, 1]);
  const againOpacity = useTransform(x, [-25, -90], [0, 1]);

  const isDraggingRef = useRef(false);

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

  const triggerSwipe = (dir) => {
    if (exitDir) return;
    setExitDir(dir);
    const flyDistance = dir * (typeof window !== 'undefined' ? Math.max(window.innerWidth, 500) : 500);
    animate(x, flyDistance, {
      type: 'spring',
      stiffness: 280,
      damping: 24,
      onComplete: () => {
        x.jump(0);
        setExitDir(null);
        handleMarkCard(dir > 0);
      }
    });
  };

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = (_e, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > 70 || velocity > 350) {
      triggerSwipe(1); // Swiped right: correct
    } else if (offset < -70 || velocity < -350) {
      triggerSwipe(-1); // Swiped left: wrong
    } else {
      animate(x, 0, { type: 'spring', stiffness: 350, damping: 25 });
    }
    // Briefly delay clearing drag flag so subsequent onClick event is ignored
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 60);
  };

  const handleCardClick = () => {
    if (isDraggingRef.current || exitDir) return;
    flipCard();
  };

  const pct = localDeck.length > 1 ? currentIndex / (localDeck.length - 1) : 1;
  const circ = 2 * Math.PI * 22;
  const ringOffset = circ * (1 - pct);
  const currentCard = localDeck[currentIndex];
  const nextCardData = localDeck[currentIndex + 1];

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

          {/* Lesson Selector Card (Accordion & Number Grid from screenshot) */}
          <div className="lesson-card-container">
            <div
              className="lesson-card-header"
              onClick={() => setIsSelectorOpen(prev => !prev)}
            >
              <div className="lesson-card-header-left">
                <div className="lesson-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <div className="lesson-card-titles">
                  <span className="lesson-card-title">
                    {levelFilter === 'n5' ? 'N5 Vocab' : 'N4 Vocab'}
                  </span>
                  <span className="lesson-card-subtitle">
                    {levelActiveLessons.size === 1
                      ? `Lesson ${[...levelActiveLessons][0]} · ${[...levelActiveLessons][0] === 1 ? 'Hiragana & Basic Words' : 'Minna no Nihongo'}`
                      : levelActiveLessons.size === levelLessons.length
                        ? `Minna no Nihongo · ${levelRange}`
                        : `${levelActiveLessons.size} Lessons Selected`}
                  </span>
                </div>
              </div>

              <div className="lesson-card-header-right">
                <span>
                  {levelActiveLessons.size === 1
                    ? `${[...levelActiveLessons][0]} / ${levelLessons.length}`
                    : levelActiveLessons.size === levelLessons.length
                      ? `${levelLessons.length} / ${levelLessons.length}`
                      : `${levelActiveLessons.size} / ${levelLessons.length}`}
                </span>
                <span
                  className="lesson-card-chevron"
                  style={{
                    transform: isSelectorOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </div>
            </div>

            {isSelectorOpen && (
              <div className="lesson-card-body">
                <div className="lesson-card-toolbar">
                  <div className="lesson-card-toolbar-left">
                    <span className="lesson-card-label">Select Lesson</span>
                    <button
                      className={`lesson-quick-btn ${levelActiveLessons.size === levelLessons.length ? 'active' : ''}`}
                      onClick={() => setActiveLesson('all')}
                    >
                      All
                    </button>
                    <button
                      className="lesson-quick-btn"
                      onClick={() => setActiveLesson(levelFilter === 'n5' ? 1 : 26)}
                    >
                      Reset
                    </button>
                  </div>
                  <span className="lesson-card-total">
                    {levelLessons.length} lessons total
                  </span>
                </div>

                <div className="lesson-number-grid">
                  {levelLessons.map((lesson) => {
                    const isActive = levelActiveLessons.has(lesson);
                    return (
                      <button
                        key={lesson}
                        className={`lesson-number-btn ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveLesson(lesson)}
                      >
                        {lesson}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              <div className="card-stack-container">
                {/* Underneath Card (shown while swiping current card) */}
                {nextCardData && (
                  <Motion.div
                    className="card-wrapper card-underneath"
                    style={{
                      scale: nextCardScale,
                      opacity: nextCardOpacity
                    }}
                  >
                    <div className="card-inner">
                      <div className="card-face front">
                        <span className="card-label">
                          {isReversed ? 'English' : 'Japanese'}
                        </span>
                        <span className="card-lesson">L{nextCardData.lesson}</span>
                        <div className="card-jp" style={isReversed ? { fontFamily: "'DM Serif Display', serif", fontSize: '1.9rem' } : {}}>
                          {isReversed ? nextCardData.en : nextCardData.jp}
                        </div>
                        <div className="card-kanji">
                          {isReversed ? '' : nextCardData.kanji}
                        </div>
                        <span className="tap-hint">tap to reveal</span>
                      </div>
                    </div>
                  </Motion.div>
                )}

                {/* Top Active Card */}
                <Motion.div
                  className="card-wrapper card-top"
                  style={{ x, rotate, opacity: cardOpacity }}
                  drag={!exitDir ? 'x' : false}
                  dragElastic={0.8}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onClick={handleCardClick}
                >
                  <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
                    {/* Front Face */}
                    <div className="card-face front">
                      <Motion.div className="swipe-bg-overlay" style={{ backgroundColor: bgOverlay }} />
                      <Motion.div className="swipe-stamp got" style={{ opacity: gotOpacity }}>
                        ✓ 正解
                      </Motion.div>
                      <Motion.div className="swipe-stamp again" style={{ opacity: againOpacity }}>
                        ✗ 間違い
                      </Motion.div>

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

                    {/* Back Face */}
                    <div className="card-face back">
                      <Motion.div className="swipe-bg-overlay" style={{ backgroundColor: bgOverlay }} />
                      <Motion.div className="swipe-stamp got" style={{ opacity: gotOpacity }}>
                        ✓ 正解
                      </Motion.div>
                      <Motion.div className="swipe-stamp again" style={{ opacity: againOpacity }}>
                        ✗ 間違い
                      </Motion.div>

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
                </Motion.div>
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