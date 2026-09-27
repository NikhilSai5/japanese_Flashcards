import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAvailableVoices, getStoredVoice, storeVoice, playJapaneseAudio } from '../utils/speechSynthesis';

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const [selectedVoice, setSelectedVoice] = useState(() => getStoredVoice());
  const [voices, setVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);

  // Load real browser voices on mount
  useEffect(() => {
    let cancelled = false;
    getAvailableVoices().then((list) => {
      if (cancelled) return;
      setVoices(list);
      setVoicesLoading(false);

      // Auto-select first voice if nothing stored or stored voice no longer exists
      const stored = getStoredVoice();
      const stillValid = stored && list.some((v) => v.name === stored);
      if (!stillValid && list.length > 0) {
        setSelectedVoice(list[0].name);
        storeVoice(list[0].name);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const selectVoice = useCallback((voiceName) => {
    setSelectedVoice(voiceName);
    storeVoice(voiceName);
  }, []);

  /** Play text using the currently selected voice. */
  const speak = useCallback(async (text) => {
    await playJapaneseAudio(text, selectedVoice);
  }, [selectedVoice]);

  return (
    <VoiceContext.Provider value={{ selectedVoice, voices, voicesLoading, selectVoice, speak }}>
      {children}
    </VoiceContext.Provider>
  );
}

/** Hook to consume the voice context. */
export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used inside <VoiceProvider>');
  return ctx;
}
