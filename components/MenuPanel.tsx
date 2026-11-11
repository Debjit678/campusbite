"use client";

import { useEffect, useState } from "react";

type Item = { id: number; name: string; category: string; price: number; is_veg: boolean; stock: number };

const GROUPS = [
  { key: "meal", label: "Meals" },
  { key: "snack", label: "Snacks" },
  { key: "sweet", label: "Sweets" },
  { key: "drink", label: "Drinks" },
];

/** Today's menu with live stock. Reloads every 5 seconds. */
export default function MenuPanel({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/menu", { cache: "no-store" })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Could not load menu");
          if (alive) {
            setItems(json.items);
            setError("");
          }
        })
        .catch((err) => alive && setError(err.message));
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refreshKey]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">Today&apos;s menu</h2>
        <p className="text-xs text-slate-500">Live stock from the canteen</p>
      </div>
      {error && <p className="p-4 text-sm text-red-600">{error}</p>}
      <div className="divide-y divide-slate-100">
        {GROUPS.map((g) => {
          const rows = items.filter((i) => i.category === g.key);
          if (rows.length === 0) return null;
          return (
            <div key={g.key} className="px-4 py-2">
              <p className="py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.label}</p>
              <ul>
                {rows.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        title={i.is_veg ? "Veg" : "Non-veg"}
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${i.is_veg ? "bg-emerald-500" : "bg-red-500"}`}
                      />
                      <span className={i.stock === 0 ? "truncate text-slate-400 line-through" : "truncate"}>
                        {i.name}
                      </span>
                      {i.stock === 0 ? (
                        <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[11px] text-red-700">Sold out</span>
                      ) : i.stock <= 3 ? (
                        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">
                          Only {i.stock} left
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-medium">Rs {i.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
