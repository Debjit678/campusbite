import "server-only";
import { formatSlot, one } from "./campusbite";

/** Raw order row as Supabase returns it (related rows can be an object or an array). */
export type RawOrder = {
  id: number;
  student_id: string;
  status: string;
  total: number;
  created_at: string;
  pickup_slots: { slot_time: string } | { slot_time: string }[] | null;
  wallets?: { name: string } | { name: string }[] | null;
  order_items:
    | { quantity: number; price: number; menu_items: { name: string } | { name: string }[] | null }[]
    | null;
};

/** Columns to select for an order with its pickup time and item names. */
export const ORDER_SELECT =
  "id, student_id, status, total, created_at, pickup_slots(slot_time), order_items(quantity, price, menu_items(name))";

/** Turns a raw row into a small, clean object for the screens. */
export function cleanOrder(o: RawOrder) {
  const slotTime = one(o.pickup_slots)?.slot_time ?? null;
  return {
    id: o.id,
    student_id: o.student_id,
    student_name: one(o.wallets)?.name ?? o.student_id,
    status: o.status,
    total: o.total,
    created_at: o.created_at,
    slot_time: slotTime,
    pickup_time: formatSlot(slotTime),
    items: (o.order_items ?? []).map((i) => ({
      name: one(i.menu_items)?.name ?? "Item",
      quantity: i.quantity,
      price: i.price,
    })),
  };
}

export type CleanOrder = ReturnType<typeof cleanOrder>;
