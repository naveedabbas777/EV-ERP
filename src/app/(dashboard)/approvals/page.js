'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';

export default function ApprovalsPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [error, setError] = useState('');

  const loadApprovals = async () => {
    try {
      const response = await fetch('/api/approvals');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load approvals.');
      setRows(payload?.data || []);
      setSummary(payload?.summary || { total: 0, pending: 0, approved: 0, rejected: 0 });
      setCanReview(Boolean(payload?.capabilities?.canReview));
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load approvals.');
    } finally {
      setLoading(false);
    }
  };

  const updateApproval = async (id, status) => {
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          comments: status === 'approved' ? 'Approved by ERP operations team.' : 'Rejected by ERP operations team.',
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to update approval.');
      await loadApprovals();
    } catch (actionError) {
      setError(actionError.message || 'Unable to update approval.');
    }
  };

  useEffect(() => {
    void (async () => {
      await loadApprovals();
    })();
  }, []);

  const columns = [
    { key: 'referenceNo', label: 'Reference' },
    { key: 'type', label: 'Type' },
    { key: 'requestedBy', label: 'Requested by' },
    { key: 'createdAt', label: 'Requested', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge intent={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>{row.status}</Badge>,
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => canReview && row.status === 'pending' ? (
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => updateApproval(row.id, 'approved')}>Approve</Button>
          <Button variant="outline" onClick={() => updateApproval(row.id, 'rejected')}>Reject</Button>
        </div>
      ) : <span className="text-sm text-slate-400">—</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Operational governance</p>
        <h2 className="text-2xl font-semibold text-slate-900">Approval center</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="text-sm text-slate-500">Total</div><div className="mt-2 text-3xl font-semibold">{summary.total}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Pending</div><div className="mt-2 text-3xl font-semibold text-amber-700">{summary.pending}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Approved</div><div className="mt-2 text-3xl font-semibold text-emerald-700">{summary.approved}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Rejected</div><div className="mt-2 text-3xl font-semibold text-red-700">{summary.rejected}</div></Card>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Pending workflow approvals</CardTitle>
        </CardHeader>

        {loading ? (
          <p className="text-sm text-slate-500">Loading approvals...</p>
        ) : error ? (
          <div className="flex items-center justify-between gap-4 text-sm text-red-600">
            <p role="alert">{error}</p>
            <Button variant="outline" onClick={() => { setLoading(true); void loadApprovals(); }}>Retry</Button>
          </div>
        ) : (
          <DataTable columns={columns} rows={rows} emptyMessage="No approval records found." />
        )}
      </Card>
    </div>
  );
}
