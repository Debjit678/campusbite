import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { CURRENT_STUDENT_ID } from "@/lib/campusbite";
import { ORDER_SELECT, cleanOrder, type RawOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/me -> the student's wallet and last 5 orders */
export async function GET() {
  const supabase = getSupabase();
  const [wallet, orders] = await Promise.all([
    supabase.from("wallets").select("student_id, name, balance").eq("student_id", CURRENT_STUDENT_ID).maybeSingle(),
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const error = wallet.error ?? orders.error;
  if (error) {
    console.error("[GET /api/me]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    wallet: wallet.data,
    orders: (orders.data as unknown as RawOrder[]).map(cleanOrder),
  });
}
