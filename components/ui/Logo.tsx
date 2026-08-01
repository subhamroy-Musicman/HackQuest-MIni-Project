export function Logo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" className={className}>
      <defs>
        <style>{`
          @keyframes drawPath {
            0% { stroke-dashoffset: 1500; fill-opacity: 0; }
            60% { stroke-dashoffset: 0; fill-opacity: 0; }
            100% { fill-opacity: 1; stroke-dashoffset: 0; }
          }
          @keyframes floatPulse {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
            50% { transform: translateY(-8px) scale(1.1); opacity: 1; }
          }
          @keyframes drawBorder {
            0% { stroke-dashoffset: 1600; }
            100% { stroke-dashoffset: 0; }
          }
          .n-shape {
            stroke: var(--surface-base);
            stroke-width: 6;
            stroke-linejoin: round;
            stroke-dasharray: 1500;
            animation: drawPath 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          .border-glow {
            stroke-dasharray: 1600;
            animation: drawBorder 3s ease-in-out infinite alternate;
          }
          .float-up {
            animation: floatPulse 4s ease-in-out infinite;
            transform-origin: center;
          }
          .float-down {
            animation: floatPulse 5s ease-in-out infinite alternate-reverse;
            transform-origin: center;
          }
        `}</style>
        <linearGradient id="accent-gold" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#DAA520" />     {/* GoldenRod */}
          <stop offset="50%" stopColor="#FFFFFF" />    {/* White */}
          <stop offset="100%" stopColor="#FFD700" />   {/* Gold */}
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background that reacts to light/dark mode css variables (inverted) */}
      <rect width="400" height="400" rx="90" className="fill-[var(--content-primary)] transition-colors duration-300" />
      <rect className="border-glow" width="396" height="396" x="2" y="2" rx="88" fill="none" stroke="rgba(255, 215, 0, 0.3)" strokeWidth="4" />

      <g transform="translate(105, 100) skewX(-12)" filter="url(#glow)">
        <path className="n-shape fill-[var(--surface-base)] transition-colors duration-300" d="M 20 200 L 60 200 L 130 80 L 130 200 L 170 200 L 170 0 L 130 0 L 60 120 L 60 0 L 20 0 Z" />
      </g>
      
      <polygon className="float-up" points="280,60 290,80 280,100 270,80" fill="#FFFFFF" filter="url(#glow)" />
      <polygon className="float-down" points="120,300 125,310 120,320 115,310" fill="#FFD700" filter="url(#glow)" />
    </svg>
  )
}
