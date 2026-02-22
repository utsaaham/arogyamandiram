'use client';

// ============================================
// ProgressRing - Circular progress indicator
// ============================================

interface ProgressRingProps {
  progress: number;   // 0-100
  size?: number;       // px
  strokeWidth?: number;
  color?: string;      // Tailwind stroke color class
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
  bgColor = 'stroke-white/[0.04]',
  label,
  value,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={bgColor}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000 ease-out`}
        />
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
