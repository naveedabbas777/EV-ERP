'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const columns = [
  { key: 'createdAt', label: 'Created', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—' },
  { key: 'employee', label: 'Employee' },
  { key: 'month', label: 'Month' },
  { key: 'amount', label: 'Amount', render: (row) => `PKR ${Number(row.amount).toLocaleString()}` },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge intent={row.status === 'Paid' ? 'success' : row.status === 'Pending' ? 'warning' : 'info'}>{row.status}</Badge>,
  },
];

export default function PayrollPage() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [canMarkPaid, setCanMarkPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ employeeId: '', month: new Date().toISOString().slice(0, 7), amount: '', paid: false });
  const [submitting, setSubmitting] = useState(false);

  const loadPayroll = async () => {
    try {
      const response = await fetch('/api/payroll');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load payroll.');
      setRows(payload?.data || []);
      setEmployees(payload?.options?.employees || []);
      setCanCreate(Boolean(payload?.capabilities?.canCreate));
      setCanMarkPaid(Boolean(payload?.capabilities?.canMarkPaid));
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Unable to load payroll.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadPayroll();
    })();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || 'Unable to create payroll entry.');
      }

      setForm({ employeeId: '', month: new Date().toISOString().slice(0, 7), amount: '', paid: false });
      await loadPayroll();
    } catch (error) {
      setFormError(error.message || 'Unable to create payroll entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Financial operations</p>
        <h2 className="text-2xl font-semibold text-slate-900">Payroll and salaries</h2>
      </div>

      {canCreate ? <Card className="p-6">
        <CardHeader>
          <CardTitle>Create salary record</CardTitle>
        </CardHeader>

        <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
          <select
            required
            value={form.employeeId}
            onChange={(event) => {
              const employee = employees.find((item) => item.id === event.target.value);
              setForm((current) => ({ ...current, employeeId: event.target.value, amount: employee?.baseSalary || '' }));
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          >
            <option value="">Select employee</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeCode}</option>)}
          </select>
          <Input
            type="month"
            required
            value={form.month}
            onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))}
          />
          <Input
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="Amount (PKR)"
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
          />
          <div className="flex gap-2">
            {canMarkPaid ? <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.paid} onChange={(event) => setForm((current) => ({ ...current, paid: event.target.checked }))} />
              Mark paid
            </label> : null}
            <Button type="submit" disabled={submitting || !employees.length}>{submitting ? 'Saving...' : 'Save'}</Button>
          </div>
          {formError ? <p role="alert" className="text-sm text-red-600 md:col-span-4">{formError}</p> : null}
        </form>
      </Card> : null}

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Salary overview</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading payroll...</p>
          ) : loadError ? (
            <div className="flex items-center justify-between gap-4 text-sm text-red-600">
              <p role="alert">{loadError}</p>
              <Button variant="outline" onClick={() => { setLoading(true); void loadPayroll(); }}>Retry</Button>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No payroll entries found." />
          )}
        </div>
      </Card>
    </div>
  );
}
