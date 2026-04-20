import { useState, useCallback } from 'react';

export function useCardNavigation(deck) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReversed, setIsReversed] = useState(false);

  const nextCard = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < deck.length - 1) {
        return prev + 1;
      }
      return prev;
    });
    setIsFlipped(false);
  }, [deck.length]);

  const prevCard = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev > 0) {
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
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    setCurrentIndex(0);
    setCorrect(0);
    setIsFlipped(false);
    return newDeck;
  }, [deck]);

  const toggleReverse = useCallback(() => {
    setIsReversed(prev => !prev);
    setIsFlipped(false);
  }, []);

  const markCorrect = useCallback(() => {
    setCorrect(prev => prev + 1);
    nextCard();
  }, [nextCard]);

  const markIncorrect = useCallback(() => {
    nextCard();
  }, [nextCard]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setCorrect(0);
    setIsFlipped(false);
  }, []);

  return {
    currentIndex,
    correct,
    isFlipped,
    isReversed,
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
