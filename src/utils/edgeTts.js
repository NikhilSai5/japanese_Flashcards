/**
 * Japanese TTS using the Web Speech API (SpeechSynthesis).
 *
 * On Windows with Microsoft Edge/Chrome, this automatically uses
 * Microsoft Neural voices (Nanami, Keita) if installed.
 * Falls back to any available Japanese voice on other platforms.
 */

const VOICE_PREFS = {
  'ja-JP-NanamiNeural': ['Nanami', 'Haruka', 'Ayumi'],   // female
  'ja-JP-KeitaNeural':  ['Keita', 'Ichiro', 'Takumi'],   // male
};

/** Cache the resolved SpeechSynthesisVoice objects after first load. */
let _voiceCache = null;

function loadVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    // Chrome loads voices asynchronously
    const onChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onChanged);
    // Safety timeout — resolve with whatever is available after 1 s
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
}

async function resolveVoice(voiceId) {
  if (!_voiceCache) {
    _voiceCache = await loadVoices();
  }
  const jaVoices = _voiceCache.filter((v) => v.lang.startsWith('ja'));
  if (jaVoices.length === 0) return null;

  const preferredNames = VOICE_PREFS[voiceId] ?? VOICE_PREFS['ja-JP-NanamiNeural'];

  for (const name of preferredNames) {
    const match = jaVoices.find((v) => v.name.includes(name));
    if (match) return match;
  }
  // Fall back to first Japanese voice
  return jaVoices[0];
}

export async function playJapaneseAudio(text, voiceId = 'ja-JP-NanamiNeural') {
  if (!text || !text.trim()) {
    console.warn('No text provided for TTS');
    return;
  }

  if (!('speechSynthesis' in window)) {
    console.error('SpeechSynthesis is not supported in this browser');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const voice = await resolveVoice(voiceId);

  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;   // Slightly slower — easier to follow
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') {
        resolve(); // Not really an error
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
    console.warn('Failed to read TTS voice from localStorage:', err);
  }
  return 'ja-JP-NanamiNeural';
}

export function storeVoice(voice) {
  try {
    localStorage.setItem('tts_voice', voice);
  } catch (err) {
    console.warn('Failed to store TTS voice in localStorage:', err);
  }
}