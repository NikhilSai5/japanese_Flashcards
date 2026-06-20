import { useState, useCallback, useRef } from 'react';

export function useCardNavigation(deck) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [missedCards, setMissedCards] = useState([]);
  const missedCardsRef = useRef([]);
  // keep a live ref to the current deck so callbacks see latest deck
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const currentIndexRef = useRef(0);

  const nextCard = useCallback(() => {
    const d = deckRef.current;
    setCurrentIndex(prev => {
      if (prev < d.length - 1) {
        currentIndexRef.current = prev + 1;
        return prev + 1;
      }
      // reached end
      setSessionComplete(true);
      return prev;
    });
    setIsFlipped(false);
  }, []);

  const prevCard = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev > 0) {
        currentIndexRef.current = prev - 1;
        return prev - 1;
      }
      return prev;
    });
    setIsFlipped(false);
  }, []);

  const flipCard = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const shuffle = useCallback(() => {
    const newDeck = [...deckRef.current];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setCorrect(0);
    setIncorrect(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setMissedCards([]);
    missedCardsRef.current = [];
    return newDeck;
  }, []);

  const toggleReverse = useCallback(() => {
    setIsReversed(prev => !prev);
    setIsFlipped(false);
  }, []);

  const markCorrect = useCallback(() => {
    setCorrect(prev => prev + 1);
    nextCard();
  }, [nextCard]);

  const markIncorrect = useCallback(() => {
    setIncorrect(prev => prev + 1);
    const card = deckRef.current[currentIndexRef.current];
    if (card && !missedCardsRef.current.find(c => c.id === card.id)) {
      missedCardsRef.current = [...missedCardsRef.current, card];
      setMissedCards([...missedCardsRef.current]);
    }
    nextCard();
  }, [nextCard]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setCorrect(0);
    setIncorrect(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setMissedCards([]);
    missedCardsRef.current = [];
  }, []);

  // Returns the missed deck so ProtectedApp can swap localDeck
  const getMissedDeck = useCallback(() => {
    return missedCardsRef.current;
  }, []);

  return {
    currentIndex,
    correct,
    incorrect,
    isFlipped,
    isReversed,
    sessionComplete,
    missedCards,
    getMissedDeck,
    nextCard,
    prevCard,
    flipCard,
    shuffle,
    toggleReverse,
    markCorrect,
    markIncorrect,
    reset
  };
}
