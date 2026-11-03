'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const accountColumns = [
  { key: 'name', label: 'Account' },
  { key: 'type', label: 'Type' },
  { key: 'balance', label: 'Balance', render: (row) => `$${Number(row.balance || 0).toLocaleString()}` },
];

const expenseColumns = [
  { key: 'title', label: 'Expense' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount', render: (row) => `$${Number(row.amount || 0).toLocaleString()}` },
  { key: 'status', label: 'Status', render: (row) => <Badge intent={row.status === 'approved' ? 'success' : 'warning'}>{row.status}</Badge> },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ totalAccounts: 0, totalBalance: 0, payable: 0, receivable: 0, expenses: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'asset', amount: '150000', entryType: 'debit', note: 'Monthly operating cost' });

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const payload = await response.json();
      setAccounts(payload?.data || []);
      setExpenses(payload?.expenses || []);
      setSummary(payload?.summary || { totalAccounts: 0, totalBalance: 0, payable: 0, receivable: 0, expenses: 0 });
    } catch {
      setAccounts([]);
      setExpenses([]);
      setSummary({ totalAccounts: 0, totalBalance: 0, payable: 0, receivable: 0, expenses: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Unable to post account entry' }));
        throw new Error(payload.error || 'Unable to post account entry');
      }

      setForm({ name: '', type: 'asset', amount: '150000', entryType: 'debit', note: 'Monthly operating cost' });
      await loadAccounts();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to post account entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-900 p-6 text-white shadow-[0_30px_60px_rgba(15,23,42,0.15)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-200">Accounting</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Accounts management</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-amber-100">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Ledger operations
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Accounts</div><div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.totalAccounts}</div></Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Total balance</div><div className="mt-3 text-2xl font-semibold tracking-tight text-emerald-700">${Number(summary.totalBalance || 0).toLocaleString()}</div></Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Receivable</div><div className="mt-3 text-2xl font-semibold tracking-tight text-amber-700">${Number(summary.receivable || 0).toLocaleString()}</div></Card>
        <Card className="border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Payable</div><div className="mt-3 text-2xl font-semibold tracking-tight text-violet-700">${Number(summary.payable || 0).toLocaleString()}</div></Card>
        <Card className="border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Expenses</div><div className="mt-3 text-2xl font-semibold tracking-tight text-sky-700">${Number(summary.expenses || 0).toLocaleString()}</div></Card>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Post account entry</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Account</label>
            <Input placeholder="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Type</label>
            <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-inner shadow-slate-100 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100">
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Entry type</label>
            <select value={form.entryType} onChange={(event) => setForm((current) => ({ ...current, entryType: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-inner shadow-slate-100 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100">
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Amount</label>
            <Input type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Action</label>
            <Button type="submit" disabled={submitting} className="w-full">{submitting ? 'Posting...' : 'Post entry'}</Button>
          </div>
        </form>
        <div className="mt-4">
          <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Narration</label>
          <Input className="mt-2" placeholder="Narration" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
        </div>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>General ledger</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading accounts...</p>
          ) : (
            <DataTable columns={accountColumns} rows={accounts} emptyMessage="No accounts have been created yet." />
          )}
        </div>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading expense records...</p>
          ) : (
            <DataTable columns={expenseColumns} rows={expenses} emptyMessage="No expense records found." />
          )}
        </div>
      </Card>
    </div>
  );
}
