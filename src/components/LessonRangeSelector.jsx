import { useState } from 'react';

export function LessonRangeSelector({ lessons, activeLessons, onSelectRange }) {
  const [startLesson, setStartLesson] = useState(lessons[0] || 1);
  const [endLesson, setEndLesson] = useState(lessons[lessons.length - 1] || 1);
  const [showInput, setShowInput] = useState(false);

  const handleApplyRange = () => {
    if (startLesson <= endLesson) {
      onSelectRange(startLesson, endLesson);
      setShowInput(false);
    }
  };

  const minLesson = lessons[0] || 1;
  const maxLesson = lessons[lessons.length - 1] || 1;
  const isRangeActive = activeLessons.size > 1 && activeLessons.size < lessons.length;

  return (
    <div className="lesson-range-container">
      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border border-solid rounded transition-all ${
            isRangeActive
              ? 'bg-ink border-ink text-paper'
              : 'border-border text-muted hover:bg-ink hover:border-ink hover:text-paper'
          }`}
          title="Select a range of lessons"
        >
          Range
        </button>
      ) : (
        <div className="range-input-group">
          <div className="range-input-wrapper">
            <label htmlFor="start-lesson" className="range-label">From:</label>
            <input
              id="start-lesson"
              type="number"
              min={minLesson}
              max={maxLesson}
              value={startLesson}
              onChange={(e) => setStartLesson(Math.max(minLesson, Math.min(maxLesson, parseInt(e.target.value) || minLesson)))}
              className="range-input"
            />
          </div>
          <div className="range-input-wrapper">
            <label htmlFor="end-lesson" className="range-label">To:</label>
            <input
              id="end-lesson"
              type="number"
              min={minLesson}
              max={maxLesson}
              value={endLesson}
              onChange={(e) => setEndLesson(Math.max(minLesson, Math.min(maxLesson, parseInt(e.target.value) || maxLesson)))}
              className="range-input"
            />
          </div>
          <button
            onClick={handleApplyRange}
            className="px-2 py-1 text-xs font-mono uppercase tracking-wider border border-solid rounded bg-ink border-ink text-paper hover:opacity-80 transition-all"
          >
            Apply
          </button>
          <button
            onClick={() => setShowInput(false)}
            className="px-2 py-1 text-xs font-mono uppercase tracking-wider border border-solid rounded border-border text-muted hover:bg-ink hover:border-ink hover:text-paper transition-all"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
