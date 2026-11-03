'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginSchema } from '@/lib/validation';

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: 'admin@evdealer.com',
      password: 'Admin@1234',
    },
  });

  async function onSubmit(data) {
    try {
      const parsed = loginSchema.safeParse(data);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message || 'Please enter valid login details.');
        return;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to sign in.');
      }

      toast.success('Welcome back! Redirecting to dashboard.');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error(error.message || 'Unable to sign in.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
        <div className="relative hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(15,23,42,0.86))]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              EV ERP SaaS
            </div>
            <h1 className="mt-8 text-4xl font-semibold leading-tight">
              Manage every EV dealership workflow from one platform.
            </h1>
            <p className="mt-4 max-w-md text-sm text-slate-300">
              Track inventory, manage dealer performance, approve payments, and keep your operations moving in real time.
            </p>
          </div>

          <div className="relative z-10 rounded-2xl border border-slate-700 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Security-first access</p>
                <p className="text-xs text-slate-300">RBAC, ABAC, and encrypted sessions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Welcome back</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Sign in to EV ERP</h2>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  {...register('email')}
                />
                {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email.message}</p> : null}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register('password')}
                />
                {errors.password ? <p className="mt-2 text-sm text-red-600">{errors.password.message}</p> : null}
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                  Keep me signed in
                </label>
                <Link href="/forgot-password" className="font-medium text-emerald-600 hover:text-emerald-500">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Demo credentials</p>
              <p className="mt-1">Email: admin@evdealer.com</p>
              <p>Password: Admin@1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
