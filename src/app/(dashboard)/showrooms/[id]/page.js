'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const emptySale = { productId: '', quantity: '1', customerName: '', customerPhone: '', paidAmount: '', paymentMethod: 'cash' };
const emptyExpense = { title: '', category: '', amount: '' };
const emptyPayment = { saleId: '', amount: '', paymentMethod: 'cash' };

export default function ShowroomDetailPage() {
  const { id } = useParams();
  const [showroom, setShowroom] = useState(null);
  const [capabilities, setCapabilities] = useState({});
  const [saleForm, setSaleForm] = useState(emptySale);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const loadShowroom = useCallback(async () => {
    try {
      const response = await fetch(`/api/showrooms/${id}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load showroom.');
      setShowroom(payload?.data || null);
      setCapabilities(payload?.capabilities || {});
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load showroom.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void (async () => {
      await loadShowroom();
    })();
  }, [loadShowroom]);

  const availableProducts = useMemo(
    () => (showroom?.warehouse?.inventory || []).filter((item) => item.quantity - item.reservedStock > 0),
    [showroom],
  );
  const selectedProduct = availableProducts.find((item) => item.productId === saleForm.productId);
  const saleEstimate = selectedProduct ? Number(selectedProduct.retailPrice) * Number(saleForm.quantity || 0) : 0;
  const unpaidSales = (showroom?.retailSales || []).filter((sale) => sale.totalAmount > sale.paidAmount);

  const submitSale = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const response = await fetch(`/api/showrooms/${id}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId: saleForm.productId, quantity: Number(saleForm.quantity) }],
          customerName: saleForm.customerName,
          customerPhone: saleForm.customerPhone,
          paidAmount: saleForm.paidAmount || '0',
          paymentMethod: saleForm.paymentMethod,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to record retail sale.');
      setSaleForm(emptySale);
      await loadShowroom();
    } catch (submitError) {
      setFormError(submitError.message || 'Unable to record retail sale.');
    } finally {
      setSaving(false);
    }
  };

  const submitExpense = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const response = await fetch(`/api/showrooms/${id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to submit expense.');
      setExpenseForm(emptyExpense);
      await loadShowroom();
    } catch (submitError) {
      setFormError(submitError.message || 'Unable to submit expense.');
    } finally {
      setSaving(false);
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const response = await fetch(`/api/showrooms/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to record customer payment.');
      setPaymentForm(emptyPayment);
      await loadShowroom();
    } catch (submitError) {
      setFormError(submitError.message || 'Unable to record customer payment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading showroom activity...</p>;
  if (error || !showroom) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        <p>{error || 'Showroom not found.'}</p>
        <Button className="mt-3" variant="outline" onClick={() => { setLoading(true); void loadShowroom(); }}>Try again</Button>
      </div>
    );
  }

  const retailSaleColumns = [
    { key: 'invoiceNumber', label: 'Receipt' },
    { key: 'customerName', label: 'Customer' },
    { key: 'totalAmount', label: 'Total', render: (row) => `PKR ${Number(row.totalAmount).toLocaleString()}` },
    { key: 'paidAmount', label: 'Received', render: (row) => `PKR ${Number(row.paidAmount).toLocaleString()}` },
    { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];
  const orderColumns = [
    { key: 'orderNumber', label: 'Order' },
    { key: 'status', label: 'Status', render: (row) => <Badge intent={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>{row.status}</Badge> },
    { key: 'totalAmount', label: 'Total', render: (row) => `PKR ${Number(row.totalAmount).toLocaleString()}` },
    { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];
  const inventoryColumns = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Product' },
    { key: 'quantity', label: 'On hand' },
    { key: 'reservedStock', label: 'Reserved' },
    { key: 'reorderLevel', label: 'Reorder at' },
  ];
  const paymentColumns = [
    { key: 'paymentNumber', label: 'Payment' },
    { key: 'amount', label: 'Amount', render: (row) => `PKR ${Number(row.amount).toLocaleString()}` },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];
  const retailPaymentColumns = [
    { key: 'invoiceNumber', label: 'Receipt' },
    { key: 'amount', label: 'Amount received', render: (row) => `PKR ${Number(row.amount).toLocaleString()}` },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'referenceNo', label: 'Reference', render: (row) => row.referenceNo || '—' },
    { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];
  const returnColumns = [
    { key: 'id', label: 'Return' },
    { key: 'status', label: 'Status' },
    { key: 'items', label: 'Items', render: (row) => row.items.map((item) => `${item.product} × ${item.quantity}`).join(', ') },
    { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];
  const staffColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'isActive', label: 'Status', render: (row) => <Badge intent={row.isActive ? 'success' : 'warning'}>{row.isActive ? 'Active' : 'Inactive'}</Badge> },
  ];
  const expenseColumns = [
    { key: 'title', label: 'Expense' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', render: (row) => `PKR ${Number(row.amount).toLocaleString()}` },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/showrooms" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <ArrowLeft className="h-4 w-4" /> Showrooms
          </Link>
          <div>
            <p className="text-sm text-slate-500">{showroom.dealer.name} · {showroom.code}</p>
            <h2 className="text-2xl font-semibold text-slate-900">{showroom.name}</h2>
          </div>
        </div>
        <Badge intent={showroom.status === 'active' ? 'success' : 'warning'}>{showroom.status}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-sm text-slate-500">Retail sales</p><p className="mt-2 text-2xl font-semibold">{showroom.summary.retailSalesCount}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-500">Retail revenue</p><p className="mt-2 text-2xl font-semibold">PKR {Number(showroom.summary.retailRevenue).toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-500">Stock units</p><p className="mt-2 text-2xl font-semibold">{showroom.summary.stockUnits}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-500">Dealer orders</p><p className="mt-2 text-2xl font-semibold">{showroom.summary.orderCount}</p></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {capabilities.canCreateOrders ? <Link className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white" href={`/orders?showroomId=${showroom.id}`}>Create dealer order</Link> : null}
        {capabilities.canCreateReturns ? <Link className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" href={`/returns?showroomId=${showroom.id}`}>Create return request</Link> : null}
        {capabilities.canManage ? <Link className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/inventory/transfers">Transfer showroom stock</Link> : null}
        {capabilities.canManageStaff ? <Link className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/users">Manage staff logins</Link> : null}
      </div>

      {capabilities.canCreateSales ? (
        <Card className="p-6">
          <CardHeader><CardTitle>Record customer sale</CardTitle></CardHeader>
          <form className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={submitSale}>
            <select required aria-label="Product" value={saleForm.productId} onChange={(event) => setSaleForm((current) => ({ ...current, productId: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="">Select stocked product</option>
              {availableProducts.map((item) => <option key={item.productId} value={item.productId}>{item.name} · {item.sku} · {item.quantity - item.reservedStock} available</option>)}
            </select>
            <Input required type="number" min="1" step="1" max={selectedProduct ? selectedProduct.quantity - selectedProduct.reservedStock : undefined} value={saleForm.quantity} onChange={(event) => setSaleForm((current) => ({ ...current, quantity: event.target.value }))} />
            <Input maxLength={191} placeholder="Customer name (optional)" value={saleForm.customerName} onChange={(event) => setSaleForm((current) => ({ ...current, customerName: event.target.value }))} />
            <Input maxLength={50} placeholder="Customer phone (optional)" value={saleForm.customerPhone} onChange={(event) => setSaleForm((current) => ({ ...current, customerPhone: event.target.value }))} />
            <Input type="number" min="0" step="0.01" max={saleEstimate} placeholder="Amount received now" value={saleForm.paidAmount} onChange={(event) => setSaleForm((current) => ({ ...current, paidAmount: event.target.value }))} />
            <select aria-label="Payment method" value={saleForm.paymentMethod} onChange={(event) => setSaleForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="cash">Cash</option><option value="card">Card</option><option value="bank-transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="mobile-wallet">Mobile wallet</option>
            </select>
            <div className="flex items-center gap-3 sm:col-span-2 xl:col-span-3">
              <Button type="submit" disabled={saving || !availableProducts.length}>{saving ? 'Saving...' : 'Record sale'}</Button>
              <span className="text-sm text-slate-500">Price from catalog: PKR {Number(saleEstimate || 0).toLocaleString()}</span>
            </div>
          </form>
          {!availableProducts.length ? <p className="mt-3 text-sm text-amber-700">No saleable stock is available in this showroom.</p> : null}
        </Card>
      ) : null}

      {capabilities.canManageExpenses ? (
        <Card className="p-6">
          <CardHeader><CardTitle>Submit showroom expense</CardTitle></CardHeader>
          <form className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" onSubmit={submitExpense}>
            <Input required maxLength={191} placeholder="Expense description" value={expenseForm.title} onChange={(event) => setExpenseForm((current) => ({ ...current, title: event.target.value }))} />
            <Input required maxLength={100} placeholder="Category" value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))} />
            <Input required type="number" min="0.01" step="0.01" placeholder="Amount (PKR)" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} />
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Submit expense'}</Button>
          </form>
          <p className="mt-2 text-xs text-slate-500">New expenses are submitted as pending for review.</p>
        </Card>
      ) : null}

      {capabilities.canCreateSales && unpaidSales.length ? (
        <Card className="p-6">
          <CardHeader><CardTitle>Collect customer payment</CardTitle></CardHeader>
          <form className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" onSubmit={submitPayment}>
            <select required aria-label="Sale to collect" value={paymentForm.saleId} onChange={(event) => setPaymentForm((current) => ({ ...current, saleId: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="">Select sale with balance</option>
              {unpaidSales.map((sale) => <option key={sale.id} value={sale.id}>{sale.invoiceNumber} · Due PKR {(sale.totalAmount - sale.paidAmount).toLocaleString()}</option>)}
            </select>
            <Input required type="number" min="0.01" step="0.01" placeholder="Amount received" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} />
            <select aria-label="Payment method" value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="cash">Cash</option><option value="card">Card</option><option value="bank-transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="mobile-wallet">Mobile wallet</option>
            </select>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Record payment'}</Button>
          </form>
        </Card>
      ) : null}

      {formError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{formError}</p> : null}

      <Card className="p-6">
        <CardHeader><CardTitle>Showroom stock</CardTitle></CardHeader>
        <div className="mt-4"><DataTable columns={inventoryColumns} rows={showroom.warehouse?.inventory || []} emptyMessage="No products are stocked in this showroom." /></div>
      </Card>

      <Card className="p-6">
        <CardHeader><CardTitle>Customer retail sales</CardTitle></CardHeader>
        <div className="mt-4"><DataTable columns={retailSaleColumns} rows={showroom.retailSales} emptyMessage="No customer sales recorded yet." /></div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <CardHeader><CardTitle>Dealer orders</CardTitle></CardHeader>
          <div className="mt-4"><DataTable columns={orderColumns} rows={showroom.orders} emptyMessage="No orders for this showroom." /></div>
        </Card>
        <Card className="p-6">
          <CardHeader><CardTitle>Payments to company</CardTitle></CardHeader>
          <div className="mt-4"><DataTable columns={paymentColumns} rows={showroom.payments} emptyMessage="No company payments recorded for this showroom." /></div>
        </Card>
        <Card className="p-6">
          <CardHeader><CardTitle>Customer payment receipts</CardTitle></CardHeader>
          <div className="mt-4"><DataTable columns={retailPaymentColumns} rows={showroom.retailPayments} emptyMessage="No customer payments recorded for this showroom." /></div>
        </Card>
        <Card className="p-6">
          <CardHeader><CardTitle>Returns</CardTitle></CardHeader>
          <div className="mt-4"><DataTable columns={returnColumns} rows={showroom.returns} emptyMessage="No return requests for this showroom." /></div>
        </Card>
        <Card className="p-6">
          <CardHeader><CardTitle>Showroom staff accounts</CardTitle></CardHeader>
          <div className="mt-4"><DataTable columns={staffColumns} rows={showroom.staffUsers} emptyMessage="No showroom staff accounts are assigned." /></div>
        </Card>
        <Card className="p-6 xl:col-span-2">
          <CardHeader><CardTitle>Showroom expenses</CardTitle></CardHeader>
          <div className="mt-4"><DataTable columns={expenseColumns} rows={showroom.expenses} emptyMessage="No showroom expenses have been submitted." /></div>
        </Card>
      </div>
    </div>
  );
}
