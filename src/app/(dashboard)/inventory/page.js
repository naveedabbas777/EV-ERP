'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/table';

const columns = [
  { key: 'sku', label: 'SKU' },
  { key: 'product', label: 'Product' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'stock', label: 'Stock' },
  { key: 'reorderPoint', label: 'Reorder Point' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const intent = row.status === 'Healthy' ? 'success' : row.status === 'Low Stock' ? 'warning' : 'danger';
      return <Badge intent={intent}>{row.status}</Badge>;
    },
  },
];

export default function InventoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/inventory');
        const payload = await response.json();
        setRows(payload?.data || []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a,#0f766e_56%,#0b1220)] p-5 text-white shadow-[0_22px_48px_rgba(15,23,42,0.15)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Inventory operations</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Stock control</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-emerald-100 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Inventory health active
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Total SKUs</div><div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{rows.length}</div></Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Healthy</div><div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">{rows.filter((row) => row.status === 'Healthy').length}</div></Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4"><div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Low stock</div><div className="mt-3 text-3xl font-semibold tracking-tight text-amber-700">{rows.filter((row) => row.status === 'Low Stock').length}</div></Card>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Warehouse and dealer inventory</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading inventory...</p>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No inventory records found." />
          )}
        </div>
      </Card>
    </div>
  );
}
