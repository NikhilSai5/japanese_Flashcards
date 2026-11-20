import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion as Motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useN4Kanji } from '../hooks/useN4Kanji';
import { useVoice } from '../contexts/VoiceContext';
import '../index.css';

export default function N4KanjiDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMode = searchParams.get('mode') === 'vocab' ? 'vocab' : 'reading';

  const {
    readingList,
    vocabList,
    deck: rawDeck,
    lessons,
    activeLessons,
    toggleActiveLesson,
    selectAllLessons,
    resetToLesson1,
    activeMode,
    setActiveMode,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refetch,
  } = useN4Kanji();

  const { speak } = useVoice();

  // View: 'study' (default) or 'browse'
  const [view, setView] = useState('study');
  const [isSelectorOpen, setIsSelectorOpen] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [studyComplete, setStudyComplete] = useState(false);
  const [missedCards, setMissedCards] = useState([]);
  const missedCardsRef = useRef([]);
  const [playingAudio, setPlayingAudio] = useState(false);

  // Local study deck
  const [deck, setDeck] = useState([]);

  // Framer Motion gesture values for left/right swipe
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-12, 12]);
  const cardOpacity = useTransform(x, [-500, -260, 0, 260, 500], [0.35, 0.95, 1, 0.95, 0.35]);

  // Underneath card scale and opacity — visible during swipe
  const nextCardScale = useTransform(x, [-260, 0, 260], [1, 0.95, 1]);
  const nextCardOpacity = useTransform(x, [-260, 0, 260], [1, 0, 1]);

  // Subtle background color tint when swiping right (green) or left (red)
  const bgOverlay = useTransform(x, [-160, -25, 0, 25, 160], [
    'rgba(239, 68, 68, 0.22)',   // red on left swipe
    'rgba(239, 68, 68, 0.05)',
    'rgba(0, 0, 0, 0)',
    'rgba(34, 197, 94, 0.05)',
    'rgba(34, 197, 94, 0.22)',   // green on right swipe
  ]);

  // Stamp badge opacity
  const gotOpacity = useTransform(x, [25, 90], [0, 1]);
  const againOpacity = useTransform(x, [-25, -90], [0, 1]);

  const [exitDir, setExitDir] = useState(null);
  const isDraggingRef = useRef(false);

  // Sync mode with URL if changed (e.g. browser back/forward)
  useEffect(() => {
    if (urlMode !== activeMode) {
      setActiveMode(urlMode);
    }
  }, [urlMode, activeMode, setActiveMode]);

  // Sync local deck when rawDeck changes (from fetch, lesson filter, or search filter)
  useEffect(() => {
    setDeck([...rawDeck]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrect(0);
    setIncorrect(0);
    setStudyComplete(false);
    setMissedCards([]);
    missedCardsRef.current = [];
    x.jump(0);
    setExitDir(null);
  }, [rawDeck, x]);

  const handleModeChange = (newMode) => {
    setActiveMode(newMode);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('mode', newMode);
      return next;
    });
    setSearchQuery('');
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrect(0);
    setIncorrect(0);
    setStudyComplete(false);
    setMissedCards([]);
    missedCardsRef.current = [];
    x.jump(0);
    setExitDir(null);
  };

  const flipCard = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const nextCard = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setStudyComplete(true);
    }
  }, [currentIndex, deck.length]);

  const prevCard = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const markCorrect = useCallback(() => {
    setCorrect((prev) => prev + 1);
    nextCard();
  }, [nextCard]);

  const markIncorrect = useCallback(() => {
    setIncorrect((prev) => prev + 1);
    const current = deck[currentIndex];
    if (current && !missedCardsRef.current.find((c) => c.id === current.id)) {
      missedCardsRef.current = [...missedCardsRef.current, current];
      setMissedCards([...missedCardsRef.current]);
    }
    nextCard();
  }, [nextCard, deck, currentIndex]);

  const triggerSwipe = useCallback((dir) => {
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
        if (dir > 0) {
          markCorrect();
        } else {
          markIncorrect();
        }
      },
    });
  }, [exitDir, x, markCorrect, markIncorrect]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = (_e, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > 70 || velocity > 350) {
      triggerSwipe(1); // Swiped right: Got it / Correct
    } else if (offset < -70 || velocity < -350) {
      triggerSwipe(-1); // Swiped left: Again / Wrong
    } else {
      animate(x, 0, { type: 'spring', stiffness: 350, damping: 25 });
    }
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 60);
  };

  const handleCardClick = () => {
    if (isDraggingRef.current || exitDir) return;
    flipCard();
  };

  const shuffleDeck = useCallback(() => {
    setDeck((prev) => {
      const newDeck = [...prev];
      for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
      }
      return newDeck;
    });
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrect(0);
    setIncorrect(0);
    setStudyComplete(false);
    x.jump(0);
    setExitDir(null);
  }, [x]);

  const resetStudy = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrect(0);
    setIncorrect(0);
    setStudyComplete(false);
    setMissedCards([]);
    missedCardsRef.current = [];
    x.jump(0);
    setExitDir(null);
  }, [x]);

  const studyMissed = useCallback(() => {
    const missed = missedCardsRef.current;
    if (missed.length === 0) return;
    setDeck([...missed]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrect(0);
    setIncorrect(0);
    setStudyComplete(false);
    setMissedCards([]);
    missedCardsRef.current = [];
    x.jump(0);
    setExitDir(null);
  }, [x]);

  const toggleReverse = useCallback(() => {
    setIsReversed((prev) => !prev);
    setIsFlipped(false);
  }, []);

  // Audio Playback
  const playAudio = async (text, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!text || playingAudio) return;
    setPlayingAudio(true);
    try {
      await speak(text);
    } catch (err) {
      console.error('Audio playback error:', err);
    } finally {
      setPlayingAudio(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (view !== 'study' || studyComplete || isLoading) return;
    const handleKey = (e) => {
      const target = e.target;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === ' ' || e.key === 'Enter') {
        if (tag === 'BUTTON') return;
        e.preventDefault();
        flipCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerSwipe(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerSwipe(-1);
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        const current = deck[currentIndex];
        if (current) {
          if (activeMode === 'reading') {
            playAudio(current.kunyomi || current.onyomi || current.kanji);
          } else {
            playAudio(current.reading_hiragana || current.word_kanji);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [view, isFlipped, studyComplete, isLoading, flipCard, triggerSwipe, deck, currentIndex, activeMode]);

  // Loading state
  if (isLoading) {
    return (
      <div className="kanji-dashboard" id="n4-kanji-loading">
        <div className="vp-header-bar" style={{ maxWidth: '850px', margin: '0 auto 16px', width: '100%' }}>
          <button type="button" className="vp-back-btn" onClick={() => navigate('/n4')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back to N4 Vocab</span>
          </button>
        </div>
        <div className="grammar-loading">
          <div className="grammar-loading-char">漢</div>
          <div className="grammar-loading-text">Loading N4 Kanji from Supabase...</div>
          <div className="grammar-loading-bar">
            <div className="grammar-loading-bar-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="kanji-dashboard" id="n4-kanji-error">
        <div className="vp-header-bar" style={{ maxWidth: '850px', margin: '0 auto 16px', width: '100%' }}>
          <button type="button" className="vp-back-btn" onClick={() => navigate('/n4')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back to N4 Vocab</span>
          </button>
        </div>
        <div className="grammar-error">
          <div className="grammar-error-icon">⚠</div>
          <div className="grammar-error-title">Could not load N4 Kanji</div>
          <div className="grammar-error-detail">{error}</div>
          <button className="kf-action-btn" onClick={refetch} style={{ marginTop: '16px' }}>
            ↻ Retry
          </button>
        </div>
      </div>
    );
  }

  const currentCard = deck[currentIndex];
  const nextCardData = deck[currentIndex + 1];
  const pct = deck.length > 1 ? currentIndex / (deck.length - 1) : 1;
  const circ = 2 * Math.PI * 22;
  const ringOffset = circ * (1 - pct);

  return (
    <div className="kanji-dashboard" id="n4-kanji-page">
      {/* Top Header Bar with Back Button */}
      <div className="vp-header-bar" style={{ maxWidth: '850px', margin: '0 auto 16px', width: '100%' }}>
        <button
          type="button"
          className="vp-back-btn"
          onClick={() => {
            if (view === 'browse') {
              setView('study');
            } else {
              navigate('/n4');
            }
          }}
          title={view === 'browse' ? 'Back to Cards study' : 'Return to N4 Vocabulary'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>{view === 'browse' ? 'Back to Flashcards' : 'Back to N4 Vocab'}</span>
        </button>

        <div className="vp-badge-pill">
          <span>{deck.length} {activeMode === 'reading' ? 'Kanji Readings' : 'Kanji Vocab'} · N4</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="vocab-page-header">
        <h2 className="vocab-page-title">
          漢字 <span>N4 Kanji · 漢字学習</span>
        </h2>
        <p className="vocab-page-subtitle">
          JLPT N4 · Minna no Nihongo · {activeMode === 'reading' ? 'Kanji Readings (読み方)' : 'Kanji Vocabulary (単語)'}
        </p>
      </div>

      {/* Mode Sub-tabs: Kanji Reading vs Kanji Vocab */}
      <div className="n4-section-toggle" style={{ maxWidth: '520px', margin: '0 auto 16px' }}>
        <button
          type="button"
          className={`n4-toggle-tab ${activeMode === 'reading' ? 'active' : ''}`}
          onClick={() => handleModeChange('reading')}
        >
          <span className="n4-tab-icon">🈸</span>
          <span>Kanji Reading (読み方)</span>
          <span className="n4-tab-badge">{readingList.length}</span>
        </button>
        <button
          type="button"
          className={`n4-toggle-tab ${activeMode === 'vocab' ? 'active' : ''}`}
          onClick={() => handleModeChange('vocab')}
        >
          <span className="n4-tab-icon">📖</span>
          <span>Kanji Vocab (単語)</span>
          <span className="n4-tab-badge">{vocabList.length}</span>
        </button>
      </div>

      {/* ── Multi-Chapter Lesson Selector Card (Accordion & Number Grid from Vocab) ── */}
      <div className="lesson-card-container" style={{ margin: '0 auto 16px' }}>
        <div
          className="lesson-card-header"
          onClick={() => setIsSelectorOpen((prev) => !prev)}
        >
          <div className="lesson-card-header-left">
            <div className="lesson-card-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <div className="lesson-card-titles">
              <span className="lesson-card-title">
                {activeMode === 'reading' ? 'N4 Kanji Readings' : 'N4 Kanji Vocab'}
              </span>
              <span className="lesson-card-subtitle">
                {activeLessons.size === 1
                  ? `Lesson ${[...activeLessons][0]} · Minna no Nihongo`
                  : activeLessons.size === lessons.length
                    ? `Minna no Nihongo · Lessons 1–${lessons.length}`
                    : `${activeLessons.size} Lessons Selected`}
              </span>
            </div>
          </div>

          <div className="lesson-card-header-right">
            <span>
              {activeLessons.size === 1
                ? `${[...activeLessons][0]} / ${lessons.length}`
                : `${activeLessons.size} / ${lessons.length}`}
            </span>
            <span
              className="lesson-card-chevron"
              style={{
                transform: isSelectorOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
        </div>

        {isSelectorOpen && (
          <div className="lesson-card-body">
            <div className="lesson-card-toolbar">
              <div className="lesson-card-toolbar-left">
                <span className="lesson-card-label">Select Chapters</span>
                <button
                  type="button"
                  className={`lesson-quick-btn ${activeLessons.size === lessons.length ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllLessons();
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  className="lesson-quick-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetToLesson1();
                  }}
                >
                  Reset
                </button>
              </div>
              <span className="lesson-card-total">
                {lessons.length} chapters total
              </span>
            </div>

            <div className="lesson-number-grid">
              {lessons.map((lesson) => {
                const isActive = activeLessons.has(lesson);
                return (
                  <button
                    key={lesson}
                    type="button"
                    className={`lesson-number-btn ${isActive ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActiveLesson(lesson);
                    }}
                    title={`Toggle Lesson ${lesson}`}
                  >
                    {lesson}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search and View Toolbar */}
      <div className="vp-controls-panel" style={{ maxWidth: '520px', margin: '0 auto 20px', width: '100%' }}>
        <div className="vp-filter-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="grammar-search-wrapper" style={{ flex: '1', minWidth: '180px', margin: 0 }}>
            <input
              type="text"
              className="grammar-search"
              style={{ width: '100%', padding: '6px 28px 6px 10px', fontSize: '0.75rem', height: '34px' }}
              placeholder={activeMode === 'reading' ? 'Search kanji, reading, meaning...' : 'Search word, kanji, meaning...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="grammar-search-clear"
                onClick={() => setSearchQuery('')}
                style={{ top: '7px' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`vp-mode-pill ${view === 'study' ? 'active' : ''}`}
              onClick={() => setView('study')}
              title="Flashcard study view"
            >
              Cards
            </button>
            <button
              type="button"
              className={`vp-mode-pill ${view === 'browse' ? 'active' : ''}`}
              onClick={() => setView('browse')}
              title="Grid overview"
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* ─── STUDY VIEW (Flashcards) ─── */}
      {view === 'study' ? (
        deck.length === 0 ? (
          <div className="grammar-error" style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div className="grammar-error-icon">📖</div>
            <div className="grammar-error-title">No cards found</div>
            <div className="grammar-error-detail">
              {searchQuery
                ? `No cards match "${searchQuery}" in the selected chapters.`
                : 'No cards available for the selected chapters.'}
            </div>
            <button
              type="button"
              className="kf-action-btn"
              onClick={() => {
                selectAllLessons();
                setSearchQuery('');
              }}
              style={{ marginTop: '14px' }}
            >
              Reset to All Chapters
            </button>
          </div>
        ) : studyComplete ? (
          /* Completion Screen */
          <div className="kf-complete">
            <div className="kf-complete-icon">🎉</div>
            <h2 className="kf-complete-title">Session Complete!</h2>
            <div className="kf-complete-stats">
              <div className="kf-complete-stat">
                <span className="kf-complete-number green">{correct}</span>
                <span className="kf-complete-label">Correct</span>
              </div>
              <div className="kf-complete-stat">
                <span className="kf-complete-number red">{incorrect}</span>
                <span className="kf-complete-label">Incorrect</span>
              </div>
              <div className="kf-complete-stat">
                <span className="kf-complete-number">
                  {correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0}%
                </span>
                <span className="kf-complete-label">Accuracy</span>
              </div>
            </div>
            <div className="kf-complete-bar">
              <div
                className="kf-complete-bar-fill"
                style={{
                  width: `${correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0}%`,
                }}
              ></div>
            </div>

            {missedCards.length === 0 && (
              <div className="kf-perfect">
                <span className="kf-perfect-emoji">🌟</span>
                <span className="kf-perfect-text">Perfect! No missed cards!</span>
              </div>
            )}

            <div className="kf-complete-actions">
              <button type="button" className="kf-action-btn" onClick={resetStudy}>↻ Study Again</button>
              <button type="button" className="kf-action-btn" onClick={shuffleDeck}>⇄ Shuffle &amp; Retry</button>
              <button type="button" className="kf-action-btn secondary" onClick={() => setView('browse')}>Browse Grid</button>
            </div>

            {missedCards.length > 0 && (
              <button type="button" className="kf-action-btn kf-study-missed-btn" onClick={studyMissed}>
                🔁 Review Wrong Cards ({missedCards.length})
              </button>
            )}
          </div>
        ) : (
          /* Active Flashcard Stack with Left/Right Swipe */
          <>
            {/* Header info bar */}
            <div className="kf-header" style={{ width: '100%', maxWidth: '520px', margin: '0 auto 16px' }}>
              <button
                type="button"
                className="kf-back-btn"
                onClick={() => setView('browse')}
                title="Browse all kanji cards in a grid"
              >
                ← Grid View
              </button>
              <div className="kf-header-info">
                <span className="kf-header-title">
                  {activeMode === 'reading' ? '漢字 N4 Readings' : '単語 N4 Vocab'}
                </span>
                <span className="kf-header-sub">
                  {activeLessons.size === 1
                    ? `Lesson ${[...activeLessons][0]} · `
                    : activeLessons.size < lessons.length
                      ? `${activeLessons.size} Lessons · `
                      : 'All Lessons · '}
                  {deck.length} cards
                </span>
              </div>
              <div className="kf-header-score">
                <span className="kf-score-correct">✓ {correct}</span>
                <span className="kf-score-incorrect">✗ {incorrect}</span>
              </div>
            </div>

            {/* Card Stack Container (underneath preview + top active swipeable card) */}
            <div className="kf-stack-container">
              {/* Underneath Card */}
              {nextCardData && (
                <Motion.div
                  className="kf-card-wrapper card-underneath"
                  style={{
                    scale: nextCardScale,
                    opacity: nextCardOpacity,
                  }}
                >
                  <div className="kf-card-inner">
                    <div className="kf-card-face kf-front">
                      <span className="kf-card-label">
                        {activeMode === 'reading'
                          ? isReversed ? 'Meaning · N4' : 'Kanji · N4'
                          : isReversed ? 'Meaning · N4' : 'Kanji Vocab · N4'}
                      </span>
                      <span className="kf-card-counter">
                        {nextCardData?.lesson ? <span style={{ marginRight: '6px' }}>L{nextCardData.lesson}</span> : null}
                        {currentIndex + 2}/{deck.length}
                      </span>

                      {activeMode === 'reading' ? (
                        isReversed ? (
                          <>
                            <div className="kf-card-meaning-front">{nextCardData.meaning_en}</div>
                            {nextCardData.strokes && <div className="kf-card-hint">{nextCardData.strokes} strokes</div>}
                          </>
                        ) : (
                          <>
                            <div className="kf-card-kanji">{nextCardData.kanji}</div>
                            {nextCardData.strokes && <div className="kf-card-hint" style={{ marginTop: '8px' }}>{nextCardData.strokes} strokes</div>}
                          </>
                        )
                      ) : (
                        isReversed ? (
                          <>
                            <div className="kf-card-meaning-front">{nextCardData.meaning_en}</div>
                            {nextCardData.kanji && <div className="kf-card-hint">Target Kanji: 【{nextCardData.kanji}】</div>}
                          </>
                        ) : (
                          <>
                            {nextCardData.kanji && (
                              <div className="n4-target-kanji-pill">
                                漢字: <span className="target-char">{nextCardData.kanji}</span>
                              </div>
                            )}
                            <div className="kf-card-kanji" style={{ fontSize: '3rem', marginTop: '6px' }}>
                              {nextCardData.word_kanji}
                            </div>
                          </>
                        )
                      )}
                      <span className="kf-tap-hint">tap to reveal</span>
                    </div>
                  </div>
                </Motion.div>
              )}

              {/* Top Active Card with Drag & Swipe */}
              <Motion.div
                className="kf-card-wrapper card-top"
                style={{ x, rotate, opacity: cardOpacity }}
                drag={!exitDir ? 'x' : false}
                dragElastic={0.8}
                dragConstraints={{ left: 0, right: 0 }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={handleCardClick}
                role="button"
                tabIndex={0}
                aria-label="Flashcard - swipe left/right to score or tap to flip"
              >
                <div className={`kf-card-inner ${isFlipped ? 'flipped' : ''}`}>
                  {/* ── FRONT FACE ── */}
                  <div className="kf-card-face kf-front">
                    <Motion.div className="swipe-bg-overlay" style={{ backgroundColor: bgOverlay }} />
                    <Motion.div className="swipe-stamp got" style={{ opacity: gotOpacity }}>
                      ✓ 正解
                    </Motion.div>
                    <Motion.div className="swipe-stamp again" style={{ opacity: againOpacity }}>
                      ✗ 間違い
                    </Motion.div>

                    <span className="kf-card-label">
                      {activeMode === 'reading'
                        ? isReversed ? 'Meaning · N4' : 'Kanji · N4'
                        : isReversed ? 'Meaning · N4' : 'Kanji Vocab · N4'}
                    </span>
                    <span className="kf-card-counter">
                      {currentCard?.lesson ? <span style={{ marginRight: '6px' }}>L{currentCard.lesson}</span> : null}
                      {currentIndex + 1}/{deck.length}
                    </span>

                    {/* KANJI READING MODE: FRONT */}
                    {activeMode === 'reading' && (
                      isReversed ? (
                        <>
                          <div className="kf-card-meaning-front">{currentCard?.meaning_en}</div>
                          {currentCard?.strokes && (
                            <div className="kf-card-hint">{currentCard.strokes} strokes</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="kf-card-kanji">{currentCard?.kanji}</div>
                          {currentCard?.strokes && (
                            <div className="kf-card-hint" style={{ marginTop: '8px' }}>
                              {currentCard.strokes} strokes
                            </div>
                          )}
                          <button
                            type="button"
                            className={`card-audio-btn ${playingAudio ? 'playing' : ''}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              playAudio(currentCard?.kunyomi || currentCard?.onyomi || currentCard?.kanji, e);
                            }}
                            title="Pronounce readings"
                            aria-label="Play pronunciation"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                          </button>
                        </>
                      )
                    )}

                    {/* KANJI VOCAB MODE: FRONT */}
                    {activeMode === 'vocab' && (
                      isReversed ? (
                        <>
                          <div className="kf-card-meaning-front">{currentCard?.meaning_en}</div>
                          {currentCard?.kanji && (
                            <div className="kf-card-hint">Target Kanji: 【{currentCard.kanji}】</div>
                          )}
                        </>
                      ) : (
                        <>
                          {currentCard?.kanji && (
                            <div className="n4-target-kanji-pill">
                              漢字: <span className="target-char">{currentCard.kanji}</span>
                            </div>
                          )}
                          <div className="kf-card-kanji" style={{ fontSize: '3rem', marginTop: '6px' }}>
                            {currentCard?.word_kanji}
                          </div>
                          <button
                            type="button"
                            className={`card-audio-btn ${playingAudio ? 'playing' : ''}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              playAudio(currentCard?.reading_hiragana || currentCard?.word_kanji, e);
                            }}
                            title="Pronounce word"
                            aria-label="Play pronunciation"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                          </button>
                        </>
                      )
                    )}

                    <span className="kf-tap-hint">tap to reveal</span>
                  </div>

                  {/* ── BACK FACE ── */}
                  <div className="kf-card-face kf-back">
                    <Motion.div className="swipe-bg-overlay" style={{ backgroundColor: bgOverlay }} />
                    <Motion.div className="swipe-stamp got" style={{ opacity: gotOpacity }}>
                      ✓ 正解
                    </Motion.div>
                    <Motion.div className="swipe-stamp again" style={{ opacity: againOpacity }}>
                      ✗ 間違い
                    </Motion.div>

                    <span className="kf-card-label">
                      {activeMode === 'reading'
                        ? isReversed ? 'Kanji & Readings' : 'Meaning & Readings'
                        : isReversed ? 'Kanji Word' : 'Reading & Meaning'}
                    </span>
                    <span className="kf-card-counter">
                      {currentCard?.lesson ? <span style={{ marginRight: '6px' }}>L{currentCard.lesson}</span> : null}
                      {currentIndex + 1}/{deck.length}
                    </span>

                    {/* KANJI READING MODE: BACK */}
                    {activeMode === 'reading' && (
                      isReversed ? (
                        <>
                          <div className="kf-card-kanji">{currentCard?.kanji}</div>
                          <div className="kf-back-readings">
                            {currentCard?.onyomi && (
                              <div className="kf-reading-line">
                                <span className="kf-reading-badge on">音</span> {currentCard.onyomi}
                              </div>
                            )}
                            {currentCard?.kunyomi && (
                              <div className="kf-reading-line">
                                <span className="kf-reading-badge kun">訓</span> {currentCard.kunyomi}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="kf-back-meaning">{currentCard?.meaning_en}</div>
                          <div className="kf-back-readings">
                            {currentCard?.onyomi && (
                              <div className="kf-reading-line">
                                <span className="kf-reading-badge on">音</span> {currentCard.onyomi}
                              </div>
                            )}
                            {currentCard?.kunyomi && (
                              <div className="kf-reading-line">
                                <span className="kf-reading-badge kun">訓</span> {currentCard.kunyomi}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className={`card-audio-btn ${playingAudio ? 'playing' : ''}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              playAudio(currentCard?.kunyomi || currentCard?.onyomi || currentCard?.kanji, e);
                            }}
                            title="Pronounce readings"
                            aria-label="Play pronunciation"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                          </button>
                        </>
                      )
                    )}

                    {/* KANJI VOCAB MODE: BACK */}
                    {activeMode === 'vocab' && (
                      isReversed ? (
                        <>
                          <div className="kf-card-kanji" style={{ fontSize: '3rem' }}>
                            {currentCard?.word_kanji}
                          </div>
                          <div className="n4-vocab-reading" style={{ marginTop: '8px' }}>
                            {currentCard?.reading_hiragana}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="n4-vocab-reading">
                            {currentCard?.reading_hiragana}
                          </div>
                          <div className="kf-back-meaning" style={{ marginTop: '6px' }}>
                            {currentCard?.meaning_en}
                          </div>
                          {currentCard?.kanji && (
                            <div className="n4-vocab-kanji-ref">
                              Target Kanji: <strong>{currentCard.kanji}</strong>
                            </div>
                          )}
                          <button
                            type="button"
                            className={`card-audio-btn ${playingAudio ? 'playing' : ''}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              playAudio(currentCard?.reading_hiragana || currentCard?.word_kanji, e);
                            }}
                            title="Pronounce word"
                            aria-label="Play pronunciation"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                          </button>
                        </>
                      )
                    )}

                    <span className="kf-tap-hint">tap to flip back</span>
                  </div>
                </div>
              </Motion.div>
            </div>

            {/* Navigation buttons */}
            <div className="nav">
              <button
                type="button"
                className="nav-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  prevCard();
                }}
                disabled={currentIndex === 0}
              >
                ← Prev
              </button>
              <div className="progress-ring">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle className="bg" cx="26" cy="26" r="22" fill="none" strokeWidth="3" />
                  <circle
                    className="fg"
                    cx="26"
                    cy="26"
                    r="22"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray="138.2"
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <span>
                  {currentIndex + 1}
                  <br />
                  <span style={{ fontSize: '0.5rem', color: 'var(--border)' }}>{deck.length}</span>
                </span>
              </div>
              <button
                type="button"
                className="nav-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  nextCard();
                }}
                disabled={currentIndex === deck.length - 1}
              >
                Next →
              </button>
            </div>

            {/* Score buttons (shown when flipped or directly swiped) */}
            <div className="score-row" style={{ display: isFlipped ? 'flex' : 'none' }}>
              <button
                type="button"
                className="score-btn wrong"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerSwipe(-1);
                }}
              >
                ✗ Again
              </button>
              <button
                type="button"
                className="score-btn right"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerSwipe(1);
                }}
              >
                ✓ Got it
              </button>
            </div>

            {/* Bottom controls */}
            <div className="bottom-row">
              <button
                type="button"
                className="shuffle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  shuffleDeck();
                }}
              >
                ⇄ Shuffle deck
              </button>
              <button
                type="button"
                className={`reverse-btn ${isReversed ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleReverse();
                }}
              >
                ⇅ Reverse mode
              </button>
              <button
                type="button"
                className="reset-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  resetStudy();
                }}
              >
                ↻ Reset
              </button>
            </div>
          </>
        )
      ) : (
        /* ─── BROWSE GRID VIEW ─── */
        <div style={{ width: '100%', maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <button
              type="button"
              className="kf-action-btn"
              onClick={() => setView('study')}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              ← Back to Cards Study ({deck.length})
            </button>
            <div className="stats" style={{ margin: 0 }}>
              Showing {deck.length} {activeMode === 'reading' ? 'kanji' : 'words'} · Click any card to study
            </div>
          </div>
          <div className="kanji-grid">
            {deck.map((item, idx) => (
              <div
                key={item.id || idx}
                className="kanji-card"
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsFlipped(false);
                  setView('study');
                }}
                style={{ cursor: 'pointer' }}
                title="Click to study this card"
              >
                {activeMode === 'reading' ? (
                  <>
                    <div className="kanji-card-char">{item.kanji}</div>
                    <div className="kanji-card-meaning">{item.meaning_en}</div>
                    {item.strokes && <div className="kanji-card-strokes">{item.strokes} strokes</div>}
                    {item.lesson && <div className="kanji-card-category-tag">L{item.lesson}</div>}
                  </>
                ) : (
                  <>
                    <div className="kanji-card-char" style={{ fontSize: '1.8rem', lineHeight: '1.2' }}>
                      {item.word_kanji}
                    </div>
                    <div className="kanji-card-meaning" style={{ fontSize: '0.8rem', color: 'var(--red)' }}>
                      {item.reading_hiragana}
                    </div>
                    <div className="kanji-card-strokes">{item.meaning_en}</div>
                    {item.kanji && <div className="kanji-card-category-tag">【{item.kanji}】</div>}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
