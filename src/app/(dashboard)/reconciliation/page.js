'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';

const defaultSummary = {
  total: 0,
  matched: 0,
  awaiting: 0,
  flagged: 0,
  totalVariance: 0,
};

export default function ReconciliationPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [loading, setLoading] = useState(true);

  const loadReconciliation = async () => {
    try {
      const response = await fetch('/api/reconciliation');
      const payload = await response.json();
      setRows(payload?.data || []);
      setSummary(payload?.summary || defaultSummary);
    } catch {
      setRows([]);
      setSummary(defaultSummary);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, action) => {
    await fetch('/api/reconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    await loadReconciliation();
  };

  useEffect(() => {
    void loadReconciliation();
  }, []);

  const columns = [
    { key: 'paymentNumber', label: 'Payment' },
    { key: 'dealer', label: 'Dealer' },
    { key: 'invoice', label: 'Invoice / Reference' },
    { key: 'expectedAmount', label: 'Expected', render: (row) => `₹${Number(row.expectedAmount || 0).toLocaleString()}` },
    { key: 'receivedAmount', label: 'Received', render: (row) => `₹${Number(row.receivedAmount || 0).toLocaleString()}` },
    { key: 'variance', label: 'Variance', render: (row) => `₹${Number(row.variance || 0).toLocaleString()}` },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge intent={row.status === 'Matched' ? 'success' : row.status === 'Awaiting receipt' ? 'warning' : 'info'}>{row.status}</Badge>,
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => updateStatus(row.id, 'match')}>Match</Button>
          <Button variant="outline" onClick={() => updateStatus(row.id, 'flag')}>Flag</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-sky-900 to-slate-800 p-6 text-white shadow-[0_30px_60px_rgba(15,23,42,0.15)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-200">Finance operations</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Payment reconciliation</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-sky-100">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Variance review active
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Reconciled</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.matched}</p>
        </Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Awaiting receipt</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.awaiting}</p>
        </Card>
        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Flagged</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.flagged}</p>
        </Card>
        <Card className="border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Variance</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-sky-700">₹{Math.abs(Number(summary.totalVariance || 0)).toLocaleString()}</p>
        </Card>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Finance reconciliation queue</CardTitle>
        </CardHeader>

        {loading ? (
          <p className="text-sm text-slate-500">Loading reconciliation queue...</p>
        ) : (
          <DataTable columns={columns} rows={rows} emptyMessage="No reconciliation records found." />
        )}
      </Card>
    </div>
  );
}
