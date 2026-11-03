'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Banknote, Boxes, MapPinned, Phone, ShieldCheck, Store } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DealerDetailPage() {
  const params = useParams();
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`/api/dealers/${params.id}`);
        const payload = await response.json();
        setDealer(payload?.data || null);
      } catch {
        setDealer(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading dealer profile...</p>;
  }

  if (!dealer) {
    return <p className="text-sm text-slate-500">Dealer not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dealers" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <p className="text-sm text-slate-500">Dealer profile</p>
            <h2 className="text-2xl font-semibold text-slate-900">{dealer.name}</h2>
          </div>
        </div>
        <Badge intent={dealer.status === 'active' ? 'success' : 'warning'}>{dealer.status}</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Dealer information</CardTitle>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Registration</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{dealer.registrationNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Region</p>
              <p className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-900"><MapPinned className="h-4 w-4 text-emerald-600" /> {dealer.region}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Primary contact</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{dealer.contactPerson}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Email</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{dealer.contactEmail}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Phone</p>
              <p className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-900"><Phone className="h-4 w-4 text-emerald-600" /> {dealer.phone}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Address</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{dealer.address}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <CardTitle>Financial snapshot</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500"><Banknote className="h-4 w-4" /> Credit limit</div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">${Number(dealer.creditLimit).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500"><ShieldCheck className="h-4 w-4" /> Outstanding balance</div>
              <p className="mt-2 text-2xl font-semibold text-rose-600">${Number(dealer.outstandingBalance).toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3 text-slate-500"><Boxes className="h-5 w-5 text-emerald-600" /> Sales</div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{dealer.sales}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 text-slate-500"><Banknote className="h-5 w-5 text-sky-600" /> Payments</div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{dealer.payments}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 text-slate-500"><ShieldCheck className="h-5 w-5 text-amber-600" /> Returns</div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{dealer.returns}</p>
        </Card>
      </div>

      <Card className="p-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dealer showrooms</CardTitle>
          <Link href="/showrooms" className="text-sm font-medium text-emerald-800 hover:underline">Manage showrooms</Link>
        </CardHeader>
        {dealer.showrooms?.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dealer.showrooms.map((showroom) => (
              <Link key={showroom.id} href={`/showrooms/${showroom.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-emerald-300">
                <span className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-emerald-700" />
                  <span><span className="block font-medium text-slate-900">{showroom.name}</span><span className="text-xs text-slate-500">{showroom.code}</span></span>
                </span>
                <Badge intent={showroom.status === 'active' ? 'success' : 'warning'}>{showroom.status}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No showrooms are assigned to this dealer yet.</p>
        )}
      </Card>
    </div>
  );
}
