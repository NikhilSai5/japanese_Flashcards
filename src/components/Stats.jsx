export function Stats({ deckLength, correct }) {
  return (
    <div className="text-xs text-muted tracking-widest uppercase mb-6">
      {deckLength} cards · {correct} correct this session
    </div>
  );
}
