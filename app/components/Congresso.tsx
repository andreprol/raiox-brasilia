export function CongressoIlustracao({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 220"
      className={className}
      role="img"
      aria-label="Silhueta do Congresso Nacional"
      fill="none"
    >
      <line x1="0" y1="176" x2="640" y2="176" stroke="currentColor" strokeWidth="1" opacity="0.35" />

      <rect x="252" y="26" width="34" height="150" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <rect x="354" y="26" width="34" height="150" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <line x1="252" y1="52" x2="286" y2="52" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="252" y1="78" x2="286" y2="78" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="252" y1="104" x2="286" y2="104" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="252" y1="130" x2="286" y2="130" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="354" y1="52" x2="388" y2="52" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="354" y1="78" x2="388" y2="78" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="354" y1="104" x2="388" y2="104" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="354" y1="130" x2="388" y2="130" stroke="currentColor" strokeWidth="1" opacity="0.5" />

      <rect x="60" y="140" width="150" height="36" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <rect x="430" y="140" width="150" height="36" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />

      <path
        d="M 140 140 A 65 46 0 0 1 270 140"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity="0.95"
      />
      <path
        d="M 370 140 A 65 40 0 0 0 500 140"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity="0.95"
      />

      <line x1="0" y1="176" x2="0" y2="176" stroke="currentColor" />
    </svg>
  );
}
