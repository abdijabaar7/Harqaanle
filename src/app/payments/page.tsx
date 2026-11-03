import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: memberships } = await supabase.from("business_members").select("business_id, role").eq("user_id", claims.sub).eq("status", "active");
  const membership = memberships?.find((item: { business_id: string }) => item.business_id === query.business) ?? memberships?.[0];
  if (!membership || membership.role !== "business_admin") return <main className="mx-auto mt-16 max-w-xl rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Gelitaan lama oggola</h1><p className="mt-2 text-sm text-slate-600">Maamulka lacagta waxaa heli kara Business Admin-ka.</p><Link href="/dashboard" className="mt-4 inline-block text-[#0F6B7A]">Dashboard</Link></main>;
  const [{ data: business }, { data: payments, error }, { data: summary }] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", membership.business_id).maybeSingle(),
    supabase.from("payments").select("id, order_id, amount, paid_at, method, reference").eq("business_id", membership.business_id).order("paid_at", { ascending: false }).limit(200),
    supabase.rpc("get_business_financial_summary", { target_business: membership.business_id }),
  ]);
  const orderIds = [...new Set((payments ?? []).map((p: { order_id: string }) => p.order_id))];
  const { data: orders } = orderIds.length ? await supabase.from("orders").select("id, customer_id").eq("business_id", membership.business_id).in("id", orderIds) : { data: [] };
  const customerIds = [...new Set((orders ?? []).map((o: { customer_id: string }) => o.customer_id))];
  const { data: customers } = customerIds.length ? await supabase.from("customers").select("id, name").in("id", customerIds) : { data: [] };
  const orderMap = new Map((orders ?? []).map((o: { id: string; customer_id: string }) => [o.id, o.customer_id]));
  const customerMap = new Map((customers ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
  const finance = summary?.[0];
  const totalValue = Number(finance?.total_value ?? 0);
  const collected = Number(finance?.paid_amount ?? 0);
  const outstanding = Number(finance?.outstanding_balance ?? 0);
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-7 sm:px-8"><Link href={`/dashboard?business=${membership.business_id}`} className="text-sm text-[#0F6B7A]">← Dashboard</Link><header className="mt-5"><p className="text-sm text-slate-500">{business?.name}</p><h1 className="text-2xl font-semibold text-[#122E40]">Lacag-bixinnada</h1></header>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Wadarta qiimaha</p><p className="mt-2 text-2xl font-semibold">{money.format(totalValue)}</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">La ururiyey</p><p className="mt-2 text-2xl font-semibold">{money.format(collected)}</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Hadhaaga dhammaan dalabyada</p><p className="mt-2 text-2xl font-semibold">{money.format(outstanding)}</p></article></div>
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-semibold text-[#122E40]">Diiwaanka lacagaha</h2>{error ? <p className="mt-4 text-sm text-red-700">Diiwaanka lama soo qaadi karin.</p> : !payments?.length ? <div className="py-12 text-center"><p className="font-medium">Lacag-bixin weli lama hayo</p><p className="mt-2 text-sm text-slate-500">Lacagaha waxaa laga diiwaangeliyaa faahfaahinta dalabka.</p></div> : <ul className="mt-4 divide-y divide-slate-100">{payments.map((payment: { id: string; order_id: string; amount: number; paid_at: string; method: string | null; reference: string | null }) => { const customerId = orderMap.get(payment.order_id); return <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><Link href={`/orders/${payment.order_id}?business=${membership.business_id}`} className="font-medium text-[#0F6B7A]">{customerMap.get(customerId ?? "") ?? "Dalab"} · #{payment.order_id.slice(0, 8)}</Link><p className="mt-1 text-xs text-slate-500">{new Date(payment.paid_at).toLocaleString("so-SO")}{payment.method ? ` · ${payment.method}` : ""}{payment.reference ? ` · ${payment.reference}` : ""}</p></div><p className="font-semibold">{money.format(Number(payment.amount))}</p></li>; })}</ul>}</section>
  </main>;
}
