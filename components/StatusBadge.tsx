/** Coloured badge for an order status. */
const STYLES: Record<string, string> = {
  placed: "bg-sky-100 text-sky-800",
  preparing: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-800",
  collected: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STYLES[status] ?? STYLES.collected}`}>
      {status}
    </span>
  );
}
