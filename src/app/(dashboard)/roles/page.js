'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const columns = [
  { key: 'name', label: 'Role' },
  { key: 'description', label: 'Description' },
  {
    key: 'permissions',
    label: 'Permissions',
    render: (row) => (
      <div className="flex flex-wrap gap-2">
        {(row.permissions || []).map((permission) => (
          <Badge key={permission} intent="info">{permission}</Badge>
        ))}
      </div>
    ),
  },
];

export default function RolesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', permissions: 'dealers.read,inventory.read,users.manage' });
  const [submitting, setSubmitting] = useState(false);

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/roles');
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
      try {
        const response = await fetch('/api/roles');
        const payload = await response.json();
        setRows(payload?.data || []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const permissions = form.permissions
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean);

      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          permissions,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to create role');
      }

      setForm({ name: '', description: '', permissions: 'dealers.read,inventory.read,users.manage' });
      await loadRoles();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Access control</p>
        <h2 className="text-2xl font-semibold text-slate-900">Role and permission management</h2>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Create role</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <Input
            placeholder="Role name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Permissions (comma separated)"
              value={form.permissions}
              onChange={(event) => setForm((current) => ({ ...current, permissions: event.target.value }))}
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Add'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading roles...</p>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No roles configured for this organization." />
          )}
        </div>
      </Card>
    </div>
  );
}
