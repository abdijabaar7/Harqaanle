import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createBusinessAndInviteOwner, setBusinessStatus } from "@/app/admin/actions";
import { advanceOrderStatus } from "@/app/orders/actions";
import { createClient } from "@/lib/supabase/server";

type Membership = { business_id: string; role: "business_admin" | "tailor_staff"; status: string };
type Business = { id: string; name: string; status: string };

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Dalab cusub", color: "bg-blue-50 text-blue-800 border-blue-200" },
  fabric_ready: { label: "Marada waa diyaar", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  cutting: { label: "Jarista socota", color: "bg-amber-50 text-amber-800 border-amber-200" },
  sewing: { label: "Tolidda socota", color: "bg-purple-50 text-purple-800 border-purple-200" },
  finished: { label: "Dharku waa diyaar", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  delivered: { label: "Waa la qaatay", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

const garmentNames: Record<string, string> = { shirt: "Shaati", trousers: "Surwaal" };

function shortDate(value: string) {
  try {
    return new Intl.DateTimeFormat("so-SO", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
  } catch {
    return value;
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    business?: string;
    notice?: string;
    error?: string;
    invited?: string;
    "created-business"?: string;
    "status-updated"?: string;
  }>;
}) {
  const query = await searchParams;
  const requestedBusiness = query.business;
  const notice = query.notice;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return (
      <main className="mx-auto mt-20 max-w-xl rounded-2xl bg-white p-8">
        <h1 className="text-2xl font-semibold">Supabase lama habayn</h1>
        <p className="mt-3 text-slate-600">Ku samee faylka <code>.env.local</code> adigoo ka duulaya <code>.env.example</code>.</p>
        <Link href="/login" className="mt-5 inline-block text-[#0F6B7A]">Tag login</Link>
      </main>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("display_name, platform_role").eq("user_id", claims.sub).maybeSingle(),
    supabase.from("business_members").select("business_id, role, status").eq("user_id", claims.sub).eq("status", "active"),
  ]);
  const isSuperAdmin = profile?.platform_role === "super_admin";

  if (isSuperAdmin) {
    const { data: businesses, error } = await supabase
      .from("businesses")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false });

    return (
      <main className="min-h-screen bg-slate-50">
        <header className="flex items-center justify-between bg-[#122E40] px-5 py-4 text-white sm:px-8">
          <div>
            <p className="text-xs tracking-[.18em] text-teal-300">HARQAANLE</p>
            <p className="mt-1 font-bold text-lg">Super Admin Panel</p>
          </div>
          <form action={signOut}>
            <button className="rounded-lg border border-white/30 px-3 py-1.5 text-xs hover:bg-white/10">Ka bax</button>
          </form>
        </header>
        <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <h1 className="text-2xl font-bold text-[#122E40]">Ganacsiyada Nidaamka</h1>
          <p className="mt-1 text-sm text-slate-600">Maamulka ganacsiyada tolidda ee ka diiwaangashan Harqaanle.</p>
          {query["created-business"] && (
            <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900 border border-teal-200">
              Ganacsiga waa la diiwaangeliyey, casuumaadda Business Admin-na waa la diray.
            </p>
          )}
          {query["status-updated"] && (
            <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900 border border-teal-200">
              Xaaladda ganacsiga waa la cusboonaysiiyey.
            </p>
          )}

          <form action={createBusinessAndInviteOwner} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm border border-slate-100 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-medium">
              Magaca ganacsiga
              <input name="name" required minLength={2} maxLength={120} placeholder="Tusaale: Wiilhoog Tailor" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-sm font-medium">
              Email-ka Business Admin-ka
              <input name="email" type="email" required placeholder="admin@example.com" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <button className="rounded-xl bg-[#0F6B7A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0c5763]">
              + Diiwaangeli Ganacsi
            </button>
          </form>

          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
            {error ? (
              <p className="p-5 text-sm text-red-700">Liiska ganacsiyada lama soo qaadi karin.</p>
            ) : businesses?.length ? (
              <ul className="divide-y divide-slate-100">
                {businesses.map((business: Business) => (
                  <li key={business.id} className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-800">{business.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">ID: {business.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${business.status === "active" ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800"}`}>
                        {business.status}
                      </span>
                      {business.status !== "closed" && (
                        <form action={setBusinessStatus}>
                          <input type="hidden" name="business_id" value={business.id} />
                          <input type="hidden" name="status" value={business.status === "active" ? "suspended" : "active"} />
                          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-100">
                            {business.status === "active" ? "Hakiso" : "Dib u hawlgeli"}
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-sm text-slate-600">Ganacsi weli lama diiwaangelin.</p>
            )}
          </div>
        </section>
      </main>
    );
  }

  const activeMemberships = (memberships ?? []) as Membership[];
  if (!activeMemberships.length) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 bg-slate-50">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm text-center">
          <p className="text-sm font-bold tracking-[.18em] text-[#0F6B7A]">HARQAANLE</p>
          <h1 className="mt-4 text-2xl font-bold text-[#122E40]">Ganacsi laguma xidhin</h1>
          <p className="mt-2 text-sm text-slate-600">
            Gelitaankaagu wuu shaqeeyey, laakiin weli ma jiro ganacsi firfircoon oo laguu oggolaaday. La xidhiidh maamulaha ganacsiga.
          </p>
          <form action={signOut} className="mt-6">
            <button className="rounded-xl bg-[#122E40] px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
              Ka bax
            </button>
          </form>
        </section>
      </main>
    );
  }

  const selected = activeMemberships.find((m) => m.business_id === requestedBusiness) ?? activeMemberships[0];
  const { data: business } = await supabase.from("businesses").select("id, name, status").eq("id", selected.business_id).maybeSingle();
  if (!business || business.status !== "active") {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 bg-slate-50">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm text-center">
          <p className="text-sm font-bold tracking-[.18em] text-[#0F6B7A]">HARQAANLE</p>
          <h1 className="mt-4 text-2xl font-bold text-[#122E40]">Ganacsiga lama geli karo</h1>
          <p className="mt-2 text-sm text-slate-600">Ganacsigan hadda ma shaqaynayo.</p>
          <form action={signOut} className="mt-6">
            <button className="rounded-xl bg-[#122E40] px-5 py-2.5 text-sm font-medium text-white">Ka bax</button>
          </form>
        </section>
      </main>
    );
  }

  const isAdmin = selected.role === "business_admin";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  // Load orders for this business
  const [{ data: rawOrders, count }, { count: todayCount }, { count: overdueCount }, financeResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, customer_id, status, pickup_at, assigned_to_user_id, created_at", { count: "exact" })
      .eq("business_id", selected.business_id)
      .neq("status", "delivered")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", selected.business_id)
      .eq("pickup_at", today)
      .neq("status", "delivered"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", selected.business_id)
      .lt("pickup_at", today)
      .neq("status", "delivered"),
    isAdmin ? supabase.rpc("get_business_financial_summary", { target_business: selected.business_id }) : Promise.resolve({ data: [] }),
  ]);

  const orders = rawOrders ?? [];
  const finance = Array.isArray(financeResult.data) ? financeResult.data[0] : null;

  // Enrich orders with customers, items, files and staff names
  const customerIds = [...new Set(orders.map((o) => o.customer_id))];
  const orderIds = orders.map((o) => o.id);
  const assignedStaffIds = [...new Set(orders.map((o) => o.assigned_to_user_id).filter(Boolean))];

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

  // Signed URLs for image thumbnails
  const filesWithUrls = await Promise.all(
    (files ?? []).slice(0, 30).map(async (f) => {
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

  // Count newly created orders
  const newOrdersCount = orders.filter((o) => o.status === "new").length;

  return (
    <main className="min-h-screen bg-slate-50/60 pb-12">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#122E40] px-5 py-3.5 text-white shadow-sm sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 font-extrabold text-white text-base">
            ✂️
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[.2em] text-teal-300">HARQAANLE</p>
            <p className="text-base font-bold leading-tight">{business?.name ?? "Wiilhoog"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-200 sm:inline">
            {isAdmin ? "👔 Mulkiile (Admin)" : "✂️ Toliye (Staff)"}
          </span>
          <form action={signOut}>
            <button className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/15">
              Ka bax
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        {/* Welcome & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isAdmin ? "Guddiga Maamulka" : "Qaybta Tolidda"}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#122E40]">
              {profile?.display_name ? `Salaan, ${profile.display_name}` : "Shaqooyinka Ganacsiga"}
            </h1>
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/customers?business=${selected.business_id}`} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                👥 Macaamiil
              </Link>
              <Link href={`/team?business=${selected.business_id}`} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                ✂️ Staff
              </Link>
              <Link href={`/payments?business=${selected.business_id}`} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                💰 Lacag
              </Link>
              <Link href={`/orders?business=${selected.business_id}`} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                📋 Dalabyada
              </Link>
              <Link href={`/orders/new?business=${selected.business_id}`} className="rounded-xl bg-[#0F6B7A] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0c5763] transition active:scale-95">
                + Dalab cusub
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href={`/orders?business=${selected.business_id}`} className="rounded-xl bg-[#0F6B7A] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0c5763]">
                📋 Dhammaan Dalabyada
              </Link>
            </div>
          )}
        </div>

        {/* NOTICES */}
        {notice === "password-updated" && (
          <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900 border border-teal-200">
            Password-kaaga si guul leh ayaa loo cusboonaysiiyey.
          </p>
        )}
        {notice === "invitation-accepted" && (
          <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900 border border-teal-200">
            Ku soo dhowow! Casuumaaddaadii waa la aqbalay.
          </p>
        )}

        {/* METRICS STATS CARDS */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dalabyo Furan</span>
              <span className="text-xl">🧵</span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#122E40]">{count ?? 0}</p>
            <p className="mt-1 text-[11px] text-slate-400">Shaqooyinka socda</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Qaadasho Maanta</span>
              <span className="text-xl">📅</span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-teal-700">{todayCount ?? 0}</p>
            <p className="mt-1 text-[11px] text-teal-600 font-medium">Ballanta maanta</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dib u Dhacay</span>
              <span className="text-xl">⚠️</span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-600">{overdueCount ?? 0}</p>
            <p className="mt-1 text-[11px] text-amber-600 font-medium">Ka dib dhacay ballanta</p>
          </div>

          {isAdmin ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Hadhaaga Guud</span>
                <span className="text-xl">💵</span>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#122E40]">
                ${Number(finance?.outstanding_balance ?? 0).toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Lacagta dhiman</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cusub Meheradda</span>
                <span className="text-xl">🌟</span>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-blue-600">{newOrdersCount}</p>
              <p className="mt-1 text-[11px] text-blue-500 font-medium">Dalabyo cusub oo yimid</p>
            </div>
          )}
        </div>

        {/* TAILOR STAFF: NEW ORDERS CALLOUT IF ANY */}
        {!isAdmin && newOrdersCount > 0 && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl text-white">
                🔔
              </span>
              <div>
                <h2 className="text-base font-bold text-blue-950">
                  {newOrdersCount} Dalab oo Cusub ayaa soo dhacay!
                </h2>
                <p className="text-xs text-blue-800 mt-0.5">
                  Fadlan fiiri cabbirrada iyo sawirrada hoose si aad hawsha tolidda u bilowdo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ORDER LIST / CARDS */}
        <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#122E40]">
                {isAdmin ? "Dalabyada Meheradda Wiilhoog" : "Dalabyada & Shaqooyinka Tolidda"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Guji dalab kasta si aad u aragto cabbirkii oo faahfaahsan ama sawirrada.
              </p>
            </div>
            <Link
              href={`/orders?business=${selected.business_id}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#0F6B7A] hover:bg-slate-100"
            >
              Dhammaan ({count ?? 0}) →
            </Link>
          </div>

          {!orders.length ? (
            <div className="py-12 text-center">
              <span className="text-4xl">✂️</span>
              <p className="mt-2 font-bold text-slate-700">Weli dalab ma jiro</p>
              <p className="mt-1 text-xs text-slate-400">Guji &ldquo;+ Dalab cusub&rdquo; si aad u bilowdo.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {orders.map((order) => {
                const customer = customerMap.get(order.customer_id);
                const item = itemMap.get(order.id);
                const file = fileMap.get(order.id);
                const statusMeta = statusLabels[order.status] ?? {
                  label: order.status,
                  color: "bg-slate-100 text-slate-700 border-slate-200",
                };
                const assignedName = order.assigned_to_user_id ? staffMap.get(order.assigned_to_user_id) : null;
                const isAssignedToMe = order.assigned_to_user_id === claims.sub;

                return (
                  <div
                    key={order.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#0F6B7A]/60 hover:shadow-md"
                  >
                    <div>
                      {/* Top row: Status and ID */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                        <span className="font-mono text-xs text-slate-400">#{order.id.slice(0, 6)}</span>
                      </div>

                      {/* Customer Name & Phone */}
                      <div className="mt-3">
                        <h3 className="font-bold text-base text-slate-900 leading-tight">
                          {customer?.name ?? "Macmiil"}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{customer?.phone}</p>
                      </div>

                      {/* Middle row: Garment & Photo Thumbnail */}
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-[#122E40]">
                            {item ? garmentNames[item.garment] ?? item.garment : "Dhar"} (x{item?.quantity ?? 1})
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Qaadasho: <strong>{shortDate(order.pickup_at)}</strong>
                          </p>
                        </div>

                        {file?.signedUrl ? (
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <img
                              src={file.signedUrl}
                              alt="Maro"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-300">
                            Sawir la&apos;aan
                          </div>
                        )}
                      </div>

                      {/* Letter Measurements preview */}
                      {item?.measurement_snapshot && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {Object.entries(item.measurement_snapshot).slice(0, 5).map(([key, val]) => (
                            <span
                              key={key}
                              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700"
                            >
                              {key}: {val as number}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Assigned Tailor Badge */}
                      <div className="mt-2.5 text-[11px] text-slate-500">
                        {assignedName ? (
                          <span className={`inline-flex items-center gap-1 font-semibold ${isAssignedToMe ? "text-teal-700" : "text-slate-600"}`}>
                            ✂️ Toliyaha: {assignedName} {isAssignedToMe && "(Adiga)"}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">Baaqi (Qofna looma qoondayn)</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action: View details or advance */}
                    <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                      <Link
                        href={`/orders/${order.id}?business=${selected.business_id}`}
                        className="text-xs font-bold text-[#0F6B7A] hover:underline"
                      >
                        Faahfaahin Buuxda →
                      </Link>

                      {order.status !== "delivered" && (
                        <form action={advanceOrderStatus}>
                          <input type="hidden" name="business_id" value={selected.business_id} />
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
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-900 transition"
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
      </section>
    </main>
  );
}
