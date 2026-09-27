/**
 * Japanese TTS using the Browser Web Speech API (SpeechSynthesisUtterance).
 *
 * Voice selection is based on the actual voices available in the user's
 * browser/OS — no external services or network calls.
 */

const STORAGE_KEY = 'tts_voice_name';

// ─── Internal helpers ────────────────────────────────────────────────────────

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
    setTimeout(() => done(window.speechSynthesis.getVoices()), 2500);
  });
}

/** Filter to only Japanese voices. */
async function getJapaneseVoicesAsync() {
  const all = await getVoicesAsync();
  return all.filter(
    (v) => v.lang === 'ja-JP' || v.lang === 'ja' || v.lang.startsWith('ja-')
  );
}

/**
 * Find the best voice to use given a stored voice name.
 * Looks up by exact name first, then falls back to the first Japanese voice.
 */
async function resolveVoice(voiceName) {
  const jaVoices = await getJapaneseVoicesAsync();

  if (jaVoices.length === 0) {
    console.warn('[TTS] No Japanese voices found.');
    return null;
  }

  if (voiceName) {
    const exact = jaVoices.find((v) => v.name === voiceName);
    if (exact) {
      console.log(`[TTS] Using voice: "${exact.name}"`);
      return exact;
    }
    console.warn(`[TTS] Stored voice "${voiceName}" not found — falling back.`);
  }

  // Default: prefer a voice with a Japanese-sounding name, else first available
  const fallback = jaVoices[0];
  console.log(`[TTS] Falling back to: "${fallback.name}"`);
  return fallback;
}

// ─── Gender detection ─────────────────────────────────────────────────────────

/**
 * Keywords used to classify a voice as female or male.
 * Checked case-insensitively against both name and voiceURI.
 */
const FEMALE_KEYWORDS = ['nanami', 'haruka', 'ayumi', 'kyoko', 'mizuki', 'female', 'woman', 'girl'];
const MALE_KEYWORDS   = ['keita', 'ichiro', 'takumi', 'otoya', 'male', 'man', 'guy'];

/**
 * Infer the gender of a SpeechSynthesisVoice from its name/URI.
 * Returns 'female' | 'male' | 'unknown'.
 */
function inferGender(voice) {
  const haystack = `${voice.name} ${voice.voiceURI || ''}`.toLowerCase();
  if (FEMALE_KEYWORDS.some((kw) => haystack.includes(kw))) return 'female';
  if (MALE_KEYWORDS.some((kw) => haystack.includes(kw)))   return 'male';
  return 'unknown';
}

/**
 * Build a human-friendly display label for a voice.
 * Examples:
 *   "Microsoft Nanami Online (Natural) - Japanese (Japan)" → "Female · Nanami"
 *   "Microsoft Keita Online (Natural) - Japanese (Japan)"  → "Male · Keita"
 *   "Google 日本語"                                          → "Japanese · Google 日本語"
 */
function buildLabel(voice, gender) {
  // Extract just the first segment of the voice name (stop at ' Online', ' Offline', ' -', or parenthesis)
  const shortName = voice.name
    .replace(/\s+(Online|Offline)\b.*/i, '')   // strip " Online..." / " Offline..."
    .replace(/\s*-\s*Japanese.*$/i, '')         // strip " - Japanese (Japan)"
    .replace(/^Microsoft\s+/i, '')              // strip leading "Microsoft "
    .replace(/^Google\s*/i, 'Google ')          // keep "Google " prefix for Google voices
    .trim();

  if (gender === 'female') return `Female · ${shortName}`;
  if (gender === 'male')   return `Male · ${shortName}`;
  return shortName || voice.name;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all Japanese voices available in the browser, with gender labels.
 * Each item: { name, lang, label, gender, local }
 * Sorted: female first, male second, unknowns last.
 */
export async function getAvailableVoices() {
  const jaVoices = await getJapaneseVoicesAsync();

  const ORDER = { female: 0, male: 1, unknown: 2 };

  return jaVoices
    .map((v) => {
      const gender = inferGender(v);
      return {
        name:   v.name,
        lang:   v.lang,
        label:  buildLabel(v, gender),
        gender,
        local:  v.localService,
      };
    })
    .sort((a, b) => ORDER[a.gender] - ORDER[b.gender]);
}

/**
 * Play Japanese text using the stored voice (or the best available fallback).
 * @param {string} text - The Japanese text to speak.
 * @param {string|null} voiceName - The exact voice.name to use (from getAvailableVoices).
 */
export async function playJapaneseAudio(text, voiceName = null) {
  if (!text || !text.trim()) {
    console.warn('[TTS] No text provided');
    return;
  }

  if (!('speechSynthesis' in window)) {
    console.error('[TTS] SpeechSynthesis not supported in this browser');
    return;
  }

  // Cancel any ongoing speech before starting a new utterance
  window.speechSynthesis.cancel();

  const voice = await resolveVoice(voiceName ?? getStoredVoice());

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
        resolve(); // not a real error — user triggered another action
      } else {
        reject(new Error(`SpeechSynthesis error: ${e.error}`));
      }
    };

    window.speechSynthesis.speak(utterance);
  });
}

/** Read the stored voice name from localStorage. Returns null if none stored. */
export function getStoredVoice() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch (err) {
    console.warn('[TTS] Failed to read voice from localStorage:', err);
    return null;
  }
}

/** Persist the selected voice name to localStorage. */
export function storeVoice(voiceName) {
  try {
    if (voiceName) {
      localStorage.setItem(STORAGE_KEY, voiceName);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[TTS] Failed to store voice in localStorage:', err);
  }
}