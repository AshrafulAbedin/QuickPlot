/** Decorative plotted curves behind the hero. Purely visual. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 1200 800"
      >
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="1" />
          </pattern>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c1a17" stopOpacity="0" />
            <stop offset="100%" stopColor="#1c1a17" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#grid)" />
        <path
          d="M0 460 C 100 300, 200 620, 300 460 S 500 300, 600 460 S 800 620, 900 460 S 1100 300, 1200 460"
          fill="none"
          stroke="#F3DCA6"
          strokeOpacity="0.16"
          strokeWidth="2.5"
        />
        <path
          d="M0 520 C 150 520, 250 240, 400 300 S 650 560, 800 380 S 1050 200, 1200 340"
          fill="none"
          stroke="#4A9EE0"
          strokeOpacity="0.12"
          strokeWidth="2.5"
        />
        <rect width="1200" height="800" fill="url(#fade)" />
      </svg>
    </div>
  );
}
