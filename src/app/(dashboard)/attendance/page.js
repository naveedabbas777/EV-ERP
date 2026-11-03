'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'employee', label: 'Employee' },
  { key: 'department', label: 'Department' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge intent={row.status === 'Present' ? 'success' : row.status === 'Late' ? 'warning' : row.status === 'Absent' ? 'danger' : 'info'}>{row.status}</Badge>,
  },
];

export default function AttendancePage() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ employeeId: '', status: 'Present', date: new Date().toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadAttendance = async () => {
    try {
      const response = await fetch('/api/attendance');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load attendance.');
      setRows(payload?.data || []);
      setEmployees(payload?.options?.employees || []);
      setCanManage(Boolean(payload?.capabilities?.canManage));
      setLoadError('');
    } catch (loadFailure) {
      setLoadError(loadFailure.message || 'Unable to load attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadAttendance();
    })();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || 'Unable to record attendance.');
      }

      setForm({ employeeId: '', status: 'Present', date: new Date().toISOString().slice(0, 10) });
      await loadAttendance();
    } catch (error) {
      setError(error.message || 'Unable to record attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">People operations</p>
        <h2 className="text-2xl font-semibold text-slate-900">Attendance and leave</h2>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Mark attendance</CardTitle>
        </CardHeader>

        {canManage ? (
          <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <select
            required
            value={form.employeeId}
            onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          >
            <option value="">Select employee</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeCode}</option>)}
          </select>
          <Input
            type="date"
            required
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
          <div className="flex gap-2">
            <select
              required
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
            >
              {['Present', 'Late', 'Absent', 'Leave'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <Button type="submit" disabled={submitting || !employees.length}>{submitting ? 'Saving...' : 'Save'}</Button>
          </div>
          {error ? <p role="alert" className="text-sm text-red-600 md:col-span-3">{error}</p> : null}
          </form>
        ) : (
          <p className="mt-4 text-sm text-slate-500">You have read-only access to attendance records.</p>
        )}
      </Card>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Employee attendance</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading attendance...</p>
          ) : loadError ? (
            <div className="flex items-center justify-between gap-4 text-sm text-red-600">
              <p role="alert">{loadError}</p>
              <Button variant="outline" onClick={() => { setLoading(true); void loadAttendance(); }}>Retry</Button>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} emptyMessage="No attendance records found." />
          )}
        </div>
      </Card>
    </div>
  );
}
