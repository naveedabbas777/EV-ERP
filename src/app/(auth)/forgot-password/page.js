'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { forgotPasswordSchema } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    try {
      const parsed = forgotPasswordSchema.safeParse(data);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message || 'Please enter a valid email address.');
        return;
      }

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to process your password reset request.');
      }

      if (payload.token) {
        setResetToken(payload.token);
      }

      toast.success(payload.message || 'Password reset request sent.');
    } catch (error) {
      toast.error(error.message || 'Unable to process your password reset request.');
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
          <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Password reset</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Forgot your password?</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                className="pl-10"
                placeholder="name@company.com"
                {...register('email')}
              />
            </div>
            {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
          </Button>
        </form>

        {resetToken ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <p className="font-medium">Development reset token</p>
            <p className="mt-2 break-all rounded-lg bg-white/80 px-3 py-2 font-mono text-xs">{resetToken}</p>
            <Link href={`/reset-password?token=${encodeURIComponent(resetToken)}`} className="mt-3 inline-block font-medium text-emerald-700 underline underline-offset-2">
              Open reset form
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
