'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPasswordSchema } from '@/lib/validation';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">Loading reset form...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      token: tokenFromUrl,
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    try {
      const parsed = resetPasswordSchema.safeParse(data);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message || 'Invalid reset payload.');
        return;
      }

      const response = await fetch('/api/auth/forgot-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to reset the password.');
      }

      toast.success(payload.message || 'Password reset successfully.');
    } catch (error) {
      toast.error(error.message || 'Unable to reset the password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Reset password</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Choose a new password</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
            <Input id="email" type="email" placeholder="name@company.com" {...register('email')} />
            {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email.message}</p> : null}
          </div>

          <div>
            <label htmlFor="token" className="mb-2 block text-sm font-medium text-slate-700">Reset token</label>
            <Input id="token" type="text" placeholder="Paste the reset token" {...register('token')} />
            {errors.token ? <p className="mt-2 text-sm text-red-600">{errors.token.message}</p> : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">New password</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="password" type="password" className="pl-10" placeholder="Minimum 8 characters" {...register('password')} />
            </div>
            {errors.password ? <p className="mt-2 text-sm text-red-600">{errors.password.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Updating password...' : 'Reset password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
