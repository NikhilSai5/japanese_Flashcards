export function LessonControls({ lessons, activeLessons, onSelectLesson }) {
  return (
    <div className="flex gap-2 flex-wrap justify-center mb-5 max-w-2xl w-full mx-auto">
      <button
        onClick={() => onSelectLesson('all')}
        className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border border-solid rounded transition-all ${
          activeLessons.has('all') || activeLessons.size === lessons.length
            ? 'bg-ink border-ink text-paper'
            : 'border-border text-muted hover:bg-ink hover:border-ink hover:text-paper'
        }`}
      >
        All
      </button>
      {lessons.map(lesson => (
        <button
          key={lesson}
          onClick={() => onSelectLesson(lesson)}
          className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border border-solid rounded transition-all ${
            activeLessons.has(lesson)
              ? 'bg-ink border-ink text-paper'
              : 'border-border text-muted hover:bg-ink hover:border-ink hover:text-paper'
          }`}
        >
          Lesson {lesson}
        </button>
      ))}
    </div>
  );
}
