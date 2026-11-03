'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const initialForm = { inventoryKey: '', quantityDelta: '', reason: '' };

export default function InventoryAdjustmentsPage() {
  const [rows, setRows] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      const response = await fetch('/api/inventory/adjustments', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load stock movements.');
      setRows(Array.isArray(payload?.data) ? payload.data : []);
      setInventory(Array.isArray(payload?.options) ? payload.options : []);
      setError('');
    } catch (loadError) {
      setRows([]);
      setInventory([]);
      setError(loadError.message || 'Unable to load stock movements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedInventory = useMemo(
    () => inventory.find((item) => `${item.productId}:${item.warehouseId}` === form.inventoryKey),
    [inventory, form.inventoryKey],
  );

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!selectedInventory) throw new Error('Select a product and warehouse.');

      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedInventory.productId,
          warehouseId: selectedInventory.warehouseId,
          quantityDelta: Number(form.quantityDelta),
          reason: form.reason,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to save adjustment.');

      setForm(initialForm);
      setSuccess(`Adjustment posted. New stock level: ${payload.data.newQuantity}.`);
      await loadData();
    } catch (submitError) {
      setError(submitError.message || 'Unable to save adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'referenceNo', label: 'Reference' },
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'warehouse', label: 'Warehouse' },
    {
      key: 'quantity',
      label: 'Adjustment',
      render: (row) => <span className={row.quantity > 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{row.quantity > 0 ? `+${row.quantity}` : row.quantity}</span>,
    },
    { key: 'type', label: 'Type', render: (row) => <Badge intent={row.quantity > 0 ? 'success' : 'warning'}>{row.type}</Badge> },
    { key: 'reason', label: 'Reason' },
    { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Warehouse operations</p>
        <h2 className="text-2xl font-semibold text-slate-900">Inventory adjustments</h2>
      </div>

      <Card className="p-6">
        <CardHeader><CardTitle>Post stock adjustment</CardTitle></CardHeader>
        <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={submitAdjustment}>
          <label className="space-y-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Product / warehouse
            <select
              required
              value={form.inventoryKey}
              onChange={(event) => setForm((current) => ({ ...current, inventoryKey: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-700"
            >
              <option value="">Select stocked product</option>
              {inventory.map((item) => (
                <option key={`${item.productId}:${item.warehouseId}`} value={`${item.productId}:${item.warehouseId}`}>
                  {item.product} · {item.warehouse} · current {item.quantity}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Quantity change (+/-)
            <Input required type="number" step="1" value={form.quantityDelta} onChange={(event) => setForm((current) => ({ ...current, quantityDelta: event.target.value }))} placeholder="e.g. 5 or -2" />
          </label>
          <label className="space-y-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Reason
            <Input required maxLength={255} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Count correction, damage, etc." />
          </label>
          <div className="flex items-end">
            <Button className="w-full" type="submit" disabled={submitting || inventory.length === 0}>
              {submitting ? 'Posting...' : 'Post adjustment'}
            </Button>
          </div>
        </form>
        {selectedInventory && (
          <p className="mt-3 text-xs text-slate-500">
            Available stock: {selectedInventory.quantity - selectedInventory.reservedStock} of {selectedInventory.quantity} units; {selectedInventory.reservedStock} reserved.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-700" role="status">{success}</p>}
      </Card>

      <Card className="p-6">
        <CardHeader><CardTitle>Stock movement history</CardTitle></CardHeader>
        {loading ? (
          <p className="text-sm text-slate-500">Loading stock movements...</p>
        ) : (
          <DataTable columns={columns} rows={rows} emptyMessage="No stock movements found." />
        )}
      </Card>
    </div>
  );
}
