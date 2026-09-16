# Implementation Plan: Kanji Practice Page with Interactive Stroke Drawing

Based on analysis of the existing codebase, here's a detailed implementation plan:

---

## 1. Dependencies to Add

```bash
npm install hanzi-writer
npm install -D @types/hanzi-writer  # if TypeScript types exist
```

**Rationale:** `hanzi-writer` is the recommended library for stroke-by-stroke drawing, animation, and real-time validation. It works with KanjiVG SVG data.

---

## 2. Data Layer Updates

### A. Enhance `useKanji.js` hook (`src/hooks/useKanji.js`)
Add methods to fetch KanjiVG stroke data. Options:
- **Option 1 (Recommended):** Store KanjiVG SVG paths in Supabase `kanji` table (column: `stroke_svg` or `kanjivg_data`)
- **Option 2:** Fetch from CDN at runtime: `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@main/kanji/{codepoint}.svg`
- **Option 3:** Bundle KanjiVG data as JSON (larger bundle)

```javascript
// Add to useKanji.js return object
const getStrokeData = useCallback(async (character) => {
  // Fetch from Supabase or CDN
}, []);
```

### B. Database Migration (if using Option 1)
Add `stroke_svg` column to `kanji` table and populate with KanjiVG paths.

---

## 3. New Components

### A. `KanjiDrawingCanvas.jsx` (`src/components/KanjiDrawingCanvas.jsx`)
Reusable drawing canvas using `hanzi-writer`:

```jsx
// Props:
// - character: target kanji character
// - strokeData: KanjiVG path data (from Supabase/CDN)
// - onStrokeComplete: callback when user finishes drawing
// - onValidationResult: callback with { isCorrect, errors }
// - showOutline: boolean
// - animateOnError: boolean
// - disabled: boolean

// Features:
// - touch-action: none for mobile
// - Real-time stroke validation (order, direction, shape)
// - Action buttons: Clear, Show Hint, Animate, Undo
// - Visual feedback: correct (green), incorrect (red) stroke highlighting
```

**Key hanzi-writer configuration:**
```javascript
const writer = HanziWriter.create(element, character, {
  width: 280,
  height: 280,
  padding: 20,
  showOutline: true,
  strokeColor: '#1a1208',        // var(--ink)
  radicalColor: '#b8860b',       // var(--gold)
  delayBetweenStrokes: 1000,
  strokeAnimationSpeed: 1.5,
  onStrokeComplete: (strokeData) => { /* validation */ }
});
```

### B. `KanjiReadingFlashcard.jsx` (`src/components/KanjiReadingFlashcard.jsx`)
Identical design to vocabulary flashcards (ProtectedApp/Card.jsx):

```jsx
// Props:
// - kanji: { character, meaning, onyomi, kunyomi, strokes, example_word, ... }
// - isFlipped, onFlip
// - isReversed
// - currentIndex, totalCount
// - onAudioPlay

// Front (isReversed=false): Large Kanji character + stroke count dots
// Back: Meaning, Onyomi (赤 badge), Kunyomi (金 badge), Example word
// Uses exact same CSS classes: .kf-card-wrapper, .kf-card-inner, .kf-card-face, etc.
```

### C. `KanjiDrawingTest.jsx` (`src/components/KanjiDrawingTest.jsx`)
Drawing test mode component:

```jsx
// Props:
// - kanji: current kanji object
// - onCheckAnswer: callback with result
// - onNext: callback
// - score: { correct, incorrect }

// UI:
// - Prompt card: "Draw the kanji for: Sky (そら)"
// - Embedded KanjiDrawingCanvas
// - "Check Answer" button (disabled until strokes drawn)
// - Feedback overlay: success checkmark / error with animate correct strokes
// - Score display
```

---

## 4. New Page: `KanjiPracticePage.jsx` (`src/pages/KanjiPracticePage.jsx`)

```jsx
// Route: /kanji-practice
// State:
// - mode: 'reading' | 'drawing'
// - deck: filtered kanji array (from useKanji)
// - currentIndex, isFlipped, score, missedCards

// Layout:
// - Top: Mode toggle tabs (Reading Flashcards / Drawing Test)
// - Study header (same as .kf-header): back button, title, score
// - Main area: conditional render KanjiReadingFlashcard OR KanjiDrawingTest
// - Navigation: Prev/Next, Progress ring (same as .nav + .progress-ring)
// - Score buttons (when flipped/complete)
// - Bottom controls: Shuffle, Reverse, Reset
```

**Mode 1: Reading Flashcards**
- Reuses exact same flip-card mechanics as `KanjiDashboard` study view
- Keyboard: Space/Enter to flip, Arrow keys to navigate

**Mode 2: Drawing Test**
- Prompt shows English meaning + hiragana reading
- User draws → "Check Answer" → validation → feedback → next
- On error: animate correct stroke order, show outline hint

---

## 5. Routing & Navigation

### A. Update `App.jsx`
```jsx
import KanjiPracticePage from './pages/KanjiPracticePage';

// Add route
<Route path="/kanji-practice" element={<KanjiPracticePage />} />
```

### B. Update `Navbar.jsx`
Add link to new practice page (or add as sub-item under Kanji):
```jsx
<NavLink to="/kanji-practice" className={...}>
  <span className="navbar-link-jp">練習</span>
  <span className="navbar-link-en">Practice</span>
</NavLink>
```

---

## 6. CSS Additions (`src/index.css`)

Add styles for drawing canvas and practice page:

