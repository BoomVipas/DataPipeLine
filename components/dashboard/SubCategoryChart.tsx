'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

export interface SubCatData {
  name: string;
  value: number;
  group: string;
}

// Color per sub-category (vibrant, readable on dark backgrounds)
const COLORS: Record<string, string> = {
  indoor:   '#FB923C',
  outdoor:  '#FDBA74',
  mindful:  '#34D399',
  recovery: '#6EE7B7',
  games:    '#60A5FA',
  chill:    '#93C5FD',
  wander:   '#A78BFA',
  weird:    '#C4B5FD',
  bar:      '#F472B6',
  club:     '#F9A8D4',
};

interface Props {
  data: SubCatData[];
  total: number;
}

export default function SubCategoryChart({ data, total }: Props) {
  const chartData = data.filter(d => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-ghost">
        No sub-category data yet
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="85%"
            startAngle={180}
            endAngle={0}
            innerRadius="55%"
            outerRadius="90%"
            dataKey="value"
            paddingAngle={2}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.name] ?? '#524D61'}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1B1B23',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#EBE7DF',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value} venues`]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Centre label — sits inside the arc */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <p className="text-2xl font-bold font-display text-ink">{total}</p>
        <p className="text-xs text-ghost">venues</p>
      </div>
      </div>

      {/* Legend grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
        {chartData.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[d.name] ?? '#524D61' }}
            />
            <span className="text-xs text-dim capitalize">{d.name}</span>
            <span className="text-xs font-medium text-ink ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
