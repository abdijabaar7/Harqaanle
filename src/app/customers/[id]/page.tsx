import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { saveMeasurement } from "@/app/customers/actions";
import { CustomerMeasurementForm } from "@/app/components/measurement-form";
import { createClient } from "@/lib/supabase/server";

const garmentNames: Record<string, string> = { shirt: "Shaati", trousers: "Surwaal" };
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

export default async function CustomerDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ business?: string; error?: string; saved?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: memberships } = await supabase.from("business_members").select("business_id, role").eq("user_id", claims.sub).eq("status", "active");
  const membership = memberships?.find((item: { business_id: string }) => item.business_id === query.business) ?? memberships?.[0];
  if (!membership || membership.role !== "business_admin") return <main className="mx-auto mt-16 max-w-xl rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Gelitaan lama oggola</h1><Link className="mt-5 inline-block text-[#0F6B7A]" href="/dashboard">Dashboard</Link></main>;
  const [{ data: customer }, { data: measurements, error }, { data: orders }] = await Promise.all([
    supabase.from("customers").select("id, name, phone, created_at").eq("business_id", membership.business_id).eq("id", id).maybeSingle(),
    supabase.from("measurements").select("id, garment, category_label, values_cm, created_at, created_by").eq("business_id", membership.business_id).eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, status, ordered_at, pickup_at").eq("business_id", membership.business_id).eq("customer_id", id).order("ordered_at", { ascending: false }),
  ]);
  if (!customer) notFound();
  const authorIds = [...new Set((measurements ?? []).map((m: { created_by: string }) => m.created_by))];
  const { data: authors } = authorIds.length ? await supabase.from("profiles").select("user_id, display_name").in("user_id", authorIds) : { data: [] };
  const authorMap = new Map((authors ?? []).map((author: { user_id: string; display_name: string | null }) => [author.user_id, author.display_name ?? author.user_id.slice(0, 8)]));

  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-7 sm:px-8">
    <Link href={`/customers?business=${membership.business_id}`} className="text-sm text-[#0F6B7A]">← Macaamiisha</Link>
    <header className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold text-[#122E40]">{customer.name}</h1><p className="mt-1 text-sm text-slate-500">{customer.phone}</p></div><Link href={`/orders/new?business=${membership.business_id}&customer=${id}`} className="rounded-xl bg-[#0F6B7A] px-4 py-3 text-sm font-semibold text-white">+ Dalab cusub</Link></header>
    {query.saved && <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Cabbirrada waa la kaydiyey; cabbirrada dalabyadii hore isma beddelayaan.</p>}
    {query.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{query.error === "empty" ? "Fadlan geli ugu yaraan hal cabbir oo cm ah." : "Cabbirrada lama kaydin. Hubi qiimayaasha cm."}</p>}
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6"><h2 className="font-semibold text-[#122E40]">Cabbirradii hore</h2>{error ? <p className="mt-5 text-sm text-red-700">Cabbirrada lama soo qaadi karin.</p> : !measurements?.length ? <div className="py-10 text-center"><p className="font-medium">Cabbir hore lama hayo</p><p className="mt-2 text-sm text-slate-500">Geli cabbir cusub ama ku dar dalab.</p></div> : <ul className="mt-4 space-y-4">{measurements.map((measurement: { id: string; garment: string; category_label: string | null; values_cm: Record<string, number>; created_at: string; created_by: string }) => <li key={measurement.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{garmentNames[measurement.garment] ?? measurement.garment}{measurement.category_label ? ` · ${measurement.category_label}` : ""}</p><span className="text-xs text-slate-500">{new Date(measurement.created_at).toLocaleDateString("so-SO")}</span></div><dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{Object.entries(measurement.values_cm ?? {}).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center"><dt className="text-xs font-bold text-slate-500">{keyToLetter[key] ?? key}</dt><dd className="mt-0.5 text-sm font-semibold text-[#122E40]">{value} cm</dd></div>)}</dl><p className="mt-3 text-xs text-slate-400">Geliyey: {authorMap.get(measurement.created_by) ?? "Xubin ganacsi"}</p></li>)}</ul>}</section>
      <div className="space-y-5">
        <CustomerMeasurementForm businessId={membership.business_id} customerId={customer.id} action={saveMeasurement} />
        <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-semibold text-[#122E40]">Dalabyada macmiilkan</h2>{!orders?.length ? <p className="mt-4 text-sm text-slate-500">Dalab ma jiro.</p> : <ul className="mt-3 divide-y">{orders.map((order: { id: string; status: string; pickup_at: string }) => <li key={order.id} className="py-3"><Link href={`/orders/${order.id}?business=${membership.business_id}`} className="flex justify-between gap-2 text-sm"><span>#{order.id.slice(0, 8)} · {order.status}</span><span className="text-slate-500">{order.pickup_at}</span></Link></li>)}</ul>}</section>
      </div>
    </div>
  </main>;
}
