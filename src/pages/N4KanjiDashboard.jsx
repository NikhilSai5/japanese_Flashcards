import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useN4Kanji } from '../hooks/useN4Kanji';
import { useVoice } from '../contexts/VoiceContext';
import '../index.css';

export default function N4KanjiDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMode = searchParams.get('mode') === 'vocab' ? 'vocab' : 'reading';

  const {
    readingList,
    vocabList,
    deck: rawDeck,
    lessons,
    activeMode,
    setActiveMode,
    selectedLesson,
    setSelectedLesson,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refetch,
  } = useN4Kanji();

  const { speak } = useVoice();

  // View: 'study' (default) or 'browse'
  const [view, setView] = useState('study');
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

  // Sync mode with URL if changed
  useEffect(() => {
    if (urlMode !== activeMode) {
      setActiveMode(urlMode);
    }
  }, [urlMode, activeMode, setActiveMode]);

  // Sync deck when rawDeck changes
  useEffect(() => {
    setDeck([...rawDeck]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrect(0);
    setIncorrect(0);
    setStudyComplete(false);
    setMissedCards([]);
    missedCardsRef.current = [];
  }, [rawDeck]);

  const handleModeChange = (newMode) => {
    setActiveMode(newMode);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('mode', newMode);
      return next;
    });
    setSelectedLesson('all');
    setSearchQuery('');
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrect(0);
    setIncorrect(0);
    setStudyComplete(false);
    setMissedCards([]);
    missedCardsRef.current = [];
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
  }, []);

  const resetStudy = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrect(0);
    setIncorrect(0);
    setStudyComplete(false);
    setMissedCards([]);
    missedCardsRef.current = [];
  }, []);

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
  }, []);

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
        if (isFlipped) {
          markCorrect();
        } else {
          nextCard();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isFlipped) {
          markIncorrect();
        } else {
          prevCard();
        }
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
  }, [view, isFlipped, studyComplete, isLoading, flipCard, nextCard, prevCard, markCorrect, markIncorrect, deck, currentIndex, activeMode]);

  // Loading state
  if (isLoading) {
    return (
      <div className="kanji-dashboard" id="n4-kanji-loading">
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
  const pct = deck.length > 1 ? currentIndex / (deck.length - 1) : 1;
  const circ = 2 * Math.PI * 22;
  const ringOffset = circ * (1 - pct);

  return (
    <div className="kanji-dashboard" id="n4-kanji-page">
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
      <div className="n4-section-toggle">
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

      {/* Filter and View Toolbar */}
      <div className="vp-controls-panel" style={{ marginBottom: '20px' }}>
        <div className="vp-filter-row">
          <div className="vp-filter-group" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="vp-control-label">Filter Lesson:</label>
            <select
              className="vp-lesson-select"
              value={selectedLesson}
              onChange={(e) => {
                setSelectedLesson(e.target.value);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              style={{ minWidth: '150px' }}
            >
              <option value="all">All Lessons ({activeMode === 'reading' ? readingList.length : vocabList.length})</option>
              {lessons
                .filter((l) => l !== 'all')
                .map((lesson) => (
                  <option key={lesson} value={lesson}>
                    Lesson {lesson}
                  </option>
                ))}
            </select>

            <div className="grammar-search-wrapper" style={{ flex: '1', minWidth: '180px', margin: '0' }}>
              <input
                type="text"
                className="grammar-search"
                style={{ width: '100%', padding: '6px 28px 6px 10px', fontSize: '0.75rem', height: '32px' }}
                placeholder={activeMode === 'reading' ? 'Search kanji, reading, meaning...' : 'Search word, kanji, meaning...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="grammar-search-clear"
                  onClick={() => setSearchQuery('')}
                  style={{ top: '6px' }}
                >
                  ✕
                </button>
              )}
            </div>

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
          <div className="grammar-error">
            <div className="grammar-error-icon">📖</div>
            <div className="grammar-error-title">No cards found</div>
            <div className="grammar-error-detail">
              {searchQuery ? `No cards match "${searchQuery}".` : 'No cards available for this filter in Supabase.'}
            </div>
            <button
              className="kf-action-btn"
              onClick={() => {
                setSelectedLesson('all');
                setSearchQuery('');
              }}
              style={{ marginTop: '14px' }}
            >
              Clear Filters
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

            {missedCardsRef.current.length === 0 && (
              <div className="kf-perfect">
                <span className="kf-perfect-emoji">🌟</span>
                <span className="kf-perfect-text">Perfect! No missed cards!</span>
              </div>
            )}

            <div className="kf-complete-actions">
              <button className="kf-action-btn" onClick={resetStudy}>↻ Study Again</button>
              <button className="kf-action-btn" onClick={shuffleDeck}>⇄ Shuffle &amp; Retry</button>
              <button className="kf-action-btn secondary" onClick={() => setView('browse')}>Browse Grid</button>
            </div>

            {missedCardsRef.current.length > 0 && (
              <button className="kf-action-btn kf-study-missed-btn" onClick={studyMissed}>
                🔁 Review Wrong Cards ({missedCardsRef.current.length})
              </button>
            )}
          </div>
        ) : (
          /* Active Flashcard */
          <>
            <div className="stats" style={{ marginBottom: '16px' }}>
              {deck.length} {activeMode === 'reading' ? 'kanji' : 'words'} · {correct} correct this session
            </div>

            <div className="kf-card-wrapper" onClick={flipCard}>
              <div className={`kf-card-inner ${isFlipped ? 'flipped' : ''}`}>
                {/* ── FRONT FACE ── */}
                <div className="kf-card-face kf-front">
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
                          className="card-audio-btn"
                          onClick={(e) => playAudio(currentCard?.kunyomi || currentCard?.onyomi || currentCard?.kanji, e)}
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
                          className="card-audio-btn"
                          onClick={(e) => playAudio(currentCard?.reading_hiragana || currentCard?.word_kanji, e)}
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
                  {isFlipped && (
                    <>
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
                              className="card-audio-btn"
                              onClick={(e) => playAudio(currentCard?.kunyomi || currentCard?.onyomi || currentCard?.kanji, e)}
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
                              className="card-audio-btn"
                              onClick={(e) => playAudio(currentCard?.reading_hiragana || currentCard?.word_kanji, e)}
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
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="nav">
              <button className="nav-btn" onClick={prevCard} disabled={currentIndex === 0}>
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
              <button className="nav-btn" onClick={nextCard} disabled={currentIndex === deck.length - 1}>
                Next →
              </button>
            </div>

            {/* Score buttons (shown when flipped) */}
            <div className="score-row" style={{ display: isFlipped ? 'flex' : 'none' }}>
              <button className="score-btn wrong" onClick={markIncorrect}>
                ✗ Again
              </button>
              <button className="score-btn right" onClick={markCorrect}>
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
          </>
        )
      ) : (
        /* ─── BROWSE GRID VIEW ─── */
        <div style={{ width: '100%', maxWidth: '850px' }}>
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
