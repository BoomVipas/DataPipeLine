'use client';

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export interface SubCatData {
  name: string;
  value: number;
  group: string;
}

// Color per sub-category
const COLORS: Record<string, string> = {
  indoor:   '#f97316',
  outdoor:  '#fb923c',
  mindful:  '#22c55e',
  recovery: '#4ade80',
  games:    '#3b82f6',
  chill:    '#60a5fa',
  wander:   '#8b5cf6',
  weird:    '#a78bfa',
  bar:      '#ec4899',
  club:     '#f472b6',
};

const GROUP_LABEL: Record<string, string> = {
  fitness:   'Fitness',
  wellness:  'Wellness',
  casual:    'Casual',
  nightlife: 'Nightlife',
};

interface Props {
  data: SubCatData[];
  total: number;
}

export default function SubCategoryChart({ data, total }: Props) {
  const chartData = data.filter(d => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No sub-category data yet
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
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
                fill={COLORS[entry.name] ?? '#9ca3af'}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value} venues`]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Centre label */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
        <p className="text-2xl font-bold text-gray-900">{total}</p>
        <p className="text-xs text-gray-500">venues</p>
      </div>

      {/* Legend grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
        {chartData.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[d.name] ?? '#9ca3af' }}
            />
            <span className="text-xs text-gray-600 capitalize">{d.name}</span>
            <span className="text-xs font-medium text-gray-900 ml-auto">{d.value}</span>
          </div>
        ))}
      </div>

      {/* Group legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
        {Object.entries(GROUP_LABEL).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
