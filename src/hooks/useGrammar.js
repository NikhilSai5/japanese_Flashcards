import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export function useGrammar() {
  const [grammarList, setGrammarList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchGrammar();
  }, []);

  const fetchGrammar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('grammar')
        .select('*')
        .order('lesson', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setGrammarList(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching grammar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique lessons
  const lessons = ['all', ...new Set(grammarList.map((g) => g.lesson))].sort((a, b) => {
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    return a - b;
  });

  // Get unique categories
  const categories = ['all', ...new Set(grammarList.map((g) => g.category).filter(Boolean))];

  // Filter
  const filteredGrammar = grammarList.filter((item) => {
    const matchesLesson =
      selectedLesson === 'all' || item.lesson === Number(selectedLesson);

    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.pattern.toLowerCase().includes(q) ||
      item.explanation.toLowerCase().includes(q) ||
      item.example_jp.toLowerCase().includes(q) ||
      item.example_en.toLowerCase().includes(q);

    return matchesLesson && matchesCategory && matchesSearch;
  });

  // Group by lesson
  const groupedByLesson = filteredGrammar.reduce((acc, item) => {
    const key = item.lesson;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return {
    grammarList: filteredGrammar,
    allGrammar: grammarList,
    groupedByLesson,
    isLoading,
    error,
    selectedLesson,
    setSelectedLesson,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    lessons,
    categories,
  };
}
