'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

export default function OrdersPage() {
  const [rows, setRows] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, totalValue: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [scope, setScope] = useState({ dealerId: '', showroomId: '' });
  const [form, setForm] = useState({ dealerId: '', showroomId: '', productId: '', quantity: '1', unitPrice: '' });

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load orders.');
      setRows(payload?.data || []);
      setSummary(payload?.summary || { total: 0, pending: 0, approved: 0, rejected: 0, totalValue: 0 });
      setDealers(payload?.options?.dealers || []);
      setShowrooms(payload?.options?.showrooms || []);
      setScope(payload?.scope || { dealerId: '', showroomId: '' });
      setForm((current) => ({
        ...current,
        dealerId: payload?.scope?.dealerId || current.dealerId || payload?.options?.dealers?.[0]?.id || '',
        showroomId: payload?.scope?.showroomId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('showroomId') : null) || current.showroomId || '',
      }));
      setProducts(payload?.options?.products || []);
      setCanCreate(Boolean(payload?.capabilities?.canCreate));
      setCanApprove(Boolean(payload?.capabilities?.canApprove));
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Unable to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrder = async (id, status) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, comments: status === 'approved' ? 'Approved by ERP operations.' : 'Rejected by ERP operations.' }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || 'Unable to update order status.');
      }
      await loadOrders();
    } catch (error) {
      setLoadError(error.message || 'Unable to update order status.');
    }
  };

  useEffect(() => {
    void (async () => {
      await loadOrders();
    })();
  }, [loadOrders]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerId: form.dealerId,
          showroomId: form.showroomId,
          productId: form.productId,
          quantity: Number(form.quantity || 0),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Unable to create order' }));
        throw new Error(payload.error || 'Unable to create order');
      }

      setForm({ dealerId: scope.dealerId || '', showroomId: scope.showroomId || '', productId: '', quantity: '1', unitPrice: '' });
      await loadOrders();
    } catch (error) {
      setFormError(error.message || 'Unable to create order.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'orderNumber', label: 'Order No.' },
    { key: 'dealerId', label: 'Dealer' },
    { key: 'showroomName', label: 'Showroom' },
    { key: 'product', label: 'Product' },
    { key: 'quantity', label: 'Qty' },
    { key: 'total', label: 'Total', render: (row) => `PKR ${Number(row.total || 0).toLocaleString()}` },
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
          <Button variant="primary" onClick={() => updateOrder(row.id, 'approved')}>Approve</Button>
          <Button variant="outline" onClick={() => updateOrder(row.id, 'rejected')}>Reject</Button>
        </div>
      ) : <span className="text-sm text-slate-400">—</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-violet-900 p-6 text-white shadow-[0_30px_60px_rgba(15,23,42,0.15)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-200">Order flow</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Order management</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-violet-100">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            Approval workflow
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Total orders</div><div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.total}</div></Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Pending</div><div className="mt-3 text-3xl font-semibold tracking-tight text-amber-700">{summary.pending}</div></Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Approved</div><div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">{summary.approved}</div></Card>
        <Card className="border-red-100 bg-gradient-to-br from-red-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Rejected</div><div className="mt-3 text-3xl font-semibold tracking-tight text-red-700">{summary.rejected}</div></Card>
        <Card className="border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Order value</div><div className="mt-3 text-2xl font-semibold tracking-tight text-sky-700">PKR {Number(summary.totalValue || 0).toLocaleString()}</div></Card>
      </div>

      {canCreate ? <Card className="p-6">
        <CardHeader>
          <CardTitle>Create order</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit}>
          {!scope.dealerId ? <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Dealer</label>
            <select required value={form.dealerId} onChange={(event) => setForm((current) => ({ ...current, dealerId: event.target.value, showroomId: '' }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="">Select dealer</option>
              {dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name} · {dealer.registrationNumber}</option>)}
            </select>
          </div> : null}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Showroom</label>
            <select required={Boolean(scope.dealerId)} value={form.showroomId} onChange={(event) => setForm((current) => ({ ...current, showroomId: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="">Select showroom (optional for company orders)</option>
              {showrooms.filter((showroom) => !form.dealerId || showroom.dealerId === form.dealerId).map((showroom) => <option key={showroom.id} value={showroom.id}>{showroom.name} · {showroom.code}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Product</label>
            <select required value={form.productId} onChange={(event) => {
              const product = products.find((item) => item.id === event.target.value);
              setForm((current) => ({ ...current, productId: event.target.value, unitPrice: product ? String(product.dealerPrice) : '' }));
            }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="">Select product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Quantity</label>
            <Input type="number" min="1" step="1" placeholder="Quantity" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Unit price</label>
            <div className="flex gap-2">
              <Input type="number" value={form.unitPrice} readOnly aria-label="Dealer unit price (PKR)" />
              <Button type="submit" disabled={submitting || !dealers.length || !products.length}>{submitting ? 'Saving...' : 'Submit'}</Button>
            </div>
          </div>
          {formError ? <p role="alert" className="text-sm text-red-600 md:col-span-2 xl:col-span-4">{formError}</p> : null}
        </form>
      </Card> : null}

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Order pipeline</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading orders...</p>
          ) : loadError ? (
            <div className="flex items-center justify-between gap-4 text-sm text-red-600">
              <p role="alert">{loadError}</p>
              <Button variant="outline" onClick={() => { setLoading(true); void loadOrders(); }}>Retry</Button>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No order records found." />
          )}
        </div>
      </Card>
    </div>
  );
}
