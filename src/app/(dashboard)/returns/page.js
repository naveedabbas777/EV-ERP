'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const buildColumns = (updateReturn, canApprove) => [
  { key: 'id', label: 'Return ID' },
  { key: 'dealer', label: 'Dealer' },
  { key: 'showroom', label: 'Showroom' },
  { key: 'product', label: 'Product' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'reason', label: 'Reason' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge intent={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>{row.status}</Badge>,
  },
  {
    key: 'action',
    label: 'Action',
    render: (row) => canApprove && row.status === 'pending' ? (
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => updateReturn(row.id, 'approved')}>Approve</Button>
        <Button variant="outline" onClick={() => updateReturn(row.id, 'rejected')}>Reject</Button>
      </div>
    ) : <span className="text-sm text-slate-400">—</span>,
  },
];

export default function ReturnsPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [dealers, setDealers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [scope, setScope] = useState({ dealerId: '', showroomId: '' });
  const [canCreate, setCanCreate] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ dealerId: '', showroomId: '', productId: '', quantity: '1', defectReason: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadReturns = async () => {
    try {
      const response = await fetch('/api/returns');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load return requests.');
      setRows(payload?.data || []);
      setSummary(payload?.summary || { total: 0, pending: 0, approved: 0, rejected: 0 });
      setDealers(payload?.options?.dealers || []);
      setProducts(payload?.options?.products || []);
      setShowrooms(payload?.options?.showrooms || []);
      setScope(payload?.scope || { dealerId: '', showroomId: '' });
      setForm((current) => ({
        ...current,
        dealerId: payload?.scope?.dealerId || current.dealerId || payload?.options?.dealers?.[0]?.id || '',
        showroomId: payload?.scope?.showroomId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('showroomId') : null) || current.showroomId || '',
      }));
      setCanCreate(Boolean(payload?.capabilities?.canCreate));
      setCanApprove(Boolean(payload?.capabilities?.canApprove));
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Unable to load return requests.');
    } finally {
      setLoading(false);
    }
  };

  const updateReturn = async (id, status) => {
    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, comments: status === 'approved' ? 'Approved after quality inspection.' : 'Rejected after inspection review.' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to update return request.');
      await loadReturns();
    } catch (error) {
      setLoadError(error.message || 'Unable to update return request.');
    }
  };

  useEffect(() => {
    void (async () => {
      await loadReturns();
    })();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Unable to create return request' }));
        throw new Error(payload.error || 'Unable to create return request');
      }

      setForm({ dealerId: scope.dealerId || '', showroomId: scope.showroomId || '', productId: '', quantity: '1', defectReason: '' });
      await loadReturns();
    } catch (error) {
      setFormError(error.message || 'Unable to create return request.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = buildColumns(updateReturn, canApprove);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-900 p-6 text-white shadow-[0_30px_60px_rgba(15,23,42,0.15)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-200">After-sales</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Return requests</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-rose-100">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Defect review queue
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Total</div><div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.total}</div></Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Pending</div><div className="mt-3 text-3xl font-semibold tracking-tight text-amber-700">{summary.pending}</div></Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Approved</div><div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">{summary.approved}</div></Card>
        <Card className="border-red-100 bg-gradient-to-br from-red-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Rejected</div><div className="mt-3 text-3xl font-semibold tracking-tight text-red-700">{summary.rejected}</div></Card>
      </div>

      {canCreate ? <Card className="p-6">
        <CardHeader>
          <CardTitle>Create return request</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
          {!scope.dealerId ? <select
            required
            value={form.dealerId}
            onChange={(event) => setForm((current) => ({ ...current, dealerId: event.target.value, showroomId: '' }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          >
            <option value="">Select dealer</option>
            {dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name} · {dealer.registrationNumber}</option>)}
          </select> : null}
          <select
            required={Boolean(scope.dealerId)}
            value={form.showroomId}
            onChange={(event) => setForm((current) => ({ ...current, showroomId: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          >
            <option value="">Select showroom (optional for company requests)</option>
            {showrooms.filter((showroom) => !form.dealerId || showroom.dealerId === form.dealerId).map((showroom) => <option key={showroom.id} value={showroom.id}>{showroom.name} · {showroom.code}</option>)}
          </select>
          <select
            required
            value={form.productId}
            onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          >
            <option value="">Select product</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
          </select>
          <Input
            type="number"
            min="1"
            step="1"
            required
            placeholder="Quantity"
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              required
              maxLength={255}
              placeholder="Reason"
              value={form.defectReason}
              onChange={(event) => setForm((current) => ({ ...current, defectReason: event.target.value }))}
            />
            <Button type="submit" disabled={submitting || !dealers.length || !products.length}>{submitting ? 'Saving...' : 'Add'}</Button>
          </div>
          {formError ? <p role="alert" className="text-sm text-red-600 md:col-span-4">{formError}</p> : null}
        </form>
      </Card> : null}

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Defective product reviews</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading returns...</p>
          ) : loadError ? (
            <div className="flex items-center justify-between gap-4 text-sm text-red-600">
              <p role="alert">{loadError}</p>
              <Button variant="outline" onClick={() => { setLoading(true); void loadReturns(); }}>Retry</Button>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No return requests found." />
          )}
        </div>
      </Card>
    </div>
  );
}
