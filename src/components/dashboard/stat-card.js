import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const toneMap = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  cyan: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-100',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
  indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
};

export function StatCard({ label, value, delta, tone = 'slate' }) {
  const baseClass = toneMap[tone] ?? toneMap.sky;

  return (
    <div className="group rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_32px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-900">{value}</p>
        </div>
        <div className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold', baseClass)}>
          <ArrowUpRight className="h-3.5 w-3.5" />
          {delta}
        </div>
      </div>
    </div>
  );
}
