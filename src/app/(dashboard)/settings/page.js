'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load settings.');
      setSettings(payload);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadSettings();
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Configuration</p>
        <h2 className="text-2xl font-semibold text-slate-900">System settings</h2>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading settings...</p>
      ) : error ? (
        <div className="flex items-center justify-between gap-4 text-sm text-red-600">
          <p role="alert">{error}</p>
          <Button variant="outline" onClick={() => { setLoading(true); void loadSettings(); }}>Retry</Button>
        </div>
      ) : settings ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Organization setup</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">Name:</span> {settings.organization.name}</p>
              <p><span className="font-medium text-slate-900">Region coverage:</span> {settings.organization.regions.join(', ') || 'No regions configured'}</p>
              <p><span className="font-medium text-slate-900">Warehouses:</span> {settings.organization.warehouses} configured</p>
              <p><span className="font-medium text-slate-900">Users:</span> {settings.organization.users} configured</p>
              <p><span className="font-medium text-slate-900">Current user:</span> {settings.user.name}</p>
            </div>
          </Card>

          <Card className="p-6">
            <CardHeader>
              <CardTitle>Access control</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">Configured roles:</span> {settings.security.roles}</p>
              <p><span className="font-medium text-slate-900">Your assigned permissions:</span> {settings.security.permissions}</p>
              <p><span className="font-medium text-slate-900">Most recent audit event:</span> {settings.security.lastAuditAt ? new Date(settings.security.lastAuditAt).toLocaleString() : 'No audit events recorded'}</p>
            </div>
          </Card>

          <Card className="p-6 md:col-span-2">
            <CardHeader>
              <CardTitle>Recent audit trail</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {settings.auditTrail?.length ? settings.auditTrail.map((item, index) => (
                <div key={`${item.action}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-slate-900">{item.action}</span>
                    <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1">User: {item.user} • Entity: {item.entityType}</p>
                </div>
              )) : <p className="text-sm text-slate-500">No recent audit actions.</p>}
            </div>
          </Card>
        </div>
      ) : <p className="text-sm text-slate-500">No settings are available for this organization.</p>}
    </div>
  );
}
