import { useState, useCallback, useEffect, useRef } from 'react';
import { motion as Motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useKanji } from '../hooks/useKanji';

export default function KanjiDashboard() {
  const {
    kanjiList,
    allKanji,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    categorizeKanji,
  } = useKanji();

  // View: 'browse' or 'study'
  const [view, setView] = useState('browse');
  const [selectedKanji, setSelectedKanji] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // Flashcard study state
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [studyComplete, setStudyComplete] = useState(false);
  const [missedCards, setMissedCards] = useState([]);
  const missedCardsRef = useRef([]);

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
    'rgba(34, 197, 94, 0.22)'    // green on right swipe
  ]);

  // Stamp badge opacity
  const gotOpacity = useTransform(x, [25, 90], [0, 1]);
  const againOpacity = useTransform(x, [-25, -90], [0, 1]);

  const [exitDir, setExitDir] = useState(null);
  const isDraggingRef = useRef(false);

  // When switching to study mode, build the deck from the current filtered list
  const startStudy = useCallback(() => {
    if (kanjiList.length === 0) return;
    setDeck([...kanjiList]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsReversed(false);
    setCorrect(0);
    setIncorrect(0);
    setStudyComplete(false);
    setMissedCards([]);
    missedCardsRef.current = [];
    x.jump(0);
    setExitDir(null);
    setView('study');
  }, [kanjiList, x]);

  const flipCard = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const nextCard = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setStudyComplete(true);
    }
  }, [currentIndex, deck.length]);

  const prevCard = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const markCorrect = useCallback(() => {
    setCorrect(prev => prev + 1);
    nextCard();
  }, [nextCard]);

  const markIncorrect = useCallback(() => {
    setIncorrect(prev => prev + 1);
    const current = deck[currentIndex];
    if (current && !missedCardsRef.current.find(c => c.id === current.id)) {
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
      }
    });
  }, [exitDir, x, markCorrect, markIncorrect]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = (_e, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > 70 || velocity > 350) {
      triggerSwipe(1); // Swiped right: Got it
    } else if (offset < -70 || velocity < -350) {
      triggerSwipe(-1); // Swiped left: Again
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
    setDeck(prev => {
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
    setIsReversed(prev => !prev);
    setIsFlipped(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (view !== 'study' || studyComplete) return;
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
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [view, studyComplete, flipCard, triggerSwipe]);

  // Stats
  const totalKanji = allKanji.length;
  const categoryStats = {};
  allKanji.forEach((k) => {
    const cat = categorizeKanji(k);
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  });

  if (isLoading) {
    return (
      <div className="kanji-loading">
        <div className="kanji-loading-char">漢</div>
        <div className="kanji-loading-text">Loading Kanji...</div>
        <div className="kanji-loading-bar">
          <div className="kanji-loading-bar-fill"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kanji-error">
        <div className="kanji-error-icon">⚠</div>
        <div className="kanji-error-title">Could not load Kanji</div>
        <div className="kanji-error-detail">{error}</div>
      </div>
    );
  }

  // ─── STUDY VIEW (Flashcards) ───
  if (view === 'study') {
    const currentCard = deck[currentIndex];
    const pct = deck.length > 1 ? currentIndex / (deck.length - 1) : 1;
    const circ = 2 * Math.PI * 22;
    const ringOffset = circ * (1 - pct);

    if (studyComplete) {
      const total = correct + incorrect;
      const pctCorrect = total > 0 ? Math.round((correct / total) * 100) : 0;
      return (
        <div className="kanji-dashboard" id="kanji-study">
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
                <span className="kf-complete-number">{pctCorrect}%</span>
                <span className="kf-complete-label">Accuracy</span>
              </div>
            </div>
            <div className="kf-complete-bar">
              <div className="kf-complete-bar-fill" style={{ width: `${pctCorrect}%` }}></div>
            </div>

            {missedCards.length === 0 && (
              <div className="kf-perfect">
                <span className="kf-perfect-emoji">🌟</span>
                <span className="kf-perfect-text">Perfect! No missed cards!</span>
              </div>
            )}

            <div className="kf-complete-actions">
              <button className="kf-action-btn" onClick={resetStudy}>↻ Study Again</button>
              <button className="kf-action-btn" onClick={shuffleDeck}>⇄ Shuffle &amp; Retry</button>
              <button className="kf-action-btn secondary" onClick={() => setView('browse')}>← Back to Browse</button>
            </div>

            {missedCards.length > 0 && (
              <button className="kf-action-btn kf-study-missed-btn" onClick={studyMissed}>
                🔁 Review Wrong Cards ({missedCards.length})
              </button>
            )}
          </div>
        </div>
      );
    }

    const nextCardData = deck[currentIndex + 1];

    return (
      <div className="kanji-dashboard" id="kanji-study">
        {/* Study Header */}
        <div className="kf-header">
          <button className="kf-back-btn" onClick={() => setView('browse')}>← Browse</button>
          <div className="kf-header-info">
            <span className="kf-header-title">漢字 Flashcards</span>
            <span className="kf-header-sub">
              {selectedCategory !== 'all' ? selectedCategory + ' · ' : ''}{deck.length} cards
            </span>
          </div>
          <div className="kf-header-score">
            <span className="kf-score-correct">✓ {correct}</span>
            <span className="kf-score-incorrect">✗ {incorrect}</span>
          </div>
        </div>

        {/* The Flashcard Stack with Left/Right Swipe */}
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
                    {isReversed ? 'Meaning' : 'Kanji'}
                  </span>
                  <span className="kf-card-counter">{currentIndex + 2}/{deck.length}</span>

                  {isReversed ? (
                    <>
                      <div className="kf-card-meaning-front">{nextCardData?.meaning}</div>
                      <div className="kf-card-hint">
                        {nextCardData?.strokes} strokes
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="kf-card-kanji">{nextCardData?.character}</div>
                      <div className="kf-card-strokes-dots">
                        {Array.from({ length: Math.min(nextCardData?.strokes || 0, 15) }).map((_, i) => (
                          <span key={i} className="kf-stroke-dot"></span>
                        ))}
                      </div>
                    </>
                  )}
                  <span className="kf-tap-hint">tap to reveal</span>
                </div>
              </div>
            </Motion.div>
          )}

          {/* Active Top Card */}
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
              {/* FRONT */}
              <div className="kf-card-face kf-front">
                <Motion.div className="swipe-bg-overlay" style={{ backgroundColor: bgOverlay }} />
                <Motion.div className="swipe-stamp got" style={{ opacity: gotOpacity }}>
                  ✓ 正解
                </Motion.div>
                <Motion.div className="swipe-stamp again" style={{ opacity: againOpacity }}>
                  ✗ 間違い
                </Motion.div>

                <span className="kf-card-label">
                  {isReversed ? 'Meaning' : 'Kanji'}
                </span>
                <span className="kf-card-counter">{currentIndex + 1}/{deck.length}</span>

                {isReversed ? (
                  <>
                    <div className="kf-card-meaning-front">{currentCard?.meaning}</div>
                    <div className="kf-card-hint">
                      {currentCard?.strokes} strokes
                    </div>
                  </>
                ) : (
                  <>
                    <div className="kf-card-kanji">{currentCard?.character}</div>
                    <div className="kf-card-strokes-dots">
                      {Array.from({ length: Math.min(currentCard?.strokes || 0, 15) }).map((_, i) => (
                        <span key={i} className="kf-stroke-dot"></span>
                      ))}
                    </div>
                  </>
                )}
                <span className="kf-tap-hint">tap to reveal</span>
              </div>

              {/* BACK */}
              <div className="kf-card-face kf-back">
                <Motion.div className="swipe-bg-overlay" style={{ backgroundColor: bgOverlay }} />
                <Motion.div className="swipe-stamp got" style={{ opacity: gotOpacity }}>
                  ✓ 正解
                </Motion.div>
                <Motion.div className="swipe-stamp again" style={{ opacity: againOpacity }}>
                  ✗ 間違い
                </Motion.div>

                <span className="kf-card-label">
                  {isReversed ? 'Kanji' : 'Details'}
                </span>
                <span className="kf-card-counter">{currentIndex + 1}/{deck.length}</span>

                {isReversed ? (
                  <>
                    <div className="kf-card-kanji">{currentCard?.character}</div>
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
                    <div className="kf-back-meaning">{currentCard?.meaning}</div>
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
                    {currentCard?.example_word && (
                      <div className="kf-back-example">
                        <span className="kf-example-word">{currentCard.example_word}</span>
                        <span className="kf-example-reading">{currentCard.example_reading}</span>
                        <span className="kf-example-meaning">{currentCard.example_meaning}</span>
                      </div>
                    )}
                  </>
                )}
                <span className="kf-tap-hint">tap to flip back</span>
              </div>
            </div>
          </Motion.div>
        </div>

        {/* Navigation */}
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
                {deck.length}
              </span>
            </span>
          </div>
          <button className="nav-btn" onClick={nextCard} disabled={currentIndex === deck.length - 1}>
            Next →
          </button>
        </div>

        {/* Score buttons (only when flipped) */}
        <div className="score-row" style={{ display: isFlipped ? 'flex' : 'none' }}>
          <button className="score-btn wrong" onClick={() => triggerSwipe(-1)}>
            ✗ Again
          </button>
          <button className="score-btn right" onClick={() => triggerSwipe(1)}>
            ✓ Got it
          </button>
        </div>

        {/* Bottom controls */}
        <div className="bottom-row">
          <button className="shuffle-btn" onClick={shuffleDeck}>
            ⇄ Shuffle deck
          </button>
          <button
            className={`reverse-btn ${isReversed ? 'active' : ''}`}
            onClick={toggleReverse}
          >
            ⇅ Reverse mode
          </button>
          <button className="reset-btn" onClick={resetStudy}>
            ↻ Reset
          </button>
        </div>
      </div>
    );
  }

  // ─── BROWSE VIEW ───
  return (
    <div className="kanji-dashboard" id="kanji-dashboard">
      {/* Hero Stats */}
      <div className="kanji-hero">
        <div className="kanji-hero-stat">
          <span className="kanji-hero-number">{totalKanji}</span>
          <span className="kanji-hero-label">Total Kanji</span>
        </div>
        <div className="kanji-hero-stat">
          <span className="kanji-hero-number">{Object.keys(categoryStats).length}</span>
          <span className="kanji-hero-label">Categories</span>
        </div>
        <div className="kanji-hero-stat">
          <span className="kanji-hero-number">N5</span>
          <span className="kanji-hero-label">JLPT Level</span>
        </div>
        <div className="kanji-hero-stat kanji-hero-study" onClick={startStudy}>
          <span className="kanji-hero-number">📖</span>
          <span className="kanji-hero-label">Study Cards</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="kanji-toolbar">
        <div className="kanji-search-wrapper">
          <span className="kanji-search-icon">🔍</span>
          <input
            type="text"
            className="kanji-search"
            placeholder="Search kanji, meaning, reading..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="kanji-search-input"
          />
          {searchQuery && (
            <button
              className="kanji-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        <button className="kf-study-btn" onClick={startStudy} disabled={kanjiList.length === 0}>
          📖 Study ({kanjiList.length})
        </button>

        <div className="kanji-view-toggle">
          <button
            className={`kanji-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            ⊞
          </button>
          <button
            className={`kanji-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="kanji-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`kanji-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? 'All' : cat}
            <span className="kanji-cat-count">
              {cat === 'all' ? totalKanji : (categoryStats[cat] || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="kanji-results-info">
        Showing {kanjiList.length} of {totalKanji} kanji
      </div>

      {/* Kanji Grid / List */}
      {viewMode === 'grid' ? (
        <div className="kanji-grid">
          {kanjiList.map((kanji) => (
            <div
              key={kanji.id}
              className={`kanji-card ${selectedKanji?.id === kanji.id ? 'selected' : ''}`}
              onClick={() => setSelectedKanji(selectedKanji?.id === kanji.id ? null : kanji)}
            >
              <div className="kanji-card-char">{kanji.character}</div>
              <div className="kanji-card-meaning">{kanji.meaning}</div>
              <div className="kanji-card-strokes">{kanji.strokes} strokes</div>
              <div className="kanji-card-category-tag">{categorizeKanji(kanji)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="kanji-list">
          {kanjiList.map((kanji) => (
            <div
              key={kanji.id}
              className={`kanji-list-item ${selectedKanji?.id === kanji.id ? 'selected' : ''}`}
              onClick={() => setSelectedKanji(selectedKanji?.id === kanji.id ? null : kanji)}
            >
              <div className="kanji-list-char">{kanji.character}</div>
              <div className="kanji-list-info">
                <div className="kanji-list-meaning">{kanji.meaning}</div>
                <div className="kanji-list-readings">
                  {kanji.onyomi && <span className="kanji-list-on">音 {kanji.onyomi}</span>}
                  {kanji.kunyomi && <span className="kanji-list-kun">訓 {kanji.kunyomi}</span>}
                </div>
              </div>
              <div className="kanji-list-strokes">{kanji.strokes}画</div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedKanji && (
        <div className="kanji-detail-overlay" onClick={() => setSelectedKanji(null)}>
          <div className="kanji-detail" onClick={(e) => e.stopPropagation()}>
            <button className="kanji-detail-close" onClick={() => setSelectedKanji(null)}>✕</button>

            <div className="kanji-detail-header">
              <div className="kanji-detail-char">{selectedKanji.character}</div>
              <div className="kanji-detail-meaning-large">{selectedKanji.meaning}</div>
              <div className="kanji-detail-level">{selectedKanji.level} · {selectedKanji.strokes} strokes</div>
            </div>

            <div className="kanji-detail-body">
              <div className="kanji-detail-section">
                <h3>Readings</h3>
                <div className="kanji-detail-readings">
                  {selectedKanji.onyomi && (
                    <div className="kanji-reading-row">
                      <span className="kanji-reading-type on">音読み</span>
                      <span className="kanji-reading-value">{selectedKanji.onyomi}</span>
                    </div>
                  )}
                  {selectedKanji.kunyomi && (
                    <div className="kanji-reading-row">
                      <span className="kanji-reading-type kun">訓読み</span>
                      <span className="kanji-reading-value">{selectedKanji.kunyomi}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedKanji.example_word && (
                <div className="kanji-detail-section">
                  <h3>Example</h3>
                  <div className="kanji-example-box">
                    <div className="kanji-example-word">{selectedKanji.example_word}</div>
                    <div className="kanji-example-reading">{selectedKanji.example_reading}</div>
                    <div className="kanji-example-meaning">{selectedKanji.example_meaning}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {kanjiList.length === 0 && !isLoading && (
        <div className="kanji-empty">
          <div className="kanji-empty-icon">空</div>
          <div className="kanji-empty-text">No kanji found matching your search</div>
        </div>
      )}
    </div>
  );
}
