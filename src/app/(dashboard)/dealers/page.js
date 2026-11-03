'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const columns = [
  { key: 'registrationNumber', label: 'Registration' },
  { key: 'name', label: 'Dealer', render: (row) => <Link className="font-medium text-emerald-800 hover:underline" href={`/dealers/${row.id}`}>{row.name}</Link> },
  { key: 'showroomCount', label: 'Showrooms' },
  { key: 'region', label: 'Region' },
  { key: 'manager', label: 'Manager' },
  { key: 'revenue', label: 'Revenue', render: (row) => `$${Number(row.revenue || 0).toLocaleString()}` },
  { key: 'outstanding', label: 'Outstanding', render: (row) => `$${Number(row.outstanding || 0).toLocaleString()}` },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const intent = row.status === 'Active' ? 'success' : row.status === 'Pending' ? 'warning' : 'danger';
      return <Badge intent={intent}>{row.status}</Badge>;
    },
  },
];

async function fetchDealers() {
  const response = await fetch('/api/dealers', { cache: 'no-store' });
  const payload = await response.json();

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message || payload?.error || 'Unable to load dealers.');
  }

  const result = payload.data;
  return {
    dealers: Array.isArray(result?.data) ? result.data : [],
    stats: result?.stats || { totalDealers: 0, activeDealers: 0, pendingDealers: 0, outstandingBalance: 0 },
  };
}

export default function DealersPage() {
  const [dealers, setDealers] = useState([]);
  const [stats, setStats] = useState({ totalDealers: 0, activeDealers: 0, pendingDealers: 0, outstandingBalance: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchDealers()
      .then(({ dealers: result, stats: summary }) => {
        setDealers(result);
        setStats(summary);
      })
      .catch((error) => {
        setDealers([]);
        setStats({ totalDealers: 0, activeDealers: 0, pendingDealers: 0, outstandingBalance: 0 });
        setLoadError(error.message || 'Unable to load dealers.');
      })
      .finally(() => setLoading(false));
  }, []);

  const retryLoadDealers = () => {
    setLoading(true);
    setLoadError('');
    fetchDealers()
      .then(({ dealers: result, stats: summary }) => {
        setDealers(result);
        setStats(summary);
      })
      .catch((error) => {
        setDealers([]);
        setStats({ totalDealers: 0, activeDealers: 0, pendingDealers: 0, outstandingBalance: 0 });
        setLoadError(error.message || 'Unable to load dealers.');
      })
      .finally(() => setLoading(false));
  };

  const filteredDealers = useMemo(() => {
    if (!search.trim()) return dealers;
    const query = search.toLowerCase();
    return dealers.filter((dealer) => {
      return [dealer.name, dealer.region, dealer.manager, dealer.registrationNumber]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [dealers, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Dealer network</p>
          <h2 className="text-2xl font-semibold text-slate-900">Dealer management</h2>
        </div>
        <Button variant="primary">Add dealer</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="text-sm text-slate-500">Total dealers</div><div className="mt-2 text-3xl font-semibold">{stats.totalDealers}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Active</div><div className="mt-2 text-3xl font-semibold text-emerald-700">{stats.activeDealers}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Pending</div><div className="mt-2 text-3xl font-semibold text-amber-700">{stats.pendingDealers}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Outstanding</div><div className="mt-2 text-3xl font-semibold text-red-700">${Number(stats.outstandingBalance || 0).toLocaleString()}</div></Card>
      </div>

      <Card className="p-6">
        <CardHeader className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>Dealer portfolio</CardTitle>
          <div className="w-full max-w-sm">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dealers or region"
            />
          </div>
        </CardHeader>

        {loading ? (
          <p className="text-sm text-slate-500">Loading dealer portfolio...</p>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <p>{loadError}</p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={retryLoadDealers}
            >
              Try again
            </Button>
          </div>
        ) : (
          <DataTable columns={columns} rows={filteredDealers} emptyMessage="No dealers match the current search." />
        )}
      </Card>
    </div>
  );
}
