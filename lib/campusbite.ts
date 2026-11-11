/** CampusBite shared values and small helpers. Safe to import anywhere (no secrets here). */

/** The logged-in student. Tools never take a student id as an argument. */
export const CURRENT_STUDENT_ID = "S001";

/** "13:15:00" -> "1:15 pm" */
export function formatSlot(time: string | null | undefined): string {
  if (!time) return "-";
  const [hStr, mStr = "00"] = time.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr.padStart(2, "0")} ${suffix}`;
}

/** Supabase may return a related row as an object or a one-item array. This always gives one row. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Shows rupees as "Rs 70". */
export function rs(amount: number | null | undefined): string {
  return `Rs ${amount ?? 0}`;
}

/** Order status flow used by the kitchen. */
export const NEXT_STATUS: Record<string, string> = {
  placed: "preparing",
  preparing: "ready",
  ready: "collected",
};
