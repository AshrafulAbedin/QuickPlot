/** Decorative plotted curves behind the hero with animated drifting motion. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Ambient warm glow orbs */}
      <div className="animate-ambient-glow absolute -left-20 -top-20 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="animate-ambient-glow absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-amber-600/10 blur-[130px]" style={{ animationDelay: '4s' }} />
      <div className="absolute left-1/3 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-amber-400/[0.04] blur-[100px]" />

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
          className="animate-wave-1"
          d="M0 460 C 100 300, 200 620, 300 460 S 500 300, 600 460 S 800 620, 900 460 S 1100 300, 1200 460"
          fill="none"
          stroke="#F3DCA6"
          strokeOpacity="0.22"
          strokeWidth="2.5"
        />
        <path
          className="animate-wave-2"
          d="M0 520 C 150 520, 250 240, 400 300 S 650 560, 800 380 S 1050 200, 1200 340"
          fill="none"
          stroke="#4A9EE0"
          strokeOpacity="0.18"
          strokeWidth="2.5"
        />
        <rect width="1200" height="800" fill="url(#fade)" />
      </svg>
    </div>
  );
}
