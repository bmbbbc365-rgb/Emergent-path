import React from "react";

/**
 * Elegant key SVG — recurring visual symbol of the participant's journey.
 * Props:
 *  - size: pixel size (default 32)
 *  - glow: adds a warm glow filter (used on the unlock door)
 *  - tone: "gold" | "warm" | "muted"
 */
export default function JourneyKey({ size = 32, glow = false, tone = "gold", className = "" }) {
  const stops = {
    gold: ["#F5D28F", "#D4AF37", "#8E6B1A"],
    warm: ["#F5D0BF", "#B76E79", "#7A3A47"],
    muted: ["#E4CDBF", "#A48B7B", "#5C4839"],
  }[tone] || ["#F5D28F", "#D4AF37", "#8E6B1A"];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Journey key"
    >
      <defs>
        <linearGradient id={`jkg-${tone}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="55%" stopColor={stops[1]} />
          <stop offset="100%" stopColor={stops[2]} />
        </linearGradient>
        {glow && (
          <filter id="jkey-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <g filter={glow ? "url(#jkey-glow)" : undefined}>
        {/* Key bow (ring) */}
        <circle cx="18" cy="32" r="11" stroke={`url(#jkg-${tone})`} strokeWidth="3" fill="none" />
        <circle cx="18" cy="32" r="4.5" stroke={`url(#jkg-${tone})`} strokeWidth="2" fill="none" />
        {/* Shaft */}
        <rect x="27" y="30" width="30" height="4" rx="1.2" fill={`url(#jkg-${tone})`} />
        {/* Teeth */}
        <rect x="46" y="34" width="4" height="7" fill={`url(#jkg-${tone})`} />
        <rect x="53" y="34" width="4" height="5" fill={`url(#jkg-${tone})`} />
      </g>
    </svg>
  );
}
