import { cn } from '@/lib/utils';

export function DataTable({ columns, rows, emptyMessage = 'No records found.' }) {
  if (!rows?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.03)]">
      <div className="overflow-x-auto">
        <table className="min-w-full min-w-[760px] divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-100/80 text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn('px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em]', column.className)}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={row.id ?? rowIndex} className="transition-colors hover:bg-slate-50/90">
                {columns.map((column) => (
                  <td key={`${row.id ?? rowIndex}-${column.key}`} className={cn('px-4 py-3 align-middle text-[13px] text-slate-700', column.cellClassName)}>
                    {typeof column.render === 'function' ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
