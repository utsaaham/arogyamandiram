'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface MetricChartProps {
  data: DataPoint[];
  color?: string;
  gradientId?: string;
  unit?: string;
  tooltipUnit?: string;
  height?: number;
  targetValue?: number;
  targetLabel?: string;
  formatX?: (val: string) => string;
  formatY?: (val: number) => string;
}

const defaultFormatX = (d: string) => {
  const parts = d.split('-');
  return `${parts[1]}/${parts[2]}`;
};

export default function MetricChart({
  data,
  color = '#8b5cf6',
  gradientId = 'chartGradient',
  unit = '',
  tooltipUnit = unit,
  height = 220,
  targetValue,
  targetLabel,
  formatX = defaultFormatX,
  formatY,
}: MetricChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-sm text-text-muted">No data to display yet</p>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.15 || 2;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 14, left: 10, bottom: 18 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />

        <XAxis
          dataKey="date"
          tickFormatter={formatX}
          stroke="rgba(255,255,255,0.15)"
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, dy: 8 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
          tickMargin={8}
        />

        <YAxis
          domain={[Math.floor(min - padding), Math.ceil(max + padding)]}
          stroke="rgba(255,255,255,0.15)"
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatY || ((v: number) => `${v}${unit}`)}
          width={62}
          tickMargin={8}
        />

        <Tooltip
          contentStyle={{
            background: 'rgba(15, 15, 24, 0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#f0f0f5',
            backdropFilter: 'blur(12px)',
          }}
          labelFormatter={(label) => {
            const parts = String(label).split('-');
            if (parts.length === 3) {
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              return `${months[parseInt(parts[1])-1]} ${parseInt(parts[2])}, ${parts[0]}`;
            }
            return label;
          }}
          formatter={(value: number) => [`${value.toFixed(1)}${tooltipUnit}`, '']}
          cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
        />

        {targetValue && (
          <ReferenceLine
            y={targetValue}
            stroke={color}
            strokeDasharray="6 4"
            strokeOpacity={0.4}
            label={{
              value: targetLabel || `Target: ${targetValue}${unit}`,
              fill: 'rgba(255,255,255,0.35)',
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />
        )}

        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={data.length <= 14 ? { r: 3, fill: color, strokeWidth: 0 } : false}
          activeDot={{ r: 5, fill: color, stroke: '#0f0f18', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
