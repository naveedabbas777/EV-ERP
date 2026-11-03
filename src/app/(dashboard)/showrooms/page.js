'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const initialForm = { dealerId: '', name: '', code: '', address: '', phone: '', email: '' };

export default function ShowroomsPage() {
  const [rows, setRows] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const loadShowrooms = useCallback(async () => {
    try {
      const response = await fetch('/api/showrooms', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load showrooms.');
      setRows(payload?.data || []);
      setDealers(payload?.options?.dealers || []);
      setCanManage(Boolean(payload?.capabilities?.canManage));
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load showrooms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadShowrooms();
    })();
  }, [loadShowrooms]);

  const createShowroom = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const response = await fetch('/api/showrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Unable to create showroom (server returned ${response.status}).`);
      if (!payload) throw new Error('The server returned an invalid response while creating the showroom.');
      setForm({ ...initialForm });
      await loadShowrooms();
    } catch (submitError) {
      setFormError(submitError.message || 'Unable to create showroom.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (showroom) => {
    const status = showroom.status === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`/api/showrooms/${showroom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Unable to update showroom (server returned ${response.status}).`);
      if (!payload) throw new Error('The server returned an invalid response while updating the showroom.');
      await loadShowrooms();
    } catch (updateError) {
      setError(updateError.message || 'Unable to update showroom.');
    }
  };

  const columns = [
    { key: 'name', label: 'Showroom', render: (row) => <Link className="font-medium text-emerald-800 hover:underline" href={`/showrooms/${row.id}`}>{row.name}</Link> },
    { key: 'code', label: 'Code' },
    { key: 'dealer', label: 'Dealer', render: (row) => row.dealer?.name || '—' },
    { key: 'address', label: 'Location', render: (row) => row.address || '—' },
    { key: 'stockSkuCount', label: 'Stock SKUs' },
    { key: 'retailSalesCount', label: 'Retail sales' },
    { key: 'retailRevenue', label: 'Retail revenue', render: (row) => `PKR ${Number(row.retailRevenue || 0).toLocaleString()}` },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge intent={row.status === 'active' ? 'success' : 'warning'}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => canManage ? <Button variant="outline" size="sm" onClick={() => toggleStatus(row)}>{row.status === 'active' ? 'Deactivate' : 'Activate'}</Button> : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Dealer operations</p>
        <h2 className="text-2xl font-semibold text-slate-900">Showroom management</h2>
        <p className="mt-1 text-sm text-slate-600">Manage each location’s inventory, customer sales, orders, staff, returns, payments, and expenses.</p>
      </div>

      {canManage ? (
        <Card className="p-6">
          <CardHeader><CardTitle>Add showroom</CardTitle></CardHeader>
          <form className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={createShowroom}>
            {dealers.length ? (
              <select
                required
                aria-label="Dealer"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                value={form.dealerId}
                onChange={(event) => setForm((current) => ({ ...current, dealerId: event.target.value }))}
              >
                <option value="">Select dealer</option>
                {dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name} · {dealer.registrationNumber}</option>)}
              </select>
            ) : null}
            <Input required maxLength={191} placeholder="Showroom name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input required maxLength={40} placeholder="Code (e.g. KHI-CENTRAL)" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
            <Input maxLength={500} placeholder="Address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
            <Input maxLength={50} placeholder="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            <Input type="email" maxLength={191} placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            <div className="sm:col-span-2 xl:col-span-3">
              <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create showroom'}</Button>
            </div>
          </form>
          {formError ? <p className="mt-3 text-sm text-red-700" role="alert">{formError}</p> : null}
        </Card>
      ) : null}

      <Card className="p-6">
        <CardHeader><CardTitle>Showroom portfolio</CardTitle></CardHeader>
        <div className="mt-4">
          {loading ? <p className="text-sm text-slate-500">Loading showrooms...</p> : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              <p>{error}</p>
              <Button className="mt-3" variant="outline" onClick={() => { setLoading(true); void loadShowrooms(); }}>Try again</Button>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No showrooms have been set up for this dealer." />
          )}
        </div>
      </Card>
    </div>
  );
}