```css
/* Drawing Canvas */
.kanji-canvas-container {
  width: 280px;
  height: 280px;
  margin: 0 auto;
  background: #fff;
  border: 2px solid var(--border);
  border-radius: 4px;
  box-shadow: 4px 6px 0 var(--cream), 4px 6px 0 1px var(--border);
  touch-action: none;
}

.kanji-canvas-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
  flex-wrap: wrap;
}

.canvas-btn {
  background: transparent;
  border: 1.5px solid var(--border);
  color: var(--muted);
  font-family: 'DM Mono', monospace;
  font-size: 0.65rem;
  padding: 6px 12px;
  cursor: pointer;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 2px;
  transition: all 0.15s;
}
.canvas-btn:hover { border-color: var(--ink); color: var(--ink); }
.canvas-btn.primary { background: var(--ink); border-color: var(--ink); color: var(--paper); }

/* Drawing Test Prompt */
.drawing-prompt {
  background: #fff;
  border: 2px solid var(--border);
  border-radius: 6px;
  padding: 24px;
  text-align: center;
  margin-bottom: 20px;
  box-shadow: 4px 6px 0 var(--cream), 4px 6px 0 1px var(--border);
}

.drawing-prompt-meaning {
  font-family: 'DM Serif Display', serif;
  font-size: 1.8rem;
  color: var(--ink);
  margin-bottom: 8px;
}

.drawing-prompt-reading {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 1.4rem;
  color: var(--gold);
}

/* Feedback Overlay */
.drawing-feedback {
  position: fixed;
  inset: 0;
  background: rgba(26, 18, 8, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.drawing-feedback-content {
  background: #fff;
  border: 2px solid var(--border);
  border-radius: 6px;
  padding: 32px;
  max-width: 400px;
  text-align: center;
  box-shadow: 8px 12px 0 var(--cream), 8px 12px 0 2px var(--border);
}
.drawing-feedback.success { border-color: #2e7d32; }
.drawing-feedback.error { border-color: var(--red); }

/* Mode Toggle Tabs */
.mode-tabs {
  display: flex;
  border: 1.5px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 20px;
}
.mode-tab {
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 16px;
  font-family: 'DM Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
}
.mode-tab:first-child { border-right: 1.5px solid var(--border); }
.mode-tab.active { background: var(--ink); color: var(--paper); }
.mode-tab:hover:not(.active) { background: var(--cream); }
```

---

## 7. Integration Details

### A. Prevent Card Flip During Drawing
In `KanjiDrawingCanvas`, add:
```jsx
// Prevent parent card flip handlers
<div onMouseDown={(e) => e.stopPropagation()} 
     onTouchStart={(e) => e.stopPropagation()}>
  <canvas ref={canvasRef} style={{ touchAction: 'none' }} />
</div>
```

### B. Stroke Validation Logic
Using hanzi-writer's built-in quiz mode:
```javascript
writer.quiz({
  onMistake: (strokeData) => { /* show error */ },
  onCorrectStroke: (strokeData) => { /* progress */ },
  onComplete: (summary) => { /* final validation */ }
});

// Or custom validation for drawing test mode
const isCorrect = writer.getStrokeData().every((stroke, i) => 
  validateStroke(stroke, correctStrokes[i])
);
```

---

## 8. File Structure Summary

```
src/
├── components/
│   ├── KanjiDrawingCanvas.jsx      # NEW - Reusable drawing canvas
│   ├── KanjiReadingFlashcard.jsx   # NEW - Reading flashcard (matches vocab)
│   ├── KanjiDrawingTest.jsx        # NEW - Drawing test mode
│   └── ...existing components
├── pages/
│   ├── KanjiPracticePage.jsx       # NEW - Main practice page
│   ├── KanjiDashboard.jsx          # EXISTING - add link to practice
│   └── ...existing pages
├── hooks/
│   ├── useKanji.js                 # ENHANCE - add stroke data fetching
│   └── ...existing hooks
├── index.css                       # ADD - drawing canvas & practice styles
└── App.jsx                         # ADD - /kanji-practice route
```

---

## 9. Implementation Phases

| Phase | Tasks | Est. Effort |
|-------|-------|-------------|
| **1. Setup** | Install hanzi-writer, add stroke data to Supabase/CDN | 1-2 hrs |
| **2. Canvas Component** | Build `KanjiDrawingCanvas` with all controls & validation | 3-4 hrs |
| **3. Flashcard Component** | Build `KanjiReadingFlashcard` matching vocab design | 1-2 hrs |
| **4. Drawing Test** | Build `KanjiDrawingTest` with prompt + feedback | 2-3 hrs |
| **5. Practice Page** | Build `KanjiPracticePage` with mode toggle & navigation | 2-3 hrs |
| **6. Integration** | Add route, navbar link, CSS, keyboard handling | 1-2 hrs |
| **7. Polish** | Mobile testing, edge cases, animations, accessibility | 2-3 hrs |

**Total: ~12-19 hours**

---

## 10. Clarifying Questions

Before implementation, confirm:

1. **Stroke Data Source**: Store KanjiVG SVG paths in Supabase (Option 1), or fetch from CDN at runtime (Option 2)? Option 1 is faster but requires a one-time data migration.

2. **Kanji Scope**: Should the practice page use all N5 kanji, or allow filtering by category/JLPT level like the dashboard?

3. **Drawing Validation Strictness**: Hanzi-writer has configurable strictness. Want default (forgiving) or strict (exact stroke matching)?

4. **Audio for Kanji**: Should the reading flashcards include audio playback (using existing Edge TTS)? The kanji data has `onyomi`/`kunyomi` which could be read.

5. **Session Persistence**: Save drawing test progress to Supabase `study_progress` like vocab cards?