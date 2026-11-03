'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  LogOut,
  Menu,
  Search,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const searchablePages = [
  { label: 'Dashboard', href: '/dashboard', keywords: 'home overview' },
  { label: 'Dealers', href: '/dealers', keywords: 'dealer directory' },
  { label: 'Products', href: '/products', keywords: 'catalog models sku' },
  { label: 'Inventory', href: '/inventory', keywords: 'stock warehouse' },
  { label: 'Sales', href: '/sales', keywords: 'revenue invoices' },
  { label: 'Orders', href: '/orders', keywords: 'order management' },
  { label: 'Finance', href: '/finance', keywords: 'payments balances' },
  { label: 'Accounts', href: '/accounts', keywords: 'ledger expenses' },
  { label: 'Purchases', href: '/purchases', keywords: 'procurement vendors' },
  { label: 'Reports', href: '/reports', keywords: 'analytics performance' },
  { label: 'Users', href: '/users', keywords: 'user management' },
  { label: 'Settings', href: '/settings', keywords: 'configuration' },
];

export function Topbar({ title, onOpenSidebar, isSidebarCollapsed = false, onToggleSidebar }) {
  const pathname = usePathname() || '/dashboard';
  const router = useRouter();
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('?')[0].split('/').filter(Boolean);
    const items = segments.length ? segments : ['dashboard'];
    return items.map((segment, index) => {
      const path = `/${items.slice(0, index + 1).join('/')}`;
      const label = segment
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      return { label: label === 'Dashboard' ? 'Home' : label, href: path };
    });
  }, [pathname]);

  const pageTitle = title || breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard';
  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return searchablePages.slice(0, 5);
    return searchablePages.filter((page) => `${page.label} ${page.keywords}`.toLowerCase().includes(query)).slice(0, 6);
  }, [search]);

  useEffect(() => {
    let active = true;

    const loadHeaderData = async () => {
      const [userResult, notificationsResult] = await Promise.allSettled([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/notifications', { cache: 'no-store' }),
      ]);

      if (!active) return;

      if (userResult.status === 'fulfilled' && userResult.value.ok) {
        const payload = await userResult.value.json();
        if (active) setCurrentUser(payload?.user || null);
      }

      if (notificationsResult.status === 'fulfilled' && notificationsResult.value.ok) {
        const payload = await notificationsResult.value.json();
        if (active) setNotificationCount(payload?.data?.unreadCount || 0);
      }
    };

    void loadHeaderData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const closeMenus = (event) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        setSearchOpen(false);
      }

      if (event.type === 'mousedown') {
        if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false);
        if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', closeMenus);
    document.addEventListener('keydown', closeMenus);
    return () => {
      document.removeEventListener('mousedown', closeMenus);
      document.removeEventListener('keydown', closeMenus);
    };
  }, []);

  const navigateToPage = (page) => {
    setSearch(page.label);
    setSearchOpen(false);
    router.push(page.href);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (filteredPages[0]) navigateToPage(filteredPages[0]);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Unable to sign out. Please try again.');
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setLogoutError(error.message || 'Unable to sign out. Please try again.');
      setLoggingOut(false);
    }
  };

  const initials = (currentUser?.name || 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-md sm:px-5 lg:px-7">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open navigation"
            aria-controls="primary-navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 lg:inline-flex"
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isSidebarCollapsed}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 overflow-hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs">
              {breadcrumbs.map((crumb, index) => (
                <div key={`${crumb.href}-${index}`} className="flex min-w-0 items-center gap-1">
                  <span className="truncate">{crumb.label}</span>
                  {index < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />}
                </div>
              ))}
            </nav>
            <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{pageTitle}</h1>
          </div>
        </div>

        <div className="order-3 flex w-full items-center gap-2 sm:order-none sm:w-auto sm:gap-3">
          <div ref={searchRef} className="relative min-w-0 flex-1 sm:w-52 sm:flex-none lg:w-64">
            <form onSubmit={handleSearchSubmit} role="search">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  role="combobox"
                  aria-label="Search ERP pages"
                  aria-expanded={searchOpen}
                  aria-controls="topbar-search-results"
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Search modules..."
                  value={search}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSearchOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' && filteredPages[0]) {
                      event.preventDefault();
                      navigateToPage(filteredPages[0]);
                    }
                  }}
                />
              </div>
            </form>

            {searchOpen && (
              <div id="topbar-search-results" role="listbox" className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {filteredPages.length ? filteredPages.map((page) => (
                  <button
                    key={page.href}
                    type="button"
                    role="option"
                    aria-selected={pathname === page.href}
                    onClick={() => navigateToPage(page)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {page.label}
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                )) : <p className="px-3 py-3 text-sm text-slate-500">No matching modules.</p>}
              </div>
            )}
          </div>

          <button
            type="button"
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ''}`}
            onClick={() => router.push('/notifications')}
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:inline-flex"
            aria-label="Open settings"
            onClick={() => router.push('/settings')}
          >
            <Settings className="h-4 w-4" />
          </button>

          <div ref={userMenuRef} className="relative shrink-0">
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:gap-3 sm:px-3"
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-label="Open user menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                {initials}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-32 truncate text-sm font-medium text-slate-900">{currentUser?.name || 'Loading user'}</span>
                <span className="block max-w-32 truncate text-xs text-slate-500">{currentUser?.role || currentUser?.email || 'Account'}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
            </button>

            {userMenuOpen && (
              <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-slate-900">{currentUser?.name || 'User account'}</p>
                  <p className="truncate text-xs text-slate-500">{currentUser?.email || 'Signed-in account'}</p>
                  {currentUser?.role && <p className="mt-1 text-xs font-medium text-emerald-700">{currentUser.role}</p>}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false);
                    router.push('/settings');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <CircleUserRound className="h-4 w-4" /> Account and settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={loggingOut}
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" /> {loggingOut ? 'Signing out...' : 'Switch account / Sign out'}
                </button>
                {logoutError && <p role="alert" className="px-3 py-2 text-xs text-rose-700">{logoutError}</p>}
              </div>
            )}
          </div>

          <Button className="hidden shrink-0 sm:inline-flex" onClick={() => router.push('/orders')}>New order</Button>
        </div>
      </div>
    </header>
  );
}
