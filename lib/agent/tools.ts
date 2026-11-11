import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";
import { CURRENT_STUDENT_ID, formatSlot, one } from "../campusbite";

/*
 * CampusBite agent tools.
 * Read tools (the agent's eyes): getMenu, getWalletBalance, getPickupSlots, getMyOrders
 * Write tools (the agent's hands): placeOrder, cancelOrder
 * Writes go through the database functions place_order / cancel_order, which check
 * balance, stock, slot and the 5-item limit, and change everything together or nothing.
 */

type OrderRow = {
  id: number;
  status: string;
  total: number;
  created_at: string;
  pickup_slots: { slot_time: string } | { slot_time: string }[] | null;
  order_items:
    | {
        quantity: number;
        menu_items: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

// ---------------------------------------------------------------- read tools

const getMenu = defineTool({
  name: "getMenu",
  description:
    "Use this when the student asks what food is available, wants suggestions, or before placing an order to get real item ids and prices. Returns only items in stock.",
  schema: z.object({
    category: z
      .enum(["meal", "snack", "drink", "sweet"])
      .optional()
      .describe("Only this category: meal, snack, drink or sweet"),
    veg_only: z.boolean().optional().describe("true to return only vegetarian items"),
    max_price: z.number().int().positive().optional().describe("Highest price per item in rupees, for example 80"),
  }),
  run: async ({ category, veg_only, max_price }) => {
    let query = getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, description")
      .gt("stock", 0)
      .order("category")
      .order("price");
    if (category) query = query.eq("category", category);
    if (veg_only) query = query.eq("is_veg", true);
    if (max_price) query = query.lte("price", max_price);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data.length, items: data };
  },
});

const getWalletBalance = defineTool({
  name: "getWalletBalance",
  description: "Use this when you need the student's wallet balance, for example before placing an order.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Wallet not found.");
    return data;
  },
});

const getPickupSlots = defineTool({
  name: "getPickupSlots",
  description:
    "Use this when you need today's pickup times and their slot ids, for example before placing an order. Returns only slots with free places.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("pickup_slots")
      .select("id, slot_time, capacity, booked")
      .order("slot_time");
    if (error) throw new Error(error.message);
    const slots = data
      .map((s) => ({ slot_id: s.id, time: formatSlot(s.slot_time), free: s.capacity - s.booked }))
      .filter((s) => s.free > 0);
    return { count: slots.length, slots };
  },
});

const getMyOrders = defineTool({
  name: "getMyOrders",
  description:
    "Use this when the student asks about their orders, order status, or wants to cancel an order and you need the order id.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("orders")
      .select("id, status, total, created_at, pickup_slots(slot_time), order_items(quantity, menu_items(name))")
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    const orders = (data as unknown as OrderRow[]).map((o) => ({
      order_id: o.id,
      status: o.status,
      total: o.total,
      pickup_time: formatSlot(one(o.pickup_slots)?.slot_time),
      items: (o.order_items ?? []).map((i) => `${i.quantity} x ${one(i.menu_items)?.name ?? "item"}`),
    }));
    return { count: orders.length, orders };
  },
});

// ---------------------------------------------------------------- write tools

const placeOrder = defineTool({
  name: "placeOrder",
  description:
    "Use this when the student wants to order food. Needs real menu item ids from getMenu and a real slot id from getPickupSlots. Pays from the wallet.",
  writes: true,
  schema: z.object({
    items: z
      .array(
        z.object({
          menu_item_id: z.number().int().positive().describe("The menu item id from getMenu"),
          quantity: z.number().int().min(1).max(5).describe("How many, 1 to 5"),
        })
      )
      .min(1)
      .describe("The items to order"),
    slot_id: z.number().int().positive().describe("The pickup slot id from getPickupSlots"),
  }),
  run: async ({ items, slot_id }) => {
    // The database function checks balance, stock, slot and the 5-item limit.
    const { data, error } = await getSupabase().rpc("place_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_slot_id: slot_id,
      p_items: items,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

const cancelOrder = defineTool({
  name: "cancelOrder",
  description:
    "Use this only when the student clearly asks to cancel an order. Needs the order id from getMyOrders. Works only before the kitchen starts preparing.",
  writes: true,
  schema: z.object({
    order_id: z.number().int().positive().describe("The order id from getMyOrders"),
  }),
  run: async ({ order_id }) => {
    // The database function refunds the wallet, returns stock and frees the slot.
    const { data, error } = await getSupabase().rpc("cancel_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_order_id: order_id,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

/** Every tool in this list is given to Gemini. */
export const tools: AgentTool[] = [
  getMenu,
  getWalletBalance,
  getPickupSlots,
  getMyOrders,
  placeOrder,
  cancelOrder,
];
