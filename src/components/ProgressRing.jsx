export function ProgressRing({ current, total }) {
  const circumference = 2 * Math.PI * 22;
  const progress = total > 1 ? current / (total - 1) : 1;
  const offset = circumference * (1 - progress);

  return (
    <div className="flex items-center justify-center w-14 h-14 relative">
      <svg
        width="52"
        height="52"
        viewBox="0 0 52 52"
        className="progress-ring-svg"
      >
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          stroke="#ede8dc"
          strokeWidth="3"
        />
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          stroke="#c0392b"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s' }}
        />
      </svg>
      <span className="text-xs text-muted z-10 text-center leading-none">
        <div>{current + 1}</div>
        <div className="text-xs text-border">{total}</div>
      </span>
    </div>
  );
}
