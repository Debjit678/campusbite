import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { NEXT_STATUS } from "@/lib/campusbite";
import { kitchenUpdateSchema } from "@/lib/schemas";
import { ORDER_SELECT, cleanOrder, type RawOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/kitchen -> active orders (placed, preparing, ready), oldest first */
export async function GET() {
  const { data, error } = await getSupabase()
    .from("orders")
    .select(`${ORDER_SELECT}, wallets(name)`)
    .in("status", ["placed", "preparing", "ready"])
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[GET /api/kitchen]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ orders: (data as unknown as RawOrder[]).map(cleanOrder) });
}

/** POST /api/kitchen  body: { order_id, status } -> moves an order one step forward only */
export async function POST(request: Request) {
  const parsed = kitchenUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }
  const { order_id, status } = parsed.data;
  const supabase = getSupabase();

  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", order_id)
    .maybeSingle();
  if (readError) {
    console.error("[POST /api/kitchen]", readError.message);
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: `Order ${order_id} not found` }, { status: 404 });

  // Only the next step is allowed: placed -> preparing -> ready -> collected
  if (NEXT_STATUS[order.status] !== status) {
    return NextResponse.json(
      { error: `Order ${order_id} is ${order.status}; it cannot move to ${status}.` },
      { status: 409 }
    );
  }

  // The .eq on the old status stops two clicks from racing each other.
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", order_id)
    .eq("status", order.status)
    .select("id, status")
    .maybeSingle();
  if (error) {
    console.error("[POST /api/kitchen]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Order changed, please refresh." }, { status: 409 });
  return NextResponse.json({ order: data });
}
