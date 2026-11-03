'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const defaultRoles = [
  'Super Admin',
  'General Manager',
  'Finance Manager',
  'Accounts Manager',
  'Sales Manager',
  'Dealer Manager',
  'Showroom Staff',
  'After-Sales Manager',
  'Employee Manager',
  'Regional Sales Manager',
  'Purchase Manager',
  'Warehouse Manager',
  'Dealer User',
  'Dealer Admin',
];

const columns = [
  { key: 'id', label: 'User ID' },
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'dealerName', label: 'Dealer' },
  { key: 'showroomName', label: 'Showroom' },
  { key: 'email', label: 'Email' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge intent={row.status === 'Active' ? 'success' : 'warning'}>{row.status}</Badge>,
  },
  {
    key: 'actions',
    label: 'Action',
    render: (row) => (
      <Button variant="outline" size="sm" onClick={() => row.onEdit?.(row)}>
        Edit
      </Button>
    ),
  },
];

export default function UsersPage() {
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState(defaultRoles);
  const [dealers, setDealers] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [dealerId, setDealerId] = useState('');
  const [capabilities, setCapabilities] = useState({ canManageUsers: false, canManageStaff: false });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id: '', name: '', email: '', password: '', roleName: 'Dealer User', status: 'Active', dealerId: '', showroomId: '' });

  const handleEdit = useCallback((row) => {
    setForm({
      id: row.id,
      name: row.name,
      email: row.email,
      password: '',
      roleName: row.role || 'Dealer User',
      status: row.status || 'Active',
      dealerId: row.dealerId || dealerId || '',
      showroomId: row.showroomId || '',
    });
  }, [dealerId]);

  const loadUsers = useCallback(async () => {
    try {
      const usersResponse = await fetch('/api/users', { cache: 'no-store' });
      const usersPayload = await usersResponse.json();
      if (!usersResponse.ok) throw new Error(usersPayload?.error || 'Unable to load users.');
      const canManageOrganizationUsers = Boolean(usersPayload?.capabilities?.canManageUsers);
      const rolesResponse = canManageOrganizationUsers ? await fetch('/api/roles') : null;
      const rolesPayload = rolesResponse ? await rolesResponse.json() : null;
      if (rolesResponse && !rolesResponse.ok) throw new Error(rolesPayload?.error || 'Unable to load user roles.');

      const dealerNames = new Map((usersPayload?.options?.dealers || []).map((dealer) => [dealer.id, dealer.name]));
      const showroomNames = new Map((usersPayload?.options?.showrooms || []).map((showroom) => [showroom.id, showroom.name]));
      const nextRows = (usersPayload?.data || []).map((row) => ({
        ...row,
        dealerName: dealerNames.get(row.dealerId) || (row.dealerId ? 'Assigned dealer' : '—'),
        showroomName: showroomNames.get(row.showroomId) || row.showroom?.name || 'All showrooms',
        onEdit: handleEdit,
      }));

      setRows(nextRows);
      setRoles(canManageOrganizationUsers
        ? ((rolesPayload?.data || []).map((role) => role.name).length ? rolesPayload.data.map((role) => role.name) : defaultRoles)
        : ['Showroom Staff']);
      setDealers(usersPayload?.options?.dealers || []);
      setShowrooms(usersPayload?.options?.showrooms || []);
      setDealerId(usersPayload?.options?.dealerId || '');
      setCapabilities(usersPayload?.capabilities || { canManageUsers: false, canManageStaff: false });
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, [handleEdit]);

  useEffect(() => {
    void (async () => {
      await loadUsers();
    })();
  }, [loadUsers]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const method = form.id ? 'PATCH' : 'POST';
      const response = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ...(form.id ? {} : { password: form.password }),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save user');
      }

      setForm({ id: '', name: '', email: '', password: '', roleName: 'Dealer User', status: 'Active', dealerId: dealerId || '', showroomId: '' });
      await loadUsers();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const dealerRoles = ['Dealer Admin', 'Showroom Staff'];
  const roleRequiresDealer = dealerRoles.includes(form.roleName);
  const visibleShowrooms = showrooms.filter((showroom) => !form.dealerId || showroom.dealerId === form.dealerId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Access control</p>
        <h2 className="text-2xl font-semibold text-slate-900">Users and roles</h2>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>{form.id ? 'Edit user' : 'Add user'}</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit}>
          <Input
            placeholder="Full name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <Input
            type="password"
            placeholder={form.id ? 'New password (optional)' : 'Password'}
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            value={form.roleName}
            onChange={(event) => setForm((current) => ({ ...current, roleName: event.target.value }))}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {roleRequiresDealer && !dealerId ? (
            <select
              required
              aria-label="Assign dealer"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              value={form.dealerId}
              onChange={(event) => setForm((current) => ({ ...current, dealerId: event.target.value, showroomId: '' }))}
            >
              <option value="">Select dealer</option>
              {dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}
            </select>
          ) : null}
          {form.roleName === 'Showroom Staff' ? (
            <select
              required
              aria-label="Assign showroom"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              value={form.showroomId}
              onChange={(event) => setForm((current) => ({ ...current, showroomId: event.target.value }))}
            >
              <option value="">Select showroom</option>
              {visibleShowrooms.map((showroom) => <option key={showroom.id} value={showroom.id}>{showroom.name}</option>)}
            </select>
          ) : null}
          <div className="flex gap-2">
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : form.id ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
        {error ? <p className="mt-4 text-sm text-red-700" role="alert">{error}</p> : null}
      </Card>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>User directory</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading users...</p>
          ) : error ? (
            <p className="text-sm text-red-700" role="alert">{error}</p>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No users found for this organization." />
          )}
        </div>
      </Card>
    </div>
  );
}
