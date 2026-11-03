import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(15,23,42,0.08)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-base font-semibold tracking-[-0.02em] text-slate-900 sm:text-lg', className)} {...props}>
      {children}
    </h3>
  );
}
