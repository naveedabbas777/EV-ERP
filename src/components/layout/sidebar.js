'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Undo2,
  Users,
  Warehouse,
  X,
} from 'lucide-react';

const navigation = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { label: 'Dealers', href: '/dealers', icon: Users },
  { label: 'Showrooms', href: '/showrooms', icon: Store },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Inventory', href: '/inventory', icon: Warehouse },
  { label: 'Stock Transfers', href: '/inventory/transfers', icon: Warehouse },
  { label: 'Inventory Adjustments', href: '/inventory/adjustments', icon: Warehouse },
  { label: 'Approvals', href: '/approvals', icon: ShieldCheck },
  { label: 'Sales', href: '/sales', icon: BarChart3 },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Finance', href: '/finance', icon: CreditCard },
  { label: 'Accounts', href: '/accounts', icon: CreditCard },
  { label: 'Reconciliation', href: '/reconciliation', icon: CreditCard },
  { label: 'Returns', href: '/returns', icon: Undo2 },
  { label: 'Employees', href: '/employees', icon: BriefcaseBusiness },
  { label: 'Attendance', href: '/attendance', icon: ShieldCheck },
  { label: 'Payroll', href: '/payroll', icon: CreditCard },
  { label: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { label: 'Vendors', href: '/vendors', icon: Building2 },
  { label: 'Users', href: '/users', icon: ShieldCheck },
  { label: 'Roles', href: '/roles', icon: ShieldCheck },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Audit Log', href: '/audit', icon: ShieldCheck },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ isOpen = false, isCollapsed = false, onClose = () => {}, onToggleCollapse = () => {} }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/55 transition-opacity duration-200 lg:hidden ${isOpen ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'}`}
      />

      <aside
        id="primary-navigation"
        aria-label="Primary navigation"
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(19rem,88vw)] shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 shadow-2xl transition-[width,transform] duration-200 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:sticky lg:top-0 lg:translate-x-0 lg:shadow-none',
          isCollapsed ? 'lg:w-20' : 'lg:w-72',
        ].join(' ')}
      >
        <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-slate-800 px-3 py-3">
          <Link href="/dashboard" onClick={onClose} className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-lg font-bold text-emerald-400">
              EV
            </div>
            <div className={`min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-base font-semibold tracking-wide">EV ERP</p>
              <p className="text-xs text-slate-400">Dealer Suite</p>
            </div>
          </Link>

          <button
            type="button"
            className="hidden rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 lg:inline-flex"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          <button
            type="button"
            className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                  isCollapsed ? 'lg:justify-center lg:px-2' : '',
                  isActive ? 'bg-emerald-500/15 text-white ring-1 ring-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                ].join(' ')}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={`shrink-0 border-t border-slate-800 p-4 ${isCollapsed ? 'lg:hidden' : ''}`}>
          <div className="rounded-xl bg-slate-800/90 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">Support</p>
            <p className="mt-2 text-sm font-medium text-white">Operational status</p>
            <p className="mt-1 text-xs text-emerald-400">All systems healthy</p>
          </div>
        </div>
      </aside>
    </>
  );
}
