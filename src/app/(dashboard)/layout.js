import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/login');
  }

  return <AppShell>{children}</AppShell>;
}
