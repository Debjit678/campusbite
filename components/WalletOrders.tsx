"use client";

import { useEffect, useState } from "react";
import StatusBadge from "./StatusBadge";

type Order = {
  id: number;
  status: string;
  total: number;
  pickup_time: string;
  items: { name: string; quantity: number }[];
};
type MeData = { wallet: { name: string; balance: number } | null; orders: Order[] };

/** Dark card: wallet balance and the student's orders. Reloads every 5 seconds. */
export default function WalletOrders({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<MeData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/me", { cache: "no-store" })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Could not load wallet");
          if (alive) {
            setData(json);
            setError("");
          }
        })
        .catch((err) => alive && setError(err.message));
    load();
    const timer = setInterval(load, 5000); // picks up kitchen status changes
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refreshKey]);

  return (
    <div className="rounded-xl bg-slate-900 p-4 text-white shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-400">Wallet</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold">Rs {data?.wallet?.balance ?? "–"}</p>
        <p className="text-sm text-slate-300">{data?.wallet?.name ?? ""} · S001</p>
      </div>

      <p className="mt-4 border-t border-slate-700 pt-3 text-sm font-semibold">My orders today</p>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      {!error && data && data.orders.length === 0 && (
        <p className="mt-2 text-sm text-slate-400">No orders yet. Ask the agent for lunch!</p>
      )}
      <ul className="mt-2 space-y-2">
        {data?.orders.map((o) => (
          <li key={o.id} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                #{o.id} · {o.pickup_time}
              </span>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-1 flex justify-between gap-2 text-xs text-slate-300">
              <span>{o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</span>
              <span className="shrink-0 font-medium text-white">Rs {o.total}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
