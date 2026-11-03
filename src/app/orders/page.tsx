import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const statuses: Record<string, string> = { new: "Dalab cusub", fabric_ready: "Marada waa la diyaariyey", cutting: "Jarista ayaa socota", sewing: "Tolidda ayaa socota", finished: "Dharku waa dhammaaday", delivered: "Macmiilka ayaa la siiyey" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: memberships } = await supabase.from("business_members").select("business_id, role").eq("user_id", claims.sub).eq("status", "active");
  const membership = memberships?.find((item: { business_id: string }) => item.business_id === query.business) ?? memberships?.[0];
  if (!membership) redirect("/dashboard");
  const { data: orders, error } = await supabase.from("orders").select("id, customer_id, status, ordered_at, pickup_at").eq("business_id", membership.business_id).order("pickup_at", { ascending: true }).limit(100);
  const customerIds = [...new Set((orders ?? []).map((o: { customer_id: string }) => o.customer_id))];
  const { data: customers } = customerIds.length ? await supabase.from("customers").select("id, name, phone").in("id", customerIds) : { data: [] };
  const customerMap = new Map((customers ?? []).map((c: { id: string; name: string; phone: string }) => [c.id, c]));
  const { data: business } = await supabase.from("businesses").select("name").eq("id", membership.business_id).maybeSingle();

  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-7 sm:px-8">
    <Link href={`/dashboard?business=${membership.business_id}`} className="text-sm text-[#0F6B7A]">← Dashboard</Link>
    <div className="mt-5 flex items-end justify-between"><div><p className="text-sm text-slate-500">{business?.name}</p><h1 className="text-2xl font-semibold text-[#122E40]">Dalabyada</h1></div>{membership.role === "business_admin" && <Link href={`/orders/new?business=${membership.business_id}`} className="rounded-xl bg-[#0F6B7A] px-4 py-3 text-sm font-semibold text-white">+ Dalab cusub</Link>}</div>
    <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
      {error ? <p className="p-5 text-sm text-red-700">Dalabyada lama soo qaadi karin.</p> : !orders?.length ? <p className="p-10 text-center text-sm text-slate-500">Dalab ma jiro.</p> : <ul className="divide-y divide-slate-100">{orders.map((order: { id: string; customer_id: string; status: string; pickup_at: string }) => { const customer = customerMap.get(order.customer_id); return <li key={order.id}><Link href={`/orders/${order.id}?business=${membership.business_id}`} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-slate-50"><div><p className="font-medium">{customer?.name ?? "Macmiil"} · #{order.id.slice(0, 8)}</p><p className="mt-1 text-sm text-slate-500">Qaadasho: {order.pickup_at}</p></div><span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-900">{statuses[order.status] ?? order.status}</span></Link></li>; })}</ul>}
    </section>
  </main>;
}
