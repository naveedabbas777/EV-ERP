'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const columns = [
  { key: 'id', label: 'Invoice' },
  { key: 'dealer', label: 'Dealer' },
  { key: 'showroom', label: 'Showroom' },
  { key: 'product', label: 'Product' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'amount', label: 'Amount', render: (row) => `$${Number(row.amount).toLocaleString()}` },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge intent={row.status === 'approved' || row.status === 'Approved' ? 'success' : row.status === 'pending' || row.status === 'Pending' ? 'warning' : 'danger'}>{row.status}</Badge>,
  },
];

export default function SalesPage() {
  const [rows, setRows] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [scope, setScope] = useState({ dealerId: '', showroomId: '' });
  const [canCreateCompanySale, setCanCreateCompanySale] = useState(false);
  const [summary, setSummary] = useState({ totalSales: 0, approvedSales: 0, pendingSales: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ dealerId: '', showroomId: '', productId: '', quantity: '1', unitPrice: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadSales = async () => {
    try {
      const response = await fetch('/api/sales', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load sales.');
      setRows(payload?.data || []);
      setDealers(payload?.options?.dealers || []);
      setProducts(payload?.options?.products || []);
      setShowrooms(payload?.options?.showrooms || []);
      setScope(payload?.scope || { dealerId: '', showroomId: '' });
      setForm((current) => ({
        ...current,
        dealerId: payload?.scope?.dealerId || current.dealerId || payload?.options?.dealers?.[0]?.id || '',
        showroomId: payload?.scope?.showroomId || current.showroomId || '',
      }));
      setCanCreateCompanySale(Boolean(payload?.capabilities?.canCreateCompanySale));
      setSummary(payload?.summary || { totalSales: 0, approvedSales: 0, pendingSales: 0, totalRevenue: 0 });
      setError('');
    } catch (loadError) {
      setRows([]);
      setDealers([]);
      setProducts([]);
      setSummary({ totalSales: 0, approvedSales: 0, pendingSales: 0, totalRevenue: 0 });
      setError(loadError.message || 'Unable to load sales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadSales();
    })();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Unable to create sales entry' }));
        throw new Error(payload.error || 'Unable to create sales entry');
      }

      setForm({ dealerId: scope.dealerId || '', showroomId: scope.showroomId || '', productId: '', quantity: '1', unitPrice: '' });
      await loadSales();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to create sales entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a,#091f1d_52%,#0f766e)] p-5 text-white shadow-[0_22px_48px_rgba(15,23,42,0.15)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Sales pipeline</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Sales management</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-emerald-100 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live revenue flow
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Total sales</div><div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.totalSales}</div></Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Approved</div><div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">{summary.approvedSales}</div></Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Pending</div><div className="mt-3 text-3xl font-semibold tracking-tight text-amber-700">{summary.pendingSales}</div></Card>
        <Card className="border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Revenue</div><div className="mt-3 text-3xl font-semibold tracking-tight text-sky-700">${Number(summary.totalRevenue || 0).toLocaleString()}</div></Card>
      </div>

      {canCreateCompanySale ? <Card className="p-6">
        <CardHeader>
          <CardTitle>Record sale</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Dealer</label>
            <select required value={form.dealerId} onChange={(event) => setForm((current) => ({ ...current, dealerId: event.target.value, showroomId: '' }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="">Select dealer</option>
              {dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name} · {dealer.registrationNumber}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Destination showroom</label>
            <select value={form.showroomId} onChange={(event) => setForm((current) => ({ ...current, showroomId: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="">Not showroom-specific</option>
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
              <Input type="number" min="0.01" step="0.01" placeholder="Unit price" value={form.unitPrice} onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))} required />
              <Button type="submit" disabled={submitting || !dealers.length || !products.length}>{submitting ? 'Saving...' : 'Add'}</Button>
            </div>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p>}
      </Card> : null}

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Sales entries</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading sales...</p>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No sales found." />
          )}
        </div>
      </Card>
    </div>
  );
}
