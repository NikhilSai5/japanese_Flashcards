import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export function useKanji() {
  const [kanjiList, setKanjiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('N5');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchKanji();
  }, [selectedLevel]);

  const fetchKanji = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('kanji')
        .select('*')
        .order('id', { ascending: true });

      if (selectedLevel) {
        query = query.eq('level', selectedLevel);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setKanjiList(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching kanji:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Categorize kanji based on meaning/context
  const categorizeKanji = (kanji) => {
    const char = kanji.character;
    const meaning = kanji.meaning.toLowerCase();

    if ('一二三四五六七八九十百千万'.includes(char)) return 'Numbers';
    if ('年月日時分半今週毎前後午朝昼夜'.includes(char)) return 'Time';
    if ('人私何男女子父母友先生'.includes(char)) return 'People';
    if ('国学校山川海空店駅道'.includes(char)) return 'Places';
    if ('上下中外右左東西南北'.includes(char)) return 'Direction';
    if ('火水木金土花雨天気'.includes(char)) return 'Nature';
    if ('目耳口手足'.includes(char)) return 'Body';
    if ('大小高安新古長多少白黒赤青'.includes(char)) return 'Adjectives';
    if ('食飲見聞読書話来行帰出入買休起寝立待言思'.includes(char)) return 'Verbs';
    if ('車電本語字名家会社銀円'.includes(char)) return 'Objects';
    return 'Other';
  };

  const categories = ['all', ...new Set(kanjiList.map(categorizeKanji))];

  const filteredKanji = kanjiList.filter((kanji) => {
    const matchesSearch =
      !searchQuery ||
      kanji.character.includes(searchQuery) ||
      kanji.meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kanji.onyomi.includes(searchQuery) ||
      kanji.kunyomi.includes(searchQuery);

    const matchesCategory =
      selectedCategory === 'all' ||
      categorizeKanji(kanji) === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return {
    kanjiList: filteredKanji,
    allKanji: kanjiList,
    isLoading,
    error,
    selectedLevel,
    setSelectedLevel,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    categorizeKanji,
  };
}
