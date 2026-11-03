import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { advanceOrderStatus } from "@/app/orders/actions";

const statuses: Record<string, { label: string; color: string }> = {
  new: { label: "Dalab cusub", color: "bg-blue-50 text-blue-800 border-blue-200" },
  fabric_ready: { label: "Marada waa diyaar", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  cutting: { label: "Jarista ayaa socota", color: "bg-amber-50 text-amber-800 border-amber-200" },
  sewing: { label: "Tolidda ayaa socota", color: "bg-purple-50 text-purple-800 border-purple-200" },
  finished: { label: "Dharku waa diyaar", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  delivered: { label: "Macmiilka ayaa la siiyey", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

const garmentNames: Record<string, string> = { shirt: "Shaati", trousers: "Surwaal" };

function shortDate(value: string) {
  try {
    return new Intl.DateTimeFormat("so-SO", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
  } catch {
    return value;
  }
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; filter?: string }>;
}) {
  const query = await searchParams;
  const currentFilter = query.filter ?? "all";
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", claims.sub)
    .eq("status", "active");

  const membership =
    memberships?.find((item: { business_id: string }) => item.business_id === query.business) ??
    memberships?.[0];

  if (!membership) redirect("/dashboard");

  let ordersQuery = supabase
    .from("orders")
    .select("id, customer_id, status, ordered_at, pickup_at, assigned_to_user_id, created_at")
    .eq("business_id", membership.business_id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (currentFilter === "new") {
    ordersQuery = ordersQuery.eq("status", "new");
  } else if (currentFilter === "in_progress") {
    ordersQuery = ordersQuery.in("status", ["fabric_ready", "cutting", "sewing"]);
  } else if (currentFilter === "finished") {
    ordersQuery = ordersQuery.eq("status", "finished");
  } else if (currentFilter === "delivered") {
    ordersQuery = ordersQuery.eq("status", "delivered");
  }

  const [{ data: orders, error }, { data: business }] = await Promise.all([
    ordersQuery,
    supabase.from("businesses").select("name").eq("id", membership.business_id).maybeSingle(),
  ]);

  const customerIds = [...new Set((orders ?? []).map((o) => o.customer_id))];
  const orderIds = (orders ?? []).map((o) => o.id);
  const assignedStaffIds = [...new Set((orders ?? []).map((o) => o.assigned_to_user_id).filter(Boolean))];

  const [{ data: customers }, { data: items }, { data: files }, { data: staffProfiles }] = await Promise.all([
    customerIds.length
      ? supabase.from("customers").select("id, name, phone").in("id", customerIds)
      : { data: [] },
    orderIds.length
      ? supabase.from("order_items").select("order_id, garment, quantity, measurement_snapshot").in("order_id", orderIds)
      : { data: [] },
    orderIds.length
      ? supabase.from("order_files").select("id, order_id, object_path, kind").in("order_id", orderIds).eq("upload_state", "uploaded")
      : { data: [] },
    assignedStaffIds.length
      ? supabase.from("profiles").select("user_id, display_name").in("user_id", assignedStaffIds)
      : { data: [] },
  ]);

  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));
  const itemMap = new Map((items ?? []).map((i) => [i.order_id, i]));
  const staffMap = new Map((staffProfiles ?? []).map((p) => [p.user_id, p.display_name]));

  // Signed URLs for thumbnails
  const filesWithUrls = await Promise.all(
    (files ?? []).slice(0, 40).map(async (f) => {
      const { data: urlData } = await supabase.storage.from("order-files").createSignedUrl(f.object_path, 900);
      return { ...f, signedUrl: urlData?.signedUrl };
    })
  );
  const fileMap = new Map<string, { kind: string; signedUrl?: string }>();
  for (const f of filesWithUrls) {
    if (!fileMap.has(f.order_id) || f.kind === "fabric") {
      fileMap.set(f.order_id, f);
    }
  }

  const filterTabs = [
    { key: "all", label: "Dhammaan" },
    { key: "new", label: "🌟 Cusub" },
    { key: "in_progress", label: "✂️ Tolidda socota" },
    { key: "finished", label: "✓ Waa Diyaar" },
    { key: "delivered", label: "📦 La Bixiyey" },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-8 sm:py-8 bg-slate-50/50">
      <Link href={`/dashboard?business=${membership.business_id}`} className="text-sm font-semibold text-[#0F6B7A]">
        ← Dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{business?.name ?? "Wiilhoog"}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122E40]">Dalabyada Tolidda</h1>
        </div>
        {membership.role === "business_admin" && (
          <Link
            href={`/orders/new?business=${membership.business_id}`}
            className="rounded-xl bg-[#0F6B7A] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0c5763] transition active:scale-95"
          >
            + Dalab cusub
          </Link>
        )}
      </div>

      {/* FILTER TABS */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/orders?business=${membership.business_id}&filter=${tab.key}`}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition ${
              currentFilter === tab.key
                ? "bg-[#122E40] text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ORDER CARDS */}
      <section className="mt-6">
        {error ? (
          <div className="rounded-2xl bg-white p-8 text-center text-red-700 shadow-sm">
            Dalabyada lama soo qaadi karin.
          </div>
        ) : !orders?.length ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <span className="text-4xl">✂️</span>
            <p className="mt-2 text-base font-bold text-slate-700">Dalabyo lama helin qaybtaan</p>
            <p className="mt-1 text-xs text-slate-400">Wax dalab ah kuma jiraan shaandhada la doortay.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              const customer = customerMap.get(order.customer_id);
              const item = itemMap.get(order.id);
              const file = fileMap.get(order.id);
              const statusMeta = statuses[order.status] ?? {
                label: order.status,
                color: "bg-slate-100 text-slate-700 border-slate-200",
              };
              const assignedName = order.assigned_to_user_id ? staffMap.get(order.assigned_to_user_id) : null;
              const isAssignedToMe = order.assigned_to_user_id === claims.sub;

              const rawPhone = customer?.phone?.replace(/\D/g, "") ?? "";
              const phoneFormatted = rawPhone.startsWith("252")
                ? rawPhone
                : rawPhone.startsWith("0")
                ? `252${rawPhone.slice(1)}`
                : rawPhone.length === 9
                ? `252${rawPhone}`
                : rawPhone;

              const whatsappUrl = phoneFormatted
                ? `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(
                    `Asc ${customer?.name ?? "Macmiil"}, dalabkaagii #${order.id.slice(0, 8)} ee ${business?.name ?? "Wiilhoog"} xaaladdiisu waa "${statusMeta.label}". Qaadashadu waa ${order.pickup_at}.`
                  )}`
                : null;

              return (
                <div
                  key={order.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#0F6B7A]/60 hover:shadow-md"
                >
                  <div>
                    {/* Top Row: Status badge & ID */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                      <span className="font-mono text-xs text-slate-400">#{order.id.slice(0, 8)}</span>
                    </div>

                    {/* Customer & Phone & WhatsApp */}
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 leading-tight">
                          {customer?.name ?? "Macmiil"}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{customer?.phone}</p>
                      </div>
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-lg bg-[#25D366]/10 px-2 py-1 text-xs font-bold text-emerald-800 hover:bg-[#25D366]/20 transition"
                          title="U dir WhatsApp"
                        >
                          💬 WA
                        </a>
                      )}
                    </div>

                    {/* Garment details & Thumbnail preview */}
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-[#122E40]">
                          {item ? garmentNames[item.garment] ?? item.garment : "Dhar"} (Tirada: {item?.quantity ?? 1})
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Qaadasho: <strong>{shortDate(order.pickup_at)}</strong>
                        </p>
                      </div>

                      {file?.signedUrl ? (
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
                          <img
                            src={file.signedUrl}
                            alt="Maro"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-300">
                          Sawir la&apos;aan
                        </div>
                      )}
                    </div>

                    {/* Letter Measurements badges */}
                    {item?.measurement_snapshot && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {Object.entries(item.measurement_snapshot).slice(0, 5).map(([key, val]) => (
                          <span
                            key={key}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700"
                          >
                            {key}: {val as number} cm
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Assigned Tailor Info */}
                    <div className="mt-3 text-xs text-slate-500">
                      {assignedName ? (
                        <span className={`inline-flex items-center gap-1 font-semibold ${isAssignedToMe ? "text-teal-700 font-bold" : "text-slate-600"}`}>
                          ✂️ Toliyaha: {assignedName} {isAssignedToMe && "(Adiga)"}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Baaqi (Qofna looma qoondayn)</span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Footer Actions */}
                  <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between">
                    <Link
                      href={`/orders/${order.id}?business=${membership.business_id}`}
                      className="text-xs font-bold text-[#0F6B7A] hover:underline"
                    >
                      Eeg Dalabka →
                    </Link>

                    {order.status !== "delivered" && (
                      <form action={advanceOrderStatus}>
                        <input type="hidden" name="business_id" value={membership.business_id} />
                        <input type="hidden" name="order_id" value={order.id} />
                        <input
                          type="hidden"
                          name="next_status"
                          value={
                            order.status === "new"
                              ? "fabric_ready"
                              : order.status === "fabric_ready"
                              ? "cutting"
                              : order.status === "cutting"
                              ? "sewing"
                              : order.status === "sewing"
                              ? "finished"
                              : "delivered"
                          }
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs font-bold text-[#0F6B7A] hover:bg-teal-100 transition active:scale-95"
                        >
                          {order.status === "new"
                            ? "Marada diyaar"
                            : order.status === "fabric_ready"
                            ? "Bilow Jarista"
                            : order.status === "cutting"
                            ? "Bilow Tolidda"
                            : order.status === "sewing"
                            ? "Dhammee"
                            : "Dhiib"}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
