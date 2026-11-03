'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/table';

const columns = [
  { key: 'region', label: 'Region' },
  { key: 'sales', label: 'Sales revenue', render: (row) => Number(row.sales || 0).toLocaleString() },
  { key: 'transactions', label: 'Transactions' },
];

export default function ReportsPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/reports');
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to load reports.');
        setRows(payload?.data || []);
        setSummary(payload?.summary || { totalSales: 0, totalRevenue: 0 });
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#1f2937,#312e81_45%,#0f172a)] p-5 text-white shadow-[0_22px_48px_rgba(79,70,229,0.18)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200">Insights</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Reports and analytics</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-violet-100 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            Performance overview
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Regions with sales</div><div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{rows.length}</div></Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Sales transactions</div><div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">{summary.totalSales}</div></Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Sales revenue</div><div className="mt-3 text-2xl font-semibold tracking-tight text-amber-700">{Number(summary.totalRevenue || 0).toLocaleString()}</div></Card>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Regional performance report</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading reports...</p>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No report data found." />
          )}
        </div>
      </Card>
    </div>
  );
}
