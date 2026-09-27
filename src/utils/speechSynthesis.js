/**
 * Japanese TTS using the Browser Web Speech API (SpeechSynthesisUtterance).
 *
 * When a Japanese voice has a detectable gender (e.g. Microsoft Nanami/Keita),
 * it is listed as-is. When only a neutral voice is available (e.g. Google 日本語),
 * two synthetic variants are created using pitch control:
 *   – Female: higher pitch (1.1)
 *   – Male:   lower pitch  (0.6), slightly slower rate
 */

const STORAGE_KEY = 'tts_voice_id';

// ─── Helpers: voice loading ───────────────────────────────────────────────────

function getVoicesAsync() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }

    let resolved = false;
    const done = (vs) => {
      if (resolved) return;
      resolved = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged);
      resolve(vs);
    };
    const onChanged = () => done(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', onChanged);
    setTimeout(() => done(window.speechSynthesis.getVoices()), 2500);
  });
}

async function getJapaneseVoicesAsync() {
  const all = await getVoicesAsync();
  return all.filter(
    (v) => v.lang === 'ja-JP' || v.lang === 'ja' || v.lang.startsWith('ja-')
  );
}

// ─── Helpers: gender & label ──────────────────────────────────────────────────

const FEMALE_KEYWORDS = ['nanami', 'haruka', 'ayumi', 'kyoko', 'mizuki', 'female', 'woman'];
const MALE_KEYWORDS   = ['keita', 'ichiro', 'takumi', 'otoya', 'male', 'man'];

function inferGender(voice) {
  const h = `${voice.name} ${voice.voiceURI || ''}`.toLowerCase();
  if (FEMALE_KEYWORDS.some((kw) => h.includes(kw))) return 'female';
  if (MALE_KEYWORDS.some((kw) => h.includes(kw)))   return 'male';
  return 'unknown';
}

function shortName(voice) {
  return voice.name
    .replace(/\s+(Online|Offline)\b.*/i, '')
    .replace(/\s*-\s*Japanese.*$/i, '')
    .replace(/^Microsoft\s+/i, '')
    .trim() || voice.name;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * A voice entry that callers work with:
 *  id     – stored in localStorage; used as the selection key
 *  name   – actual SpeechSynthesisVoice.name for lookup
 *  label  – display string
 *  gender – 'female' | 'male'
 *  pitch  – utterance pitch override
 *  rate   – utterance rate override
 */

/**
 * Returns all selectable Japanese voice entries.
 *
 * • If the voice has detectable gender → 1 entry, pitch 1.0
 * • If the voice is gender-neutral     → 2 synthetic entries (Female + Male)
 *
 * Sorted: female first, then male.
 */
export async function getAvailableVoices() {
  const jaVoices = await getJapaneseVoicesAsync();
  const entries = [];

  for (const v of jaVoices) {
    const gender = inferGender(v);
    const sn = shortName(v);

    if (gender === 'female') {
      entries.push({ id: v.name, name: v.name, label: `Female · ${sn}`, gender: 'female', pitch: 1.0, rate: 0.9 });
    } else if (gender === 'male') {
      entries.push({ id: v.name, name: v.name, label: `Male · ${sn}`,   gender: 'male',   pitch: 1.0, rate: 0.85 });
    } else {
      // Neutral voice → create one synthetic variant (Female)
      entries.push({ id: `${v.name}::female`, name: v.name, label: `Female · ${sn}`, gender: 'female', pitch: 1.15, rate: 0.95 });
    }
  }

  // female first, male second
  return entries.sort((a, b) => (a.gender === 'female' ? -1 : 1) - (b.gender === 'female' ? -1 : 1));
}

/**
 * Play Japanese text with the given voice entry (from getAvailableVoices).
 * @param {string} text
 * @param {{ name: string, pitch: number, rate: number } | null} voiceEntry
 * @param {number} speedMultiplier
 */
export async function playJapaneseAudio(text, voiceEntry = null, speedMultiplier = 1.0) {
  if (!text?.trim()) { console.warn('[TTS] No text'); return; }
  if (!('speechSynthesis' in window)) { console.error('[TTS] Not supported'); return; }

  window.speechSynthesis.cancel();

  // Resolve the actual SpeechSynthesisVoice object
  let voice = null;
  if (voiceEntry?.name) {
    const jaVoices = await getJapaneseVoicesAsync();
    voice = jaVoices.find((v) => v.name === voiceEntry.name) ?? jaVoices[0] ?? null;
  }

  return new Promise((resolve, reject) => {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang   = 'ja-JP';
    utt.pitch  = voiceEntry?.pitch  ?? 1.0;
    
    const baseRate = voiceEntry?.rate ?? 0.9;
    utt.rate   = baseRate * speedMultiplier;
    
    utt.volume = 1.0;
    if (voice) utt.voice = voice;

    utt.onend  = () => resolve();
    utt.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') resolve();
      else reject(new Error(`TTS error: ${e.error}`));
    };

    window.speechSynthesis.speak(utt);
  });
}

/** Read stored voice id. Returns null if none. */
export function getStoredVoiceId() {
  try { return localStorage.getItem(STORAGE_KEY) || null; }
  catch { return null; }
}

/** Persist selected voice id. */
export function storeVoiceId(id) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}