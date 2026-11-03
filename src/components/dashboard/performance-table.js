import { DataTable } from '@/components/ui/table';

export function PerformanceTable({ rows }) {
  const columns = [
    { key: 'region', label: 'Region' },
    { key: 'sales', label: 'Sales revenue', render: (row) => Number(row.sales || 0).toLocaleString() },
    { key: 'transactions', label: 'Transactions' },
  ];

  return <DataTable columns={columns} rows={rows} emptyMessage="No regional performance data available." />;
}
