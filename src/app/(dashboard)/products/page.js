'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const emptyForm = {
  name: '',
  sku: '',
  category: 'General',
  purchasePrice: '',
  dealerPrice: '',
  retailPrice: '',
  description: '',
  isActive: true,
};

const productColumns = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Model' },
  { key: 'category', label: 'Category' },
  { key: 'purchasePrice', label: 'Purchase', render: (row) => `$${Number(row.purchasePrice || 0).toLocaleString()}` },
  { key: 'dealerPrice', label: 'Dealer', render: (row) => `$${Number(row.dealerPrice || 0).toLocaleString()}` },
  { key: 'retailPrice', label: 'Retail', render: (row) => `$${Number(row.retailPrice || 0).toLocaleString()}` },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge intent={row.status === 'Active' ? 'success' : 'warning'}>{row.status}</Badge>,
  },
];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || payload?.error || 'Unable to load products.');
      setProducts(Array.isArray(payload?.data?.data) ? payload.data.data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const query = search.toLowerCase();
    return products.filter((product) => [product.name, product.sku, product.category].join(' ').toLowerCase().includes(query));
  }, [products, search]);

  const totalCatalogValue = products.reduce((sum, product) => sum + Number(product.retailPrice || 0), 0);
  const activeProducts = products.filter((product) => product.status === 'Active').length;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          purchasePrice: Number(form.purchasePrice),
          dealerPrice: Number(form.dealerPrice),
          retailPrice: Number(form.retailPrice),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || payload?.error || 'Unable to create product.');
      }

      setForm(emptyForm);
      setShowForm(false);
      await loadProducts();
    } catch (error) {
      alert(error.message || 'Unable to create product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-[0_30px_60px_rgba(15,23,42,0.15)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-200">Catalog & pricing</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Product management</h2>
          </div>
          <Button variant="secondary" onClick={() => setShowForm((value) => !value)} className="bg-white text-slate-900 hover:bg-slate-100">
            {showForm ? 'Close form' : 'Add product'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Total SKUs</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{products.length}</div>
        </Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Active models</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">{activeProducts}</div>
        </Card>
        <Card className="border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Catalog value</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-sky-700">${Number(totalCatalogValue || 0).toLocaleString()}</div>
        </Card>
      </div>

      {showForm && (
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Add scooter model</CardTitle>
          </CardHeader>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Product name</label>
              <Input name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">SKU</label>
              <Input name="sku" value={form.sku} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Category</label>
              <Input name="category" value={form.category} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Purchase price</label>
              <Input name="purchasePrice" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Dealer price</label>
              <Input name="dealerPrice" type="number" min="0" step="0.01" value={form.dealerPrice} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Retail price</label>
              <Input name="retailPrice" type="number" min="0" step="0.01" value={form.retailPrice} onChange={handleChange} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 shadow-inner shadow-slate-100 outline-none transition duration-200 placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                placeholder="Optional model specification and customer-facing notes"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                Active product
              </label>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save product'}</Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <CardHeader className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>Catalog overview</CardTitle>
          <div className="w-full max-w-sm">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product, category, or SKU" />
          </div>
        </CardHeader>

        {loading ? <p className="text-sm text-slate-500">Loading product catalog...</p> : <DataTable columns={productColumns} rows={filteredProducts} emptyMessage="No products found." />}
      </Card>
    </div>
  );
}
