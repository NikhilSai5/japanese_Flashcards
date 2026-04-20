import { useState, useEffect } from 'react';
import { useFlashcards } from '../hooks/useFlashcards';
import { useCardNavigation } from '../hooks/useCardNavigation';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../hooks/useAuth';
import '../index.css';

function ProtectedApp() {
  const db = useSupabase();
  const { authUser, logout } = useAuth();
  const { allCards, lessons, activeLessons, deck, isLoading, error, setActiveLesson } = useFlashcards();
  const {
    currentIndex,
    correct,
    isFlipped,
    isReversed,
    nextCard,
    prevCard,
    flipCard,
    toggleReverse,
    markCorrect,
    markIncorrect
  } = useCardNavigation(deck);
  const [localDeck, setLocalDeck] = useState(deck);

  useEffect(() => {
    setLocalDeck(deck);
  }, [deck]);

  const handleShuffle = () => {
    const newDeck = [...localDeck];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    setLocalDeck(newDeck);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleMarkCard = async (isRight) => {
    const cardId = localDeck[currentIndex]?.id;
    if (cardId) {
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
          <header>
            <div className="header-left">
              <h1>日本語 <span>Flash</span>cards</h1>
              <p>Minna no Nihongo · Lessons 1–12</p>
            </div>
            <div className="header-right">
              <span className="user-name">{authUser?.user_metadata?.username || authUser?.email}</span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </header>

          <div className="controls">
            <button
              className={`lesson-btn ${activeLessons.size === lessons.length ? 'active' : ''}`}
              onClick={() => setActiveLesson('all')}
            >
              All
            </button>
            {lessons.map((lesson) => (
              <button
                key={lesson}
                className={`lesson-btn ${activeLessons.has(lesson) && activeLessons.size === 1 ? 'active' : ''}`}
                onClick={() => setActiveLesson(lesson)}
              >
                Lesson {lesson}
              </button>
            ))}
          </div>

          <div className="stats">
            {localDeck.length} cards · {correct} correct this session
          </div>

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
          </div>
        </>
      )}
    </>
  );
}

export default ProtectedApp;
