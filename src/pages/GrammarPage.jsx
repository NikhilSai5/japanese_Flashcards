import { useState } from 'react';
import { useGrammar } from '../hooks/useGrammar';

export default function GrammarPage() {
  const {
    grammarList,
    allGrammar,
    groupedByLesson,
    isLoading,
    error,
    selectedLesson,
    setSelectedLesson,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    lessons,
    categories,
  } = useGrammar();

  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grammar-loading">
        <div className="grammar-loading-char">文</div>
        <div className="grammar-loading-text">Loading Grammar...</div>
        <div className="grammar-loading-bar">
          <div className="grammar-loading-bar-fill"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="grammar-error">
        <div className="grammar-error-icon">⚠</div>
        <div className="grammar-error-title">Could not load Grammar</div>
        <div className="grammar-error-detail">{error}</div>
      </div>
    );
  }

  const lessonCount = new Set(allGrammar.map((g) => g.lesson)).size;

  return (
    <div className="grammar-page" id="grammar-page">
      {/* Hero Stats */}
      <div className="grammar-hero">
        <div className="grammar-hero-stat">
          <span className="grammar-hero-number">{allGrammar.length}</span>
          <span className="grammar-hero-label">Grammar Points</span>
        </div>
        <div className="grammar-hero-stat">
          <span className="grammar-hero-number">{lessonCount}</span>
          <span className="grammar-hero-label">Lessons</span>
        </div>
        <div className="grammar-hero-stat">
          <span className="grammar-hero-number">{categories.length - 1}</span>
          <span className="grammar-hero-label">Categories</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="grammar-toolbar">
        <div className="grammar-search-wrapper">
          <span className="grammar-search-icon">🔍</span>
          <input
            type="text"
            className="grammar-search"
            placeholder="Search pattern, explanation, example..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="grammar-search-input"
          />
          {searchQuery && (
            <button
              className="grammar-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Lesson dropdown */}
        <select
          className="grammar-lesson-select"
          value={selectedLesson}
          onChange={(e) => setSelectedLesson(e.target.value)}
          id="grammar-lesson-select"
        >
          <option value="all">All Lessons</option>
          {lessons.filter((l) => l !== 'all').map((l) => (
            <option key={l} value={l}>Lesson {l}</option>
          ))}
        </select>
      </div>

      {/* Category Pills */}
      <div className="grammar-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`grammar-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? 'All' : cat}
            <span className="grammar-cat-count">
              {cat === 'all'
                ? grammarList.length
                : grammarList.filter((g) => g.category === cat).length}
            </span>
          </button>
        ))}
      </div>

      {/* Results info */}
      <div className="grammar-results-info">
        Showing {grammarList.length} of {allGrammar.length} grammar points
      </div>

      {/* Grammar Cards grouped by lesson */}
      {Object.keys(groupedByLesson)
        .sort((a, b) => Number(a) - Number(b))
        .map((lesson) => (
          <div key={lesson} className="grammar-lesson-group">
            <div className="grammar-lesson-header">
              <span className="grammar-lesson-number">第{lesson}課</span>
              <span className="grammar-lesson-label">Lesson {lesson}</span>
              <span className="grammar-lesson-count">
                {groupedByLesson[lesson].length} points
              </span>
            </div>

            <div className="grammar-cards">
              {groupedByLesson[lesson].map((item) => (
                <div
                  key={item.id}
                  className={`grammar-card ${expandedId === item.id ? 'expanded' : ''}`}
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="grammar-card-header">
                    <div className="grammar-card-pattern">{item.pattern}</div>
                    <span className="grammar-card-tag">{item.category}</span>
                  </div>

                  <div className="grammar-card-explanation">
                    {item.explanation}
                  </div>

                  {expandedId === item.id && (
                    <div className="grammar-card-example">
                      <div className="grammar-example-label">Example</div>
                      <div className="grammar-example-jp">{item.example_jp}</div>
                      <div className="grammar-example-en">{item.example_en}</div>
                    </div>
                  )}

                  <div className="grammar-card-expand-hint">
                    {expandedId === item.id ? '▲ less' : '▼ example'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      {grammarList.length === 0 && !isLoading && (
        <div className="grammar-empty">
          <div className="grammar-empty-icon">空</div>
          <div className="grammar-empty-text">No grammar points found matching your search</div>
        </div>
      )}
    </div>
  );
}
