'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function SalesChart({ data }) {
  return (
    <div className="h-80 w-full rounded-[20px] bg-slate-950/95 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.52} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
            labelStyle={{ color: '#f8fafc' }}
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12 }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#34d399" fill="url(#salesFill)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
