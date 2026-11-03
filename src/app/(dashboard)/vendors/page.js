'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const columns = [
  { key: 'id', label: 'Vendor ID' },
  { key: 'name', label: 'Vendor' },
  { key: 'contact', label: 'Contact' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge intent={row.status === 'Approved' ? 'success' : 'warning'}>{row.status}</Badge>,
  },
];

export default function VendorsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      const payload = await response.json();
      setRows(payload?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadVendors();
    })();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error('Unable to add vendor');
      }

      setForm({ name: '', contactName: '', phone: '', email: '' });
      await loadVendors();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Procurement</p>
        <h2 className="text-2xl font-semibold text-slate-900">Vendor management</h2>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Add vendor</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-5" onSubmit={handleSubmit}>
          <Input
            placeholder="Vendor name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            placeholder="Contact person"
            value={form.contactName}
            onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
          />
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add vendor'}</Button>
        </form>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Approved vendors</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading vendors...</p>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No vendors found." />
          )}
        </div>
      </Card>
    </div>
  );
}
