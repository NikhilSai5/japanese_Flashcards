import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useVerbPairs } from '../hooks/useVerbPairs';
import { useCardNavigation } from '../hooks/useCardNavigation';
import { useVoice } from '../contexts/VoiceContext';
import '../index.css';

// Helper to convert any remaining kanji in example sentences to pure Hiragana/Katakana
function toKanaExample(sentence, card) {
  if (!sentence) return '';
  let res = sentence;
  if (card?.jidoshi_kanji && card?.jidoshi_jp) {
    res = res.replaceAll(card.jidoshi_kanji, card.jidoshi_jp);
  }
  if (card?.tadoshi_kanji && card?.tadoshi_jp) {
    res = res.replaceAll(card.tadoshi_kanji, card.tadoshi_jp);
  }
  return res
    .replaceAll('二つに', 'ふたつに')
    .replaceAll('目が', 'めが')
    .replaceAll('目を', 'めを')
    .replaceAll('辞めます', 'やめます')
    .replaceAll('無くします', 'なくします');
}

// Helper to sanitize notes so no kanji appears
function cleanNoteToKana(note) {
  if (!note) return '';
  return note
    .replaceAll('治ります', 'なおります')
    .replaceAll('治します', 'なおします')
    .replaceAll('別れます', 'わかれます')
    .replaceAll('過ぎる', 'すぎます')
    .replaceAll('過ごす', 'すごします');
}

