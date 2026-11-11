"use client";

import { useEffect, useState } from "react";

type Order = {
  id: number;
  student_name: string;
  status: string;
  total: number;
  pickup_time: string;
  items: { name: string; quantity: number }[];
};

const COLUMNS = [
  { status: "placed", title: "New orders", next: "preparing", button: "Start preparing", accent: "border-sky-500" },
  { status: "preparing", title: "Preparing", next: "ready", button: "Mark ready", accent: "border-amber-500" },
  { status: "ready", title: "Ready for pickup", next: "collected", button: "Collected", accent: "border-emerald-500" },
];

/* Kitchen board: live orders in 3 columns. Reloads every 3 seconds. */
export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/kitchen", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load orders");
      setOrders(json.orders);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, []);

  async function move(order_id: number, status: string) {
    setBusy(order_id);
    try {
      const res = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id, status }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Update failed");
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">CampusBite Kitchen</h1>
          <p className="text-sm text-slate-400">SRM canteen · today&apos;s live orders</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live
        </span>
      </header>
      {error && <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="rounded-xl bg-slate-900 p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 font-semibold">
                {col.title}
                <span className="rounded-full bg-slate-800 px-2 text-sm text-slate-300">{list.length}</span>
              </h2>
              <div className="space-y-3">
                {list.length === 0 && <p className="px-1 text-sm text-slate-500">No orders</p>}
                {list.map((o) => (
                  <article key={o.id} className={`rounded-lg border-l-4 bg-slate-800 p-3 ${col.accent}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">#{o.id}</span>
                      <span className="rounded bg-slate-700 px-2 py-0.5 text-sm">{o.pickup_time}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{o.student_name}</p>
                    <ul className="mt-2 space-y-0.5 text-sm">
                      {o.items.map((i, idx) => (
                        <li key={idx}>
                          {i.quantity} × {i.name}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Rs {o.total}</span>
                      <button
                        onClick={() => move(o.id, col.next)}
                        disabled={busy === o.id}
                        className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200 disabled:opacity-50"
                      >
                        {col.button}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
