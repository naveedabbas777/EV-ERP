'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const columns = [
  { key: 'name', label: 'Employee' },
  { key: 'role', label: 'Role' },
  { key: 'showroom', label: 'Showroom' },
  { key: 'location', label: 'Location' },
  { key: 'attendance', label: 'Attendance' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge intent={row.status === 'active' ? 'success' : 'warning'}>{row.status}</Badge>,
  },
];

export default function EmployeesPage() {
  const [rows, setRows] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', employeeCode: '', designation: 'Operations', regionId: '', showroomId: '', email: '', phone: '', baseSalary: '50000' });
  const [submitting, setSubmitting] = useState(false);

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load employees.');
      setRows(payload?.data || []);
      setShowrooms(payload?.options?.showrooms || []);
      setCanManage(Boolean(payload?.capabilities?.canManage));
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Unable to load employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadEmployees();
    })();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || 'Unable to create employee.');
      }

      setForm({ firstName: '', lastName: '', employeeCode: '', designation: 'Operations', regionId: '', showroomId: '', email: '', phone: '', baseSalary: '50000' });
      await loadEmployees();
    } catch (error) {
      setFormError(error.message || 'Unable to create employee.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">People operations</p>
        <h2 className="text-2xl font-semibold text-slate-900">Employee management</h2>
      </div>

      {canManage ? <Card className="p-6">
        <CardHeader>
          <CardTitle>Add employee</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
          <Input
            required
            placeholder="First name"
            value={form.firstName}
            onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
          />
          <Input
            required
            placeholder="Last name"
            value={form.lastName}
            onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
          />
          <Input
            required
            placeholder="Employee code"
            value={form.employeeCode}
            onChange={(event) => setForm((current) => ({ ...current, employeeCode: event.target.value }))}
          />
          <select
            aria-label="Assign showroom"
            value={form.showroomId}
            onChange={(event) => setForm((current) => ({ ...current, showroomId: event.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          >
            <option value="">Company / unassigned</option>
            {showrooms.map((showroom) => <option key={showroom.id} value={showroom.id}>{showroom.name} · {showroom.code}</option>)}
          </select>
          <div className="flex gap-2">
            <Input
              required
              placeholder="Designation"
              value={form.designation}
              onChange={(event) => setForm((current) => ({ ...current, designation: event.target.value }))}
            />
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add'}</Button>
          </div>
          {formError ? <p role="alert" className="text-sm text-red-600 md:col-span-4">{formError}</p> : null}
        </form>
      </Card> : null}

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Team roster</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading employees...</p>
          ) : loadError ? (
            <div className="flex items-center justify-between gap-4 text-sm text-red-600">
              <p role="alert">{loadError}</p>
              <Button variant="outline" onClick={() => { setLoading(true); void loadEmployees(); }}>Retry</Button>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No employees found." />
          )}
        </div>
      </Card>
    </div>
  );
}
