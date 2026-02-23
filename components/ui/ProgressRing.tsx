'use client';

// ============================================
// ProgressRing - Circular progress indicator
// ============================================
// When progress > 100 the base ring fills completely and a second
// ring draws on the exact same track showing the overflow amount.

interface ProgressRingProps {
  progress: number;   // 0-100+  (values >100 render an overflow ring on top)
  size?: number;       // px
  strokeWidth?: number;
  color?: string;      // Tailwind stroke color class
  overflowColor?: string;
  bgColor?: string;
  label?: string;
  value?: string;
  sublabel?: string;
}

export default function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = 'stroke-accent-emerald',
  overflowColor,
  bgColor = 'stroke-white/[0.04]',
  label,
  value,
  sublabel,
}: ProgressRingProps) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const hasOverflow = progress > 100;
  const basePct = Math.min(progress, 100);
  const baseOffset = circumference * (1 - basePct / 100);

  const overflowPct = hasOverflow ? Math.min(progress - 100, 100) : 0;
  const overflowOffset = circumference * (1 - overflowPct / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
        style={{ overflow: 'visible' }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={bgColor}
        />
        {/* Base progress (caps at full circle) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={baseOffset}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000 ease-out`}
        />
        {/* Overflow — exact same track, same width, different color */}
        {hasOverflow && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={overflowOffset}
            strokeLinecap="round"
            className={`${overflowColor || color} transition-all duration-1000 ease-out`}
          />
        )}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {value && <span className="text-lg font-bold text-text-primary">{value}</span>}
        {label && <span className="text-[10px] font-medium text-text-muted">{label}</span>}
        {sublabel && <span className="text-[9px] text-text-muted">{sublabel}</span>}
      </div>
    </div>
  );
}
