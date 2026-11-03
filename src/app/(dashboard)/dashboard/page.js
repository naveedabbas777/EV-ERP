'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Dot, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { PerformanceTable } from '@/components/dashboard/performance-table';

const defaultSummary = {
  metrics: [],
  sales: [],
  transactions: [],
  regions: [],
};

export default function DashboardPage() {
  const [summary, setSummary] = useState(defaultSummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then((response) => response.json())
      .then((payload) => setSummary(payload?.data || defaultSummary))
      .catch(() => setSummary(defaultSummary))
      .finally(() => setLoading(false));
  }, []);

  const metrics = summary.metrics || [];
  const sales = summary.sales || [];
  const transactions = summary.transactions || [];
  const regions = summary.regions || [];
  const operationalHealth = summary.operationalHealth || {};

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a,#111827_45%,#0f766e)] p-5 text-white shadow-[0_22px_48px_rgba(15,23,42,0.18)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Business overview</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">EV dealer performance</h2>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-emerald-100 backdrop-blur-sm">
            <Dot className="h-4 w-4 fill-current text-emerald-300" />
            Live operations
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading dashboard metrics...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item) => (
              <StatCard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.7fr_0.95fr]">
            <Card className="overflow-hidden border-slate-200/80 bg-white/90 p-0">
              <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Revenue performance · {summary.currentYear || new Date().getFullYear()}</CardTitle>
                  <Badge intent="success">Live revenue</Badge>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <SalesChart data={sales} />
              </div>
            </Card>

            <Card className="p-6">
              <CardHeader>
                <CardTitle>Recent transactions</CardTitle>
                <button className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  View all <ArrowRight className="h-4 w-4" />
                </button>
              </CardHeader>
              <div className="space-y-4">
                {transactions.length ? transactions.map((item) => (
                  <div key={`${item.customer}-${item.time}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.type}</p>
                      <p className="text-sm text-slate-500">{item.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{item.amount}</p>
                      <p className="text-xs text-slate-500">{item.time}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No recent transactions found.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-0">
              <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Regional performance</CardTitle>
                  <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    {regions.length ? `${regions.length} regions` : 'No regional sales'}
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <PerformanceTable rows={regions} />
              </div>
            </Card>

            <Card className="p-6">
              <CardHeader>
                <CardTitle>Operational health</CardTitle>
              </CardHeader>
              <div className="space-y-5">
                {[
                  { label: 'Approval completion', value: `${operationalHealth.approvalRate || 0}%`, progress: operationalHealth.approvalRate || 0, tone: 'success' },
                  { label: 'Payment collection', value: `${operationalHealth.collectionRate || 0}%`, progress: operationalHealth.collectionRate || 0, tone: 'info' },
                  { label: 'Pending approvals', value: String(Math.max(0, (operationalHealth.approvalCount || 0) - (operationalHealth.approvedCount || 0))), tone: 'warning' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                      <span>{item.label}</span>
                      <span className="font-medium text-slate-900">{item.value}</span>
                    </div>
                    {item.progress !== undefined && (
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            item.tone === 'success' ? 'bg-emerald-500' : item.tone === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
