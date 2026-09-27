import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAvailableVoices, getStoredVoiceId, storeVoiceId, playJapaneseAudio } from '../utils/speechSynthesis';

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const [selectedVoice, setSelectedVoice] = useState(() => getStoredVoiceId());
  const [speed, setSpeed] = useState(() => {
    const stored = localStorage.getItem('tts_speed');
    return stored ? parseFloat(stored) : 1.0;
  });
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
      const stored = getStoredVoiceId();
      const stillValid = stored && list.some((v) => v.id === stored);
      if (!stillValid && list.length > 0) {
        setSelectedVoice(list[0].id);
        storeVoiceId(list[0].id);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const selectVoice = useCallback((voiceId) => {
    setSelectedVoice(voiceId);
    storeVoiceId(voiceId);
  }, []);

  const changeSpeed = useCallback((newSpeed) => {
    setSpeed(newSpeed);
    localStorage.setItem('tts_speed', newSpeed.toString());
  }, []);

  /** Play text using the currently selected voice. */
  const speak = useCallback(async (text) => {
    const voiceEntry = voices.find(v => v.id === selectedVoice);
    await playJapaneseAudio(text, voiceEntry, speed);
  }, [selectedVoice, voices, speed]);

  return (
    <VoiceContext.Provider value={{ selectedVoice, voices, voicesLoading, selectVoice, speed, changeSpeed, speak }}>
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
