'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, CircleDot } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const payload = await response.json();
      setItems(payload?.data?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const markAsRead = async (ids = []) => {
    if (!ids.length) return;

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    await loadNotifications();
  };

  const unreadIds = items.filter((item) => !item.read).map((item) => item.id);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-violet-900 p-6 text-white shadow-[0_30px_60px_rgba(15,23,42,0.15)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-200">Operations</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Notifications</h2>
          </div>
          <Button variant="secondary" onClick={() => markAsRead(unreadIds)} className="bg-white text-slate-900 hover:bg-slate-100">
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <CardHeader className="mb-4">
          <CardTitle>Recent alerts</CardTitle>
        </CardHeader>

        {loading ? (
          <p className="text-sm text-slate-500">Loading notifications...</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-4 ${notification.read ? 'border-slate-200 bg-slate-50' : 'border-violet-200 bg-violet-50/70'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {notification.read ? (
                      <div className="mt-0.5 rounded-full bg-slate-200 p-2 text-slate-600">
                        <Bell className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="mt-0.5 rounded-full bg-violet-600 p-2 text-white">
                        <CircleDot className="h-4 w-4" />
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!notification.read && (
                    <Button variant="outline" size="sm" onClick={() => markAsRead([notification.id])}>
                      Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
