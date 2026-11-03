'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const columns = [
  { key: 'invoice', label: 'Invoice' },
  { key: 'dealer', label: 'Dealer' },
  { key: 'showroom', label: 'Showroom' },
  { key: 'amount', label: 'Amount', render: (row) => `PKR ${Number(row.amount).toLocaleString()}` },
  { key: 'due', label: 'Due' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge intent={row.status === 'Paid' ? 'success' : row.status === 'Approved' ? 'info' : 'warning'}>{row.status}</Badge>,
  },
];

const ledgerColumns = [
  { key: 'name', label: 'Account' },
  { key: 'type', label: 'Type' },
  { key: 'balance', label: 'Balance', render: (row) => `PKR ${Number(row.balance || 0).toLocaleString()}` },
];

const reconciliationColumns = [
  { key: 'dealer', label: 'Dealer' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'expectedAmount', label: 'Expected', render: (row) => `PKR ${Number(row.expectedAmount || 0).toLocaleString()}` },
  { key: 'receivedAmount', label: 'Received', render: (row) => `PKR ${Number(row.receivedAmount || 0).toLocaleString()}` },
  { key: 'variance', label: 'Variance', render: (row) => `PKR ${Number(row.variance || 0).toLocaleString()}` },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge intent={row.status === 'Matched' ? 'success' : row.status === 'Awaiting receipt' ? 'warning' : 'info'}>{row.status}</Badge>,
  },
];

export default function FinancePage() {
  const [rows, setRows] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [reconciliationRows, setReconciliationRows] = useState([]);
  const [summary, setSummary] = useState({ totalCollected: 0, pendingReceipts: 0, totalPayments: 0, netCash: 0 });
  const [reconciliationSummary, setReconciliationSummary] = useState({ total: 0, matched: 0, awaiting: 0, flagged: 0, totalVariance: 0 });
  const [dealers, setDealers] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [canRecordPayment, setCanRecordPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ dealerId: '', showroomId: '', amount: '', paymentMethod: 'bank-transfer' });
  const [submitting, setSubmitting] = useState(false);

  const loadFinance = async () => {
    try {
      const [financeResponse, reconciliationResponse] = await Promise.all([
        fetch('/api/finance'),
        fetch('/api/reconciliation'),
      ]);

      const financePayload = await financeResponse.json();
      const reconciliationPayload = await reconciliationResponse.json();
      if (!financeResponse.ok) throw new Error(financePayload?.error || 'Unable to load finance records.');
      if (!reconciliationResponse.ok) throw new Error(reconciliationPayload?.error || 'Unable to load reconciliation records.');

      setRows(financePayload?.data || []);
      setLedger(financePayload?.ledger || []);
      setSummary(financePayload?.summary || { totalCollected: 0, pendingReceipts: 0, totalPayments: 0, netCash: 0 });
      setDealers(financePayload?.options?.dealers || []);
      setShowrooms(financePayload?.options?.showrooms || []);
      setCanRecordPayment(Boolean(financePayload?.capabilities?.canRecordPayment));
      setReconciliationRows(reconciliationPayload?.data || []);
      setReconciliationSummary(reconciliationPayload?.summary || { total: 0, matched: 0, awaiting: 0, flagged: 0, totalVariance: 0 });
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Unable to load finance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadFinance();
    })();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Unable to create payment' }));
        throw new Error(payload.error || 'Unable to create payment');
      }

      setForm({ dealerId: '', showroomId: '', amount: '', paymentMethod: 'bank-transfer' });
      await loadFinance();
    } catch (error) {
      setFormError(error.message || 'Unable to create payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 p-6 text-white shadow-[0_30px_60px_rgba(15,23,42,0.15)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-200">Financial compliance</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Finance management</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-sky-100">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Cashflow monitored
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Collected</div><div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">PKR {Number(summary.totalCollected || 0).toLocaleString()}</div></Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Pending receipts</div><div className="mt-3 text-3xl font-semibold tracking-tight text-amber-700">{summary.pendingReceipts}</div></Card>
        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Payment count</div><div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.totalPayments}</div></Card>
        <Card className="border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Net cash</div><div className="mt-3 text-3xl font-semibold tracking-tight text-sky-700">PKR {Number(summary.netCash || 0).toLocaleString()}</div></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Reconciliations</div><div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{reconciliationSummary.total}</div></Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Matched</div><div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">{reconciliationSummary.matched}</div></Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Awaiting</div><div className="mt-3 text-3xl font-semibold tracking-tight text-amber-700">{reconciliationSummary.awaiting}</div></Card>
        <Card className="border-red-100 bg-gradient-to-br from-red-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Variance</div><div className="mt-3 text-3xl font-semibold tracking-tight text-red-700">PKR {Number(reconciliationSummary.totalVariance || 0).toLocaleString()}</div></Card>
      </div>

      {canRecordPayment ? <Card className="p-6">
        <CardHeader>
          <CardTitle>Record payment</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Dealer</label>
            <select required value={form.dealerId} onChange={(event) => setForm((current) => ({ ...current, dealerId: event.target.value, showroomId: '' }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="">Select dealer</option>
              {dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name} · {dealer.registrationNumber}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Showroom</label>
            <select value={form.showroomId} onChange={(event) => setForm((current) => ({ ...current, showroomId: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="">Not showroom-specific</option>
              {showrooms.filter((showroom) => !form.dealerId || showroom.dealerId === form.dealerId).map((showroom) => <option key={showroom.id} value={showroom.id}>{showroom.name} · {showroom.code}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Amount</label>
            <Input type="number" min="0.01" step="0.01" required placeholder="Amount (PKR)" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Payment method</label>
            <div className="flex gap-2">
              <select required value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                {['bank-transfer', 'cash', 'cheque', 'card', 'mobile-wallet'].map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
              <Button type="submit" disabled={submitting || !dealers.length}>{submitting ? 'Saving...' : 'Add'}</Button>
            </div>
          </div>
          {formError ? <p role="alert" className="text-sm text-red-600 md:col-span-2 xl:col-span-3">{formError}</p> : null}
        </form>
      </Card> : null}

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Dealer payments</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading finance records...</p>
          ) : loadError ? (
            <div className="flex items-center justify-between gap-4 text-sm text-red-600">
              <p role="alert">{loadError}</p>
              <Button variant="outline" onClick={() => { setLoading(true); void loadFinance(); }}>Retry</Button>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No finance records found." />
          )}
        </div>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Reconciliation watchlist</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading reconciliation records...</p>
          ) : (
            <DataTable columns={reconciliationColumns} rows={reconciliationRows} emptyMessage="No reconciliation records found." />
          )}
        </div>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>General ledger</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading ledger...</p>
          ) : (
            <DataTable columns={ledgerColumns} rows={ledger} emptyMessage="No ledger accounts found." />
          )}
        </div>
      </Card>
    </div>
  );
}
