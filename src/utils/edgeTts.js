/**
 * Japanese TTS using the Web Speech API (SpeechSynthesis).
 *
 * On Windows with Microsoft Edge/Chrome, this automatically uses
 * Microsoft Neural voices (Nanami, Keita) if installed.
 * Falls back to any available Japanese voice on other platforms.
 */

// Keywords to match for each voice preference (case-insensitive)
const VOICE_PREFS = {
  'ja-JP-NanamiNeural': ['nanami', 'haruka', 'ayumi'],   // female
  'ja-JP-KeitaNeural':  ['keita',  'ichiro', 'takumi'],  // male
};

/** Wait for speechSynthesis voices to be available, then return them. */
function getVoicesAsync() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    let resolved = false;
    const done = (vs) => {
      if (resolved) return;
      resolved = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged);
      resolve(vs);
    };

    const onChanged = () => done(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', onChanged);

    // Hard timeout — some browsers never fire voiceschanged
    setTimeout(() => done(window.speechSynthesis.getVoices()), 2000);
  });
}

/** Pick the best Japanese voice for the given voiceId preference. */
async function resolveVoice(voiceId) {
  // Always fetch fresh — never cache, since users may switch voices
  const all = await getVoicesAsync();

  // All available Japanese voices
  const jaVoices = all.filter((v) =>
    v.lang === 'ja-JP' || v.lang === 'ja' || v.lang.startsWith('ja-')
  );

  if (jaVoices.length === 0) {
    console.warn('[TTS] No Japanese voices found. Available langs:',
      [...new Set(all.map((v) => v.lang))].join(', '));
    return null;
  }

  console.log('[TTS] Available Japanese voices:',
    jaVoices.map((v) => `"${v.name}" (${v.lang})`).join(', '));

  const keywords = VOICE_PREFS[voiceId];

  if (keywords) {
    for (const kw of keywords) {
      const match = jaVoices.find((v) =>
        v.name.toLowerCase().includes(kw) ||
        (v.voiceURI && v.voiceURI.toLowerCase().includes(kw))
      );
      if (match) {
        console.log(`[TTS] Matched voice: "${match.name}" for preference "${voiceId}"`);
        return match;
      }
    }
  }

  // Fallback: if asking for male (index 1) use second voice if available, else first
  const isMale = voiceId === 'ja-JP-KeitaNeural';
  const fallback = (isMale && jaVoices.length > 1) ? jaVoices[1] : jaVoices[0];
  console.log(`[TTS] No keyword match — falling back to: "${fallback.name}"`);
  return fallback;
}

export async function playJapaneseAudio(text, voiceId = 'ja-JP-NanamiNeural') {
  if (!text || !text.trim()) {
    console.warn('[TTS] No text provided');
    return;
  }

  if (!('speechSynthesis' in window)) {
    console.error('[TTS] SpeechSynthesis not supported');
    return;
  }

  // Cancel any ongoing speech before starting new one
  window.speechSynthesis.cancel();

  const voice = await resolveVoice(voiceId);

  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') {
        resolve();
      } else {
        reject(new Error(`Speech synthesis error: ${e.error}`));
      }
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function getAvailableVoices() {
  return [
    { id: 'ja-JP-NanamiNeural', label: 'Female (Nanami)', name: 'Nanami' },
    { id: 'ja-JP-KeitaNeural',  label: 'Male (Keita)',    name: 'Keita'  },
  ];
}

export function getStoredVoice() {
  try {
    const stored = localStorage.getItem('tts_voice');
    if (stored && Object.keys(VOICE_PREFS).includes(stored)) {
      return stored;
    }
  } catch (err) {
    console.warn('[TTS] Failed to read voice from localStorage:', err);
  }
  return 'ja-JP-NanamiNeural';
}

export function storeVoice(voice) {
  try {
    localStorage.setItem('tts_voice', voice);
  } catch (err) {
    console.warn('[TTS] Failed to store voice in localStorage:', err);
  }
}