export default function VerbPairsFlashcards({ onBackToVocab }) {
  const navigate = useNavigate();
  const { deck: initialDeck, allPairs, lessons, selectedLesson, setSelectedLesson, isLoading, error, refetch } = useVerbPairs();
  const { speak } = useVoice();

  const handleBack = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (typeof onBackToVocab === 'function') {
      onBackToVocab();
    } else {
      navigate('/n4');
    }
  };

  const [localDeck, setLocalDeck] = useState([]);
  const [studyMode, setStudyMode] = useState('contrast'); // 'contrast' | 'jidoshi_first' | 'tadoshi_first' | 'both_first'
  const [exitDir, setExitDir] = useState(null);
  const [playingKey, setPlayingKey] = useState(null);

  const {
    currentIndex,
    correct,
    incorrect,
    isFlipped,
    sessionComplete,
    getMissedDeck,
    nextCard,
    prevCard,
    flipCard,
    markCorrect,
    markIncorrect,
    reset
  } = useCardNavigation(localDeck);

  // Sync initial deck from hook
  useEffect(() => {
    setLocalDeck([...initialDeck]);
    reset();
  }, [initialDeck, reset]);

  // Motion values for swipe
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-12, 12]);
  const cardOpacity = useTransform(x, [-500, -260, 0, 260, 500], [0.35, 0.95, 1, 0.95, 0.35]);
  const nextCardScale = useTransform(x, [-260, 0, 260], [1, 0.95, 1]);
  const nextCardOpacity = useTransform(x, [-260, 0, 260], [1, 0, 1]);

  const bgOverlay = useTransform(x, [-160, -25, 0, 25, 160], [
    'rgba(239, 68, 68, 0.22)',
    'rgba(239, 68, 68, 0.05)',
    'rgba(0, 0, 0, 0)',
    'rgba(34, 197, 94, 0.05)',
    'rgba(34, 197, 94, 0.22)'
  ]);

  const gotOpacity = useTransform(x, [25, 90], [0, 1]);
  const againOpacity = useTransform(x, [-25, -90], [0, 1]);

  const isDraggingRef = useRef(false);

  // Play audio
  const handlePlayAudio = async (text, key, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!text || playingKey) return;
    setPlayingKey(key);
    try {
      await speak(text);
    } catch (err) {
      console.error('Audio playback failed:', err);
    } finally {
      setPlayingKey(null);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...localDeck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setLocalDeck(shuffled);
    reset();
  };

  const handleReviewWrong = () => {
    const missed = getMissedDeck();
    if (missed.length === 0) return;
    setLocalDeck([...missed]);
    reset();
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
        if (dir > 0) {
          markCorrect();
        } else {
          markIncorrect();
        }
      }
    });
  };

  // Keyboard navigation
  useEffect(() => {
    if (sessionComplete || isLoading) return;
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === ' ' || e.key === 'Enter') {
        if (tag === 'BUTTON') return;
        e.preventDefault();
        flipCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!isFlipped) {
          nextCard();
        } else {
          triggerSwipe(1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!isFlipped) {
          prevCard();
        } else {
          triggerSwipe(-1);
        }
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        const current = localDeck[currentIndex];
        if (current) {
          handlePlayAudio(current.jidoshi_jp, 'jidoshi_jp');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isLoading, sessionComplete, currentIndex, localDeck, flipCard, nextCard, prevCard]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = (_e, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > 70 || velocity > 350) {
      triggerSwipe(1);
    } else if (offset < -70 || velocity < -350) {
      triggerSwipe(-1);
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

  if (isLoading) {
    return (
      <div className="verb-pairs-view">
        <div className="vp-header-bar">
          <button type="button" className="vp-back-btn" onClick={handleBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back to N4 Vocab</span>
          </button>
        </div>
        <div className="grammar-loading">
          <div className="grammar-loading-char">動</div>
          <div className="grammar-loading-text">Loading Jidoshi &amp; Tadoshi pairs from Supabase...</div>
          <div className="grammar-loading-bar">
            <div className="grammar-loading-bar-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verb-pairs-view">
        <div className="vp-header-bar">
          <button type="button" className="vp-back-btn" onClick={handleBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back to N4 Vocab</span>
          </button>
        </div>
        <div className="grammar-error">
          <div className="grammar-error-icon">⚠</div>
          <div className="grammar-error-title">Could not load verb pairs from Supabase</div>
          <div className="grammar-error-detail">{error}</div>
          <button className="kf-action-btn" onClick={refetch} style={{ marginTop: '16px' }}>↻ Retry</button>
        </div>
      </div>
    );
  }

  if (localDeck.length === 0) {
    return (
      <div className="verb-pairs-view">
        <div className="vp-header-bar">
          <button type="button" className="vp-back-btn" onClick={handleBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back to N4 Vocab</span>
          </button>
        </div>
        <div className="grammar-error">
          <div className="grammar-error-icon">📖</div>
          <div className="grammar-error-title">No Verb Pairs Found</div>
          <div className="grammar-error-detail">The verb_pairs table in Supabase does not contain any records yet.</div>
          <button className="kf-action-btn" onClick={refetch} style={{ marginTop: '16px' }}>↻ Refresh from Supabase</button>
        </div>
      </div>
    );
  }

  const currentCard = localDeck[currentIndex];
  const nextCardData = localDeck[currentIndex + 1];

  const pct = localDeck.length > 1 ? currentIndex / (localDeck.length - 1) : 1;
  const circ = 2 * Math.PI * 22;
  const ringOffset = circ * (1 - pct);

  return (
    <div className="verb-pairs-view">
      {/* Top Banner & Return to Vocab */}
      <div className="vp-header-bar">
        <button
          type="button"
          className="vp-back-btn"
          onClick={handleBack}
          title="Return to N4 standard vocabulary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Back to N4 Vocab</span>
        </button>

        <div className="vp-badge-pill">
          <span>{allPairs.length} Verb Pairs · 自動詞 &amp; 他動詞</span>
        </div>
      </div>

      <div className="vocab-page-header">
        <h2 className="vocab-page-title">
          自動詞 · 他動詞 <span>Jidoshi &amp; Tadoshi</span>
        </h2>
        <p className="vocab-page-subtitle">
          Intransitive (が) &amp; Transitive (を) Verb Pairs · N4
        </p>
      </div>

      {/* Filter and Mode Toolbar */}
      <div className="vp-controls-panel">
        <div className="vp-filter-row">
          <div className="vp-filter-group">
            <label className="vp-control-label">Filter Lesson:</label>
            <select
              className="vp-lesson-select"
              value={selectedLesson}
              onChange={(e) => {
                setSelectedLesson(e.target.value);
                reset();
              }}
            >
              <option value="all">All Lessons ({initialDeck.length} pairs)</option>
              {lessons.filter(l => l !== 'all').map(lesson => (
                <option key={lesson} value={lesson}>
                  Lesson {lesson}
                </option>
              ))}
            </select>
          </div>

          <div className="vp-mode-group">
            <span className="vp-control-label">Front Prompt:</span>
            <div className="vp-mode-pills">
              <button
                className={`vp-mode-pill ${studyMode === 'contrast' ? 'active' : ''}`}
                onClick={() => setStudyMode('contrast')}
                title="Shows English meaning first, test yourself on both verbs"
              >
                English → Both
              </button>
              <button
                className={`vp-mode-pill ${studyMode === 'jidoshi_first' ? 'active' : ''}`}
                onClick={() => setStudyMode('jidoshi_first')}
                title="Shows Intransitive (じどうし), guess Transitive (たどうし)"
              >
                が じどうし → たどうし
              </button>
              <button
                className={`vp-mode-pill ${studyMode === 'tadoshi_first' ? 'active' : ''}`}
                onClick={() => setStudyMode('tadoshi_first')}
                title="Shows Transitive (たどうし), guess Intransitive (じどうし)"
              >
                を たどうし → じどうし
              </button>
              <button
                className={`vp-mode-pill ${studyMode === 'both_first' ? 'active' : ''}`}
                onClick={() => setStudyMode('both_first')}
                title="Shows both Japanese verbs on front, flip for meanings and examples"
              >
                Full Pair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="stats">
        {localDeck.length} pairs · {correct} correct this session
      </div>

      {sessionComplete ? (
        /* Completion Screen */
        <div className="vocab-complete">
          <div className="vocab-complete-icon">🎉</div>
          <h2 className="vocab-complete-title">Pair Session Complete!</h2>
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
              <span>Mastered! No missed pairs!</span>
            </div>
          )}
          <div className="vocab-complete-actions">
            <button className="kf-action-btn" onClick={reset}>↻ Study Again</button>
            <button className="kf-action-btn" onClick={handleShuffle}>⇄ Shuffle &amp; Retry</button>
          </div>
          {getMissedDeck().length > 0 && (
            <button className="kf-action-btn kf-study-missed-btn" onClick={handleReviewWrong}>
              🔁 Review Missed Pairs ({getMissedDeck().length})
            </button>
          )}
        </div>
      ) : (
        /* Active Study Stack */
        <>
          <div className="card-stack-container vp-stack-container">
            {/* Underneath Card */}
            {nextCardData && (
              <Motion.div
                className="card-wrapper vp-card-wrapper card-underneath"
                style={{
                  scale: nextCardScale,
                  opacity: nextCardOpacity
                }}
              >
                <div className="card-inner">
                  <div className="card-face front vp-card-face">
                    <span className="card-label">じどうし・たどうし Pair</span>
                    <span className="card-lesson">L{nextCardData.lesson}</span>
                    <div className="vp-front-preview">
                      <div className="vp-front-concept">{nextCardData.jidoshi_en}</div>
                      <div className="vp-front-kana-hint">
                        {nextCardData.jidoshi_jp} ⇄ {nextCardData.tadoshi_jp}
                      </div>
                    </div>
                    <span className="tap-hint">tap to reveal</span>
                  </div>
                </div>
              </Motion.div>
            )}

            {/* Active Top Card */}
            <Motion.div
              className="card-wrapper vp-card-wrapper card-top"
              style={{ x, rotate, opacity: cardOpacity }}
              drag={!exitDir ? 'x' : false}
              dragElastic={0.8}
              dragConstraints={{ left: 0, right: 0 }}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onClick={handleCardClick}
            >
              <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
                {/* ── FRONT FACE ── */}
                <div className="card-face front vp-card-face">
                  <Motion.div className="swipe-bg-overlay" style={{ backgroundColor: bgOverlay }} />
                  <Motion.div className="swipe-stamp got" style={{ opacity: gotOpacity }}>
                    ✓ 正解
                  </Motion.div>
                  <Motion.div className="swipe-stamp again" style={{ opacity: againOpacity }}>
                    ✗ 間違い
                  </Motion.div>

                  <span className="card-label">
                    じどうし・たどうし Pair
                  </span>
                  <span className="card-lesson">L{currentCard?.lesson}</span>

                  {/* Mode 1: Contrast / English first */}
                  {studyMode === 'contrast' && (
                    <div className="vp-front-contrast">
                      <div className="vp-concept-en">{currentCard?.example_en || `${currentCard?.jidoshi_en} / ${currentCard?.tadoshi_en}`}</div>
                      <div className="vp-contrast-kana-badge">
                        じどうし (が) ⇄ たどうし (を)
                      </div>

                      <div className="vp-front-slots">
                        <div className="vp-slot jidoshi">
                          <span className="vp-slot-badge jidoshi">が じどうし</span>
                          <span className="vp-slot-meaning">{currentCard?.jidoshi_en}</span>
                          <span className="vp-slot-prompt">???</span>
                        </div>
                        <div className="vp-slot-divider">⇄</div>
                        <div className="vp-slot tadoshi">
                          <span className="vp-slot-badge tadoshi">を たどうし</span>
                          <span className="vp-slot-meaning">{currentCard?.tadoshi_en}</span>
                          <span className="vp-slot-prompt">???</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Jidoshi prompt */}
                  {studyMode === 'jidoshi_first' && (
                    <div className="vp-front-single">
                      <div className="vp-single-banner jidoshi">
                        <span className="vp-badge-tag jidoshi">じどうし · が</span>
                        <span className="vp-single-meaning">{currentCard?.jidoshi_en}</span>
                      </div>

                      <div className="vp-single-verb">
                        <div className="vp-verb-kana-main">{currentCard?.jidoshi_jp}</div>
                      </div>

                      {currentCard?.jidoshi_example && (
                        <div className="vp-single-example">
                          {toKanaExample(currentCard.jidoshi_example, currentCard)}
                        </div>
                      )}

                      <div className="vp-single-question">
                        <span>たいおうする たどうし（を）は？</span>
                        <div className="vp-question-bubble">? たどうし (Transitive) ?</div>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Tadoshi prompt */}
                  {studyMode === 'tadoshi_first' && (
                    <div className="vp-front-single">
                      <div className="vp-single-banner tadoshi">
                        <span className="vp-badge-tag tadoshi">たどうし · を</span>
                        <span className="vp-single-meaning">{currentCard?.tadoshi_en}</span>
                      </div>

                      <div className="vp-single-verb">
                        <div className="vp-verb-kana-main">{currentCard?.tadoshi_jp}</div>
                      </div>

                      {currentCard?.tadoshi_example && (
                        <div className="vp-single-example">
                          {toKanaExample(currentCard.tadoshi_example, currentCard)}
                        </div>
                      )}

                      <div className="vp-single-question">
                        <span>たいおうする じどうし（が）は？</span>
                        <div className="vp-question-bubble">? じどうし (Intransitive) ?</div>
                      </div>
                    </div>
                  )}

                  {/* Mode 4: Both on front */}
                  {studyMode === 'both_first' && (
                    <div className="vp-front-both">
                      <div className="vp-both-grid">
                        <div className="vp-both-box jidoshi">
                          <span className="vp-slot-badge jidoshi">が じどうし</span>
                          <div className="vp-both-kana-main">{currentCard?.jidoshi_jp}</div>
                        </div>

                        <div className="vp-both-divider">⇄</div>

                        <div className="vp-both-box tadoshi">
                          <span className="vp-slot-badge tadoshi">を たどうし</span>
                          <div className="vp-both-kana-main">{currentCard?.tadoshi_jp}</div>
                        </div>
                      </div>
                      <div className="vp-both-prompt">Tap to reveal meanings, examples &amp; particles</div>
                    </div>
                  )}

                  <span className="tap-hint">tap card to reveal pair details</span>
                </div>

                {/* ── BACK FACE ── */}
                <div className="card-face back vp-card-face">
                  <Motion.div className="swipe-bg-overlay" style={{ backgroundColor: bgOverlay }} />
                  <Motion.div className="swipe-stamp got" style={{ opacity: gotOpacity }}>
                    ✓ 正解
                  </Motion.div>
                  <Motion.div className="swipe-stamp again" style={{ opacity: againOpacity }}>
                    ✗ 間違い
                  </Motion.div>

                  <span className="card-label">Pair Breakdown · じどうし・たどうし</span>
                  <span className="card-lesson">L{currentCard?.lesson}</span>

                  <div className="vp-back-container">
                    {/* Two-column side by side comparison */}
                    <div className="vp-back-columns">
                      {/* Jidoshi Column */}
                      <div className="vp-back-col jidoshi">
                        <div className="vp-col-header">
                          <span className="vp-col-badge jidoshi">じどうし · が</span>
                          <button
                            type="button"
                            className={`vp-audio-mini-btn ${playingKey === 'jidoshi' ? 'playing' : ''}`}
                            onClick={(e) => handlePlayAudio(currentCard?.jidoshi_jp, 'jidoshi', e)}
                            title="Listen to Jidoshi verb"
                            aria-label="Play intransitive verb audio"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                          </button>
                        </div>

                        <div className="vp-col-kana-main">
                          {currentCard?.jidoshi_jp}
                        </div>
                        <div className="vp-col-en">{currentCard?.jidoshi_en}</div>

                        {currentCard?.jidoshi_example && (
                          <div className="vp-col-example-box">
                            <span className="vp-example-jp">
                              {toKanaExample(currentCard.jidoshi_example, currentCard)}
                            </span>
                            <button
                              type="button"
                              className={`vp-audio-text-btn ${playingKey === 'jidoshi_ex' ? 'playing' : ''}`}
                              onClick={(e) => handlePlayAudio(toKanaExample(currentCard.jidoshi_example, currentCard), 'jidoshi_ex', e)}
                              title="Listen to example sentence"
                              aria-label="Play example sentence"
                            >
                              🔊
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Tadoshi Column */}
                      <div className="vp-back-col tadoshi">
                        <div className="vp-col-header">
                          <span className="vp-col-badge tadoshi">たどうし · を</span>
                          <button
                            type="button"
                            className={`vp-audio-mini-btn ${playingKey === 'tadoshi' ? 'playing' : ''}`}
                            onClick={(e) => handlePlayAudio(currentCard?.tadoshi_jp, 'tadoshi', e)}
                            title="Listen to Tadoshi verb"
                            aria-label="Play transitive verb audio"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                          </button>
                        </div>

                        <div className="vp-col-kana-main">
                          {currentCard?.tadoshi_jp}
                        </div>
                        <div className="vp-col-en">{currentCard?.tadoshi_en}</div>

                        {currentCard?.tadoshi_example && (
                          <div className="vp-col-example-box">
                            <span className="vp-example-jp">
                              {toKanaExample(currentCard.tadoshi_example, currentCard)}
                            </span>
                            <button
                              type="button"
                              className={`vp-audio-text-btn ${playingKey === 'tadoshi_ex' ? 'playing' : ''}`}
                              onClick={(e) => handlePlayAudio(toKanaExample(currentCard.tadoshi_example, currentCard), 'tadoshi_ex', e)}
                              title="Listen to example sentence"
                              aria-label="Play example sentence"
                            >
                              🔊
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Example English Translation & Note */}
                    {currentCard?.example_en && (
                      <div className="vp-back-example-en">
                        💬 {currentCard.example_en}
                      </div>
                    )}

                    {currentCard?.note && (
                      <div className="vp-back-note">
                        💡 {cleanNoteToKana(currentCard.note)}
                      </div>
                    )}
                  </div>

                  <span className="tap-hint">tap to flip back</span>
                </div>
              </div>
            </Motion.div>
          </div>

          {/* Navigation Controls */}
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

          {/* Scoring Row */}
          <div className="score-row" style={{ display: isFlipped ? 'flex' : 'none' }}>
            <button className="score-btn wrong" onClick={() => triggerSwipe(-1)}>
              ✗ Again
            </button>
            <button className="score-btn right" onClick={() => triggerSwipe(1)}>
              ✓ Got it
            </button>
          </div>

          {/* Bottom Bar */}
          <div className="bottom-row">
            <button className="shuffle-btn" onClick={handleShuffle}>
              ⇄ Shuffle deck
            </button>
            <button className="reset-btn" onClick={reset}>
              ↻ Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
