import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

export function useN4Kanji() {
  const [readingList, setReadingList] = useState([]);
  const [vocabList, setVocabList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active sub-tab / mode: 'reading' | 'vocab'
  const [activeMode, setActiveMode] = useState('reading');
  const [selectedLesson, setSelectedLesson] = useState('all');
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
  const currentRawList = activeMode === 'reading' ? readingList : vocabList;

  // Extract unique sorted lessons for the current mode
  const lessons = ['all', ...new Set(currentRawList.map((item) => item.lesson).filter(Boolean))].sort((a, b) => {
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    return Number(a) - Number(b);
  });

  // Filter current deck based on selectedLesson and searchQuery
  const filteredDeck = currentRawList.filter((item) => {
    const matchesLesson =
      selectedLesson === 'all' || String(item.lesson) === String(selectedLesson);

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

  return {
    readingList,
    vocabList,
    deck: filteredDeck,
    lessons,
    activeMode,
    setActiveMode,
    selectedLesson,
    setSelectedLesson,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refetch: fetchData,
  };
}
