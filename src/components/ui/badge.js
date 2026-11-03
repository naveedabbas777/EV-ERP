import { cn } from '@/lib/utils';

export function Badge({ children, className, intent = 'neutral' }) {
  const intentClasses = {
    neutral: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    success: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    warning: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    danger: 'bg-red-100 text-red-700 ring-1 ring-red-200',
    info: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide', intentClasses[intent], className)}>
      {children}
    </span>
  );
}
