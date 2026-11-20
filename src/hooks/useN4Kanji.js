import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabase';

export function useN4Kanji() {
  const [readingList, setReadingList] = useState([]);
  const [vocabList, setVocabList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active sub-tab / mode: 'reading' | 'vocab'
  const [activeMode, setActiveMode] = useState('reading');
  const [activeLessons, setActiveLessons] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch kanji_reading filtered by N4
      const { data: readingData, error: readingError } = await supabase
        .from('kanji_reading')
        .select('*')
        .ilike('jlpt_level', '%n4%')
        .order('lesson', { ascending: true, nullsFirst: false })
        .order('kanji_number', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true });

      if (readingError) throw readingError;

      // Fetch kanji_vocab filtered by N4
      const { data: vocabData, error: vocabError } = await supabase
        .from('kanji_vocab')
        .select('*')
        .ilike('jlpt_level', '%n4%')
        .order('lesson', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true });

      if (vocabError) throw vocabError;

      setReadingList(readingData || []);
      setVocabList(vocabData || []);
    } catch (err) {
      console.error('Error fetching N4 kanji data from Supabase:', err);
      setError(err.message || 'Failed to load N4 Kanji data from Supabase');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived current raw list based on active mode
  const currentRawList = useMemo(() => {
    return activeMode === 'reading' ? readingList : vocabList;
  }, [activeMode, readingList, vocabList]);

  // Extract unique sorted lesson numbers (e.g. [1, 2, ..., 20])
  const lessons = useMemo(() => {
    return [...new Set(currentRawList.map((item) => Number(item.lesson)).filter(Boolean))].sort((a, b) => a - b);
  }, [currentRawList]);

  // Initialize or maintain valid active lessons when lessons change
  useEffect(() => {
    if (lessons.length > 0) {
      setActiveLessons((prev) => {
        if (prev.size === 0) {
          return new Set(lessons);
        }
        const valid = new Set([...prev].filter((l) => lessons.includes(l)));
        return valid.size > 0 ? valid : new Set(lessons);
      });
    }
  }, [lessons]);

  const toggleActiveLesson = useCallback((lesson) => {
    const num = Number(lesson);
    setActiveLessons((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next.size === 0 ? new Set([num]) : next;
    });
  }, []);

  const selectAllLessons = useCallback(() => {
    setActiveLessons(new Set(lessons));
  }, [lessons]);

  const resetToLesson1 = useCallback(() => {
    if (lessons.length > 0) {
      setActiveLessons(new Set([lessons[0]]));
    } else {
      setActiveLessons(new Set([1]));
    }
  }, [lessons]);

  const setActiveLesson = useCallback((selected) => {
    if (selected === 'all') {
      setActiveLessons(new Set(lessons));
    } else {
      setActiveLessons(new Set([Number(selected)]));
    }
  }, [lessons]);

  // Filter current deck based on activeLessons and searchQuery
  const filteredDeck = useMemo(() => {
    return currentRawList.filter((item) => {
      const itemLesson = Number(item.lesson);
      const matchesLesson =
        activeLessons.size === 0 ||
        activeLessons.size === lessons.length ||
        activeLessons.has(itemLesson);

      if (!matchesLesson) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();

      if (activeMode === 'reading') {
        return (
          (item.kanji && item.kanji.includes(q)) ||
          (item.meaning_en && item.meaning_en.toLowerCase().includes(q)) ||
          (item.onyomi && item.onyomi.includes(q)) ||
          (item.kunyomi && item.kunyomi.includes(q))
        );
      } else {
        return (
          (item.word_kanji && item.word_kanji.includes(q)) ||
          (item.reading_hiragana && item.reading_hiragana.includes(q)) ||
          (item.meaning_en && item.meaning_en.toLowerCase().includes(q)) ||
          (item.kanji && item.kanji.includes(q))
        );
      }
    });
  }, [currentRawList, activeLessons, lessons.length, searchQuery, activeMode]);

  return {
    readingList,
    vocabList,
    deck: filteredDeck,
    lessons,
    activeLessons,
    setActiveLessons,
    toggleActiveLesson,
    selectAllLessons,
    resetToLesson1,
    setActiveLesson,
    activeMode,
    setActiveMode,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refetch: fetchData,
  };
}
