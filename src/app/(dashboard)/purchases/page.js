'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const getIntent = (status = '') => {
  const value = status.toLowerCase();
  if (value === 'approved') return 'success';
  if (value === 'pending') return 'warning';
  if (value === 'rejected') return 'danger';
  return 'info';
};

export default function PurchasesPage() {
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, spend: 0 });
  const [canCreate, setCanCreate] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [form, setForm] = useState({
    requisitionNo: '',
    vendorId: '',
    productId: '',
    quantity: '1',
  });
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(null);

  const loadData = async () => {
    try {
      const purchaseResponse = await fetch('/api/purchases');
      const purchasePayload = await purchaseResponse.json();
      if (!purchaseResponse.ok) throw new Error(purchasePayload?.error || 'Unable to load purchasing records.');

      setRows(purchasePayload?.data || []);
      setSummary(purchasePayload?.summary || { total: 0, pending: 0, approved: 0, rejected: 0, spend: 0 });
      setVendors(purchasePayload?.options?.vendors || []);
      setProducts(purchasePayload?.options?.products || []);
      setCanCreate(Boolean(purchasePayload?.capabilities?.canCreate));
      setCanApprove(Boolean(purchasePayload?.capabilities?.canApprove));
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Unable to load purchasing records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadData();
    })();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisitionNo: form.requisitionNo,
          vendorId: form.vendorId,
          items: [{ productId: form.productId, quantity: Number(form.quantity) }],
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to create purchase requisition');
      }

      setForm({ requisitionNo: '', vendorId: '', productId: '', quantity: '1' });
      await loadData();
    } catch (error) {
      setFormError(error.message || 'Unable to create purchase requisition.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async (approvalId, status) => {
    if (!approvalId) {
      setActionError('No approval record is available for this requisition.');
      return;
    }

    setApproving(approvalId);
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: approvalId, status, comments: `Procurement ${status} by operations team.` }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to update requisition approval');
      }

      setActionError('');
      await loadData();
    } catch (error) {
      setActionError(error.message || 'Unable to update requisition approval');
    } finally {
      setApproving(null);
    }
  };

  const columns = [
    { key: 'requisitionNo', label: 'Requisition' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'product', label: 'Product' },
    { key: 'quantity', label: 'Qty' },
    { key: 'total', label: 'Total', render: (row) => `PKR ${Number(row.total || 0).toLocaleString()}` },
    {
      key: 'approvalStatus',
      label: 'Approval',
      render: (row) => <Badge intent={getIntent(row.approvalStatus || row.status)}>{row.approvalStatus || row.status}</Badge>,
    },
    {
      key: 'actions',
      label: 'Action',
      render: (row) => canApprove && row.approvalStatus === 'pending' ? (
        <div className="flex gap-2">
          <Button variant="secondary" className="px-2.5 py-1.5 text-xs" disabled={approving === row.approvalId} onClick={() => handleApproval(row.approvalId, 'approved')}>
            {approving === row.approvalId ? '...' : 'Approve'}
          </Button>
          <Button variant="outline" className="px-2.5 py-1.5 text-xs" disabled={approving === row.approvalId} onClick={() => handleApproval(row.approvalId, 'rejected')}>
            Reject
          </Button>
        </div>
      ) : <span className="text-sm text-slate-400">—</span>,
    },
  ];

  const selectedProduct = products.find((product) => product.id === form.productId);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-[0_30px_60px_rgba(15,23,42,0.15)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-200">Procurement governance</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Purchasing and vendor management</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-emerald-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Approval workflow active
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Requisitions</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.total}</div>
        </Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Pending</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-amber-700">{summary.pending}</div>
        </Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Approved</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">{summary.approved}</div>
        </Card>
        <Card className="border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Procurement spend</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-sky-700">PKR {Number(summary.spend || 0).toLocaleString()}</div>
        </Card>
      </div>

      {canCreate ? <Card className="p-6">
        <CardHeader>
          <CardTitle>Create purchase requisition</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6" onSubmit={handleSubmit}>
          <Input
            placeholder="Requisition No"
            value={form.requisitionNo}
            onChange={(event) => setForm((current) => ({ ...current, requisitionNo: event.target.value }))}
          />
          <select
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-0 transition focus:border-slate-400"
            value={form.vendorId}
            onChange={(event) => setForm((current) => ({ ...current, vendorId: event.target.value }))}
          >
            <option value="">Select vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          <select
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-0 transition focus:border-slate-400"
            value={form.productId}
            onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
          >
            <option value="">Select product</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
          </select>
          <Input
            type="number"
            min="1"
            step="1"
            required
            placeholder="Qty"
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
          />
          <div className="flex gap-2">
            <Input type="number" value={selectedProduct?.purchasePrice || ''} readOnly aria-label="Catalog purchase price (PKR)" />
            <Button type="submit" disabled={submitting || !vendors.length || !products.length}>{submitting ? 'Saving...' : 'Add'}</Button>
          </div>
          {formError ? <p role="alert" className="text-sm text-red-600 md:col-span-2 xl:col-span-6">{formError}</p> : null}
        </form>
      </Card> : null}

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Procurement approvals</CardTitle>
        </CardHeader>
        {actionError ? <p role="alert" className="mb-3 text-sm text-red-600">{actionError}</p> : null}
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading procurement pipeline...</p>
          ) : loadError ? (
            <div className="flex items-center justify-between gap-4 text-sm text-red-600">
              <p role="alert">{loadError}</p>
              <Button variant="outline" onClick={() => { setLoading(true); void loadData(); }}>Retry</Button>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No purchase requisitions found." />
          )}
        </div>
      </Card>
    </div>
  );
}
