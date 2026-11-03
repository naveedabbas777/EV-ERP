'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';

export default function AuditPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit')
      .then((response) => response.json())
      .then((payload) => setRows(payload?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'action', label: 'Action' },
    { key: 'entityType', label: 'Entity' },
    { key: 'user', label: 'User' },
    { key: 'details', label: 'Details' },
    { key: 'createdAt', label: 'Created', render: (row) => new Date(row.createdAt).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Governance</p>
        <h2 className="text-2xl font-semibold text-slate-900">Audit log</h2>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Recent organization events</CardTitle>
        </CardHeader>

        {loading ? (
          <p className="text-sm text-slate-500">Loading audit trail...</p>
        ) : (
          <DataTable columns={columns} rows={rows} emptyMessage="No audit entries found." />
        )}
      </Card>
    </div>
  );
}
