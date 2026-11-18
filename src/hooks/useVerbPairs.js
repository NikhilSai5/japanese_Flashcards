import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

export function useVerbPairs() {
  const [allPairs, setAllPairs] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPairs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: sbError } = await supabase
        .from('verb_pairs')
        .select('*')
        .order('lesson', { ascending: true })
        .order('id', { ascending: true });

      if (sbError) throw sbError;

      setAllPairs(data || []);
    } catch (err) {
      console.error('Error fetching verb_pairs from Supabase:', err);
      setError(err.message || 'Failed to load verb pairs from Supabase database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPairs();
  }, [fetchPairs]);

  // Lessons list derived dynamically from the Supabase data
  const lessons = ['all', ...new Set(allPairs.map(p => p.lesson).filter(Boolean))].sort((a, b) => {
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    return a - b;
  });

  const deck = allPairs.filter(p => {
    if (selectedLesson === 'all') return true;
    return p.lesson === Number(selectedLesson);
  });

  return {
    allPairs,
    deck,
    lessons,
    selectedLesson,
    setSelectedLesson,
    isLoading,
    error,
    refetch: fetchPairs
  };
}
