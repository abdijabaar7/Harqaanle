import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { advanceOrderStatus, recordPayment } from "@/app/orders/actions";
import { assignStaffToOrder } from "@/app/admin/actions";
import { FileUpload } from "@/app/orders/[id]/file-upload";
import { createClient } from "@/lib/supabase/server";

const steps = ["new", "fabric_ready", "cutting", "sewing", "finished", "delivered"] as const;
const labels: Record<string, string> = { new: "Dalab cusub", fabric_ready: "Marada waa la diyaariyey", cutting: "Jarista ayaa socota", sewing: "Tolidda ayaa socota", finished: "Dharku waa dhammaaday", delivered: "Macmiilka ayaa la siiyey" };
const garmentLabels: Record<string, string> = { shirt: "Shaati", trousers: "Surwaal" };
const measureLabels: Record<string, string> = { chest: "Laabta", body_length: "Dhererka shaati", shoulder: "Garabka", sleeve_length: "Gacanta", neck: "Qoorta", waist: "Dhexda", hip: "Miskaha", trouser_length: "Dhererka surwaalka", inseam: "Gudaha", thigh: "Bowdada" };
const keyToLetter: Record<string, string> = {
  shoulder: "S",
  body_length: "M",
  chest: "L",
  sleeve_length: "B",
  neck: "K",
  waist: "B",
  trouser_length: "L",
  hip: "C",
  thigh: "T",
  inseam: "K",
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ business?: string; error?: string; created?: string; updated?: string; paid?: string; assigned?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: memberships } = await supabase.from("business_members").select("business_id, role").eq("user_id", claims.sub).eq("status", "active");
  const membership = memberships?.find((item: { business_id: string; role: string }) => item.business_id === query.business) ?? memberships?.[0];
  if (!membership) redirect("/dashboard");
  const { data: order, error: orderError } = await supabase.from("orders").select("id, business_id, customer_id, status, ordered_at, pickup_at, created_at, assigned_to_user_id").eq("id", id).eq("business_id", membership.business_id).maybeSingle();
  if (orderError || !order) notFound();
  const isAdmin = membership.role === "business_admin";
  const [{ data: customer }, { data: items }, { data: history }, { data: files }, { data: business }] = await Promise.all([
    supabase.from("customers").select("id, name, phone").eq("id", order.customer_id).maybeSingle(),
    supabase.from("order_items").select("id, garment, quantity, unit_price, measurement_snapshot, category_label_snapshot").eq("business_id", order.business_id).eq("order_id", id),
    supabase.from("order_status_history").select("from_status, to_status, occurred_at, actor_user_id, reason").eq("business_id", order.business_id).eq("order_id", id).order("occurred_at"),
    supabase.from("order_files").select("id, object_path, kind, upload_state, created_at").eq("business_id", order.business_id).eq("order_id", id).eq("upload_state", "uploaded").order("created_at", { ascending: false }),
    supabase.from("businesses").select("name").eq("id", order.business_id).maybeSingle(),
  ]);
  const [{ data: staffMembers }, paymentsResult] = await Promise.all([
    isAdmin ? supabase.from("business_members").select("user_id").eq("business_id", order.business_id).eq("role", "tailor_staff").eq("status", "active") : Promise.resolve({ data: [] }),
    isAdmin ? supabase.from("payments").select("id, amount, paid_at, method, reference").eq("business_id", order.business_id).eq("order_id", id).order("paid_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const { data: staffProfiles } = staffMembers?.length ? await supabase.from("profiles").select("user_id, display_name").in("user_id", staffMembers.map((m: { user_id: string }) => m.user_id)) : { data: [] };
  const staffNames = new Map((staffProfiles ?? []).map((p: { user_id: string; display_name: string | null }) => [p.user_id, p.display_name ?? p.user_id.slice(0, 8)]));
  const payments = paymentsResult.data ?? [];
  const total = (items ?? []).reduce((sum: number, item: { quantity: number; unit_price: number | string }) => sum + Number(item.quantity) * Number(item.unit_price), 0);
  const paid = payments.reduce((sum: number, payment: { amount: number | string }) => sum + Number(payment.amount), 0);
  const nextIndex = steps.indexOf(order.status as (typeof steps)[number]) + 1;
  const nextStatus = steps[nextIndex];
  const statusOrder = history ?? [];
  const images = await Promise.all((files ?? []).map(async (file: { id: string; object_path: string; kind: string; created_at: string }) => {
    const { data } = await supabase.storage.from("order-files").createSignedUrl(file.object_path, 900);
    return { ...file, signedUrl: data?.signedUrl };
  }));

  const rawPhone = customer?.phone?.replace(/\D/g, "") ?? "";
  const phoneFormatted = rawPhone.startsWith("252")
    ? rawPhone
    : rawPhone.startsWith("0")
    ? `252${rawPhone.slice(1)}`
    : rawPhone.length === 9
    ? `252${rawPhone}`
    : rawPhone;

  const remaining = Math.max(0, total - paid);
  const businessName = business?.name ?? "Harqaanle";
  const isFinished = order.status === "finished";

  const whatsappMessage = isFinished
    ? `Asc ${customer?.name ?? "Macmiil"}, dharkaagii dalabka #${order.id.slice(0, 8)} ee ganacsiga ${businessName} waa diyaar, waadna qaadan kartaa. Hadhaagaaga dhiman waa $${remaining.toFixed(2)}. Mahadsanid!`
    : `Asc ${customer?.name ?? "Macmiil"}, dalabkaagii #${order.id.slice(0, 8)} ee ${businessName} xaaladdiisu hadda waa "${labels[order.status] ?? order.status}". Qaadashadu waa ${order.pickup_at}. Hadhaagaagu waa $${remaining.toFixed(2)}. Mahadsanid!`;

  const whatsappUrl = phoneFormatted
    ? `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
    <Link href={`/orders?business=${order.business_id}`} className="text-sm text-[#0F6B7A]">← Dalabyada</Link>
    <header className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-[#122E40] p-5 text-white sm:p-7">
      <div>
        <p className="text-sm text-white/60">Dalab #{order.id.slice(0, 8)}</p>
        <h1 className="mt-2 text-2xl font-semibold">{customer?.name ?? "Macmiil"}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <span className="text-sm text-white/70">{customer?.phone}</span>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1 text-xs font-bold text-slate-950 transition hover:bg-[#20ba59] active:scale-95"
            >
              💬 WhatsApp
            </a>
          )}
        </div>
      </div>
      <div className="text-left sm:text-right">
        <p className="text-xs text-white/60">Xaaladda hadda</p>
        <p className="mt-1 font-semibold">{labels[order.status] ?? order.status}</p>
        <p className="mt-3 text-sm text-white/70">Qaadasho: {order.pickup_at}</p>
      </div>
    </header>

    {isFinished && (
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-2xl font-bold text-white shadow">
            ✓
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-950">Dharku waa diyaarsan yihiin!</h3>
            <p className="text-xs font-medium text-emerald-800 mt-0.5">
              Macmiilka toos ugu dir fariin WhatsApp ah si uu dharkiisa u yimaado.
            </p>
          </div>
        </div>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-slate-950 shadow transition hover:bg-[#20ba59] active:scale-95"
          >
            💬 U dir WhatsApp Macmiilka
          </a>
        )}
      </div>
    )}

    {(query.created || query.updated || query.paid || query.assigned) && <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{query.created ? "Dalabka waa la sameeyey." : query.paid ? "Lacag-bixinta waa la diiwaangeliyey." : query.assigned ? "Staff-ka waa loo qoondeeyey dalabka." : "Xaaladda waa la cusboonaysiiyey."}</p>}
    {query.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{query.error === "status" ? "Xaaladda lama beddeli karin. Hubi inaad shaqadan maamuli karto." : query.error === "assignment" ? "Staff-ka lama qoondeyn. Hubi inuu xubin firfircoon yahay." : "Lacag-bixinta lama kaydin; hubi qadarka hadhay."}</p>}
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-[#122E40]">Horumarka tolidda</h2>
          <ol className="mt-5 space-y-3">{steps.map((status, index) => { const currentIndex = steps.indexOf(order.status as (typeof steps)[number]); const active = index === currentIndex; const done = index < currentIndex; return <li key={status} className="flex items-center gap-3"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${done || active ? "bg-[#0F6B7A] text-white" : "bg-slate-100 text-slate-500"}`}>{done ? "✓" : index + 1}</span><span className={active ? "font-semibold text-[#122E40]" : "text-slate-600"}>{labels[status]}</span></li>; })}</ol>
          {nextStatus && <form action={advanceOrderStatus} className="mt-5"><input type="hidden" name="business_id" value={order.business_id} /><input type="hidden" name="order_id" value={id} /><input type="hidden" name="next_status" value={nextStatus} /><button className="w-full rounded-xl bg-[#0F6B7A] px-4 py-3 font-semibold text-white">U gudbi: {labels[nextStatus]}</button></form>}
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-[#122E40]">Cabbirrada dalabka (snapshot)</h2>
          <div className="mt-4 space-y-4">{(items ?? []).map((item: { id: string; garment: string; quantity: number; category_label_snapshot: string | null; measurement_snapshot: Record<string, number>; unit_price: number }) => <article key={item.id} className="rounded-xl border border-slate-100 p-4"><div className="flex justify-between"><p className="font-medium">{garmentLabels[item.garment] ?? item.garment}{item.category_label_snapshot ? ` · ${item.category_label_snapshot}` : ""}</p><span className="text-sm text-slate-500">Tiro: {item.quantity}</span></div><dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{Object.entries(item.measurement_snapshot ?? {}).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center"><dt className="text-xs font-bold text-slate-500">{keyToLetter[key] ?? key}</dt><dd className="mt-0.5 text-base font-semibold text-[#122E40]">{value} cm</dd></div>)}</dl></article>)}</div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-[#122E40]">Sawirrada marada iyo naqshadda</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.filter((image): image is typeof image & { signedUrl: string } => Boolean(image.signedUrl)).map((image) => <a key={image.id} href={image.signedUrl} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-slate-100"><img src={image.signedUrl} alt={image.kind === "fabric" ? "Sawirka marada" : "Sawirka naqshadda"} className="aspect-square w-full object-cover" /><span className="block p-2 text-xs">{image.kind === "fabric" ? "Maro" : "Naqshad"}</span></a>)}</div>
          {isAdmin && <FileUpload businessId={order.business_id} orderId={id} userId={claims.sub} />}
          {!isAdmin && !images.length && <p className="mt-4 text-sm text-slate-500">Sawir loo oggolaaday wali ma jiro.</p>}
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-[#122E40]">Taariikhda xaaladaha</h2>
          <ol className="mt-4 space-y-4">{statusOrder.map((entry: { to_status: string; occurred_at: string; actor_user_id: string }) => <li key={`${entry.to_status}-${entry.occurred_at}`} className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#0F6B7A]" /><div><p className="text-sm font-medium">{labels[entry.to_status] ?? entry.to_status}</p><p className="mt-1 text-xs text-slate-500">{new Date(entry.occurred_at).toLocaleString("so-SO")} · user {entry.actor_user_id.slice(0, 8)}</p></div></li>)}</ol>
        </section>
      </div>
      <aside className="space-y-5">
        {isAdmin && <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-semibold text-[#122E40]">Lacag-bixinta</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Wadarta</dt><dd className="font-semibold">{currency.format(total)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">La bixiyey</dt><dd className="font-semibold">{currency.format(paid)}</dd></div><div className="flex justify-between border-t pt-3"><dt className="font-medium">Hadhaaga</dt><dd className="font-semibold text-[#0F6B7A]">{currency.format(Math.max(0, total - paid))}</dd></div></dl>
          {total > paid && <form action={recordPayment} className="mt-5 space-y-3 border-t pt-4"><input type="hidden" name="business_id" value={order.business_id} /><input type="hidden" name="order_id" value={id} /><label className="block text-sm font-medium">Lacag cusub (USD)<input name="amount" type="number" min="0.01" max={(total - paid).toFixed(2)} step="0.01" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="block text-sm font-medium">Habka lacagta (ikhtiyaari)<input name="method" maxLength={40} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="block text-sm font-medium">Tixraac (ikhtiyaari)<input name="reference" maxLength={100} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><button className="w-full rounded-lg bg-[#122E40] px-3 py-3 text-sm font-semibold text-white">Diiwaangeli lacag</button></form>}
          {payments.length > 0 && <div className="mt-5 border-t pt-4"><p className="text-sm font-medium">Diiwaanka</p><ul className="mt-2 space-y-2">{payments.map((payment: { id: string; amount: number; paid_at: string; method: string | null }) => <li key={payment.id} className="flex justify-between gap-3 text-xs"><span className="text-slate-500">{new Date(payment.paid_at).toLocaleDateString("so-SO")} {payment.method ? `· ${payment.method}` : ""}</span><span className="font-medium">{currency.format(Number(payment.amount))}</span></li>)}</ul></div>}
        </section>}
        {isAdmin && <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-semibold text-[#122E40]">Shaqada u qoondee</h2><form action={assignStaffToOrder} className="mt-4"><input type="hidden" name="business_id" value={order.business_id} /><input type="hidden" name="order_id" value={id} /><label className="block text-sm font-medium">Tailor Staff<select name="staff_id" defaultValue={order.assigned_to_user_id ?? ""} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Aan loo qoondeyn</option>{(staffMembers ?? []).map((member: { user_id: string }) => <option key={member.user_id} value={member.user_id}>{staffNames.get(member.user_id) ?? member.user_id.slice(0, 8)}</option>)}</select></label><button className="mt-3 w-full rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-medium">Kaydi assignment</button></form></section>}
        <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-semibold text-[#122E40]">Taariikhaha</h2><p className="mt-3 text-sm text-slate-500">Dalab la sameeyey</p><p className="font-medium">{order.ordered_at}</p><p className="mt-3 text-sm text-slate-500">Qaado ugu dambayn</p><p className="font-medium">{order.pickup_at}</p></section>
      </aside>
    </div>
  </main>;
}
