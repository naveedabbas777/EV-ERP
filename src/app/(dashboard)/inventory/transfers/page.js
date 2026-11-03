'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

export default function InventoryTransfersPage() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: '1', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadTransfers = async () => {
    try {
      const response = await fetch('/api/inventory/transfers', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load stock transfers.');
      setRows(Array.isArray(payload?.data) ? payload.data : []);
      setProducts(payload?.options?.products || []);
      setWarehouses(payload?.options?.warehouses || []);
      setError('');
    } catch (loadError) {
      setRows([]);
      setError(loadError.message || 'Unable to load stock transfers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransfers();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create stock transfer');
      }

      setForm({ productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: '1', notes: '' });
      await loadTransfers();
    } catch (error) {
      setError(error.message || 'Unable to create stock transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'referenceNo', label: 'Transfer ID' },
    { key: 'product', label: 'Product' },
    { key: 'fromWarehouse', label: 'From' },
    { key: 'toWarehouse', label: 'To' },
    { key: 'quantity', label: 'Qty' },
    { key: 'status', label: 'Status', render: (row) => <Badge intent={row.status === 'approved' ? 'success' : 'warning'}>{row.status}</Badge> },
    { key: 'notes', label: 'Notes' },
    { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Warehouse workflows</p>
        <h2 className="text-2xl font-semibold text-slate-900">Stock transfers</h2>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Create stock transfer</CardTitle>
        </CardHeader>

        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleSubmit}>
          <select required value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <option value="">Select product</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
          </select>
          <select required value={form.fromWarehouseId} onChange={(event) => setForm((current) => ({ ...current, fromWarehouseId: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <option value="">Source warehouse</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
          <select required value={form.toWarehouseId} onChange={(event) => setForm((current) => ({ ...current, toWarehouseId: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <option value="">Destination warehouse</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
          <Input type="number" min="1" step="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="Quantity" required />
          <Button type="submit" disabled={submitting || products.length === 0 || warehouses.length < 2}>{submitting ? 'Saving...' : 'Record transfer'}</Button>
        </form>

        <div className="mt-4">
          <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" />
        </div>
        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
        {!loading && warehouses.length < 2 && <p className="mt-3 text-sm text-amber-700">Configure at least two organization warehouses before transferring stock.</p>}
      </Card>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Recent stock transfers</CardTitle>
        </CardHeader>

        {loading ? (
          <p className="text-sm text-slate-500">Loading transfers...</p>
        ) : (
          <DataTable columns={columns} rows={rows} emptyMessage="No stock transfers found." />
        )}
      </Card>
    </div>
  );
}
