import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';

export function useFlashcards() {
  const db = useSupabase();
  const [allCards, setAllCards] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [activeLessons, setActiveLessons] = useState(new Set());
  const [deck, setDeck] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load cards from Supabase
  useEffect(() => {
    const loadCards = async () => {
      try {
        setIsLoading(true);
        const { data, error: supabaseError } = await db
          .from('flashcards')
          .select('*')
          .order('lesson', { ascending: true })
          .order('id', { ascending: true });

        if (supabaseError) throw supabaseError;

        const processedCards = data.map(r => ({
          id: r.id,
          jp: r.jp,
          kanji: r.kanji || '',
          en: r.en,
          note: r.note || '',
          lesson: r.lesson
        }));

        setAllCards(processedCards);

        // Derive unique sorted lesson list
        const uniqueLessons = [...new Set(processedCards.map(c => c.lesson))].sort((a, b) => a - b);
        setLessons(uniqueLessons);
        setActiveLessons(new Set(uniqueLessons));
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error loading cards:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCards();
  }, [db]);

  // Build deck based on active lessons
  const buildDeck = useCallback(() => {
    const filteredDeck = allCards.filter(c => activeLessons.has(c.lesson));
    setDeck(filteredDeck);
  }, [allCards, activeLessons]);

  // Rebuild deck when active lessons change
  useEffect(() => {
    buildDeck();
  }, [activeLessons, buildDeck]);

  const setActiveLesson = useCallback((selected) => {
    if (selected === 'all') {
      setActiveLessons(new Set(lessons));
    } else {
      setActiveLessons(new Set([selected]));
    }
  }, [lessons]);

  return {
    allCards,
    lessons,
    activeLessons,
    deck,
    isLoading,
    error,
    setActiveLesson,
    buildDeck
  };
}
