import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const garmentNames: Record<string, string> = { shirt: "Shaati", trousers: "Surwaal" };
const valueNames: Record<string, string> = { chest: "Laabta", body_length: "Dhererka shaati", shoulder: "Garabka", sleeve_length: "Gacanta", neck: "Qoorta", waist: "Dhexda", hip: "Miskaha", trouser_length: "Dhererka surwaalka", inseam: "Gudaha", thigh: "Bowdada" };

export default async function MeasurementsPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: memberships } = await supabase.from("business_members").select("business_id, role").eq("user_id", claims.sub).eq("status", "active");
  const membership = memberships?.find((item: { business_id: string }) => item.business_id === query.business) ?? memberships?.[0];
  if (!membership || membership.role !== "business_admin") return <main className="mx-auto mt-16 max-w-xl rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Gelitaan lama oggola</h1><Link href="/dashboard" className="mt-4 inline-block text-[#0F6B7A]">Dashboard</Link></main>;
  const [{ data: business }, { data: measurements, error }] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", membership.business_id).maybeSingle(),
    supabase.from("measurements").select("id, customer_id, garment, category_label, values_cm, created_at, created_by").eq("business_id", membership.business_id).order("created_at", { ascending: false }).limit(100),
  ]);
  const customerIds = [...new Set((measurements ?? []).map((m: { customer_id: string }) => m.customer_id))];
  const authorIds = [...new Set((measurements ?? []).map((m: { created_by: string }) => m.created_by))];
  const [{ data: customers }, { data: authors }] = await Promise.all([
    customerIds.length ? supabase.from("customers").select("id, name").in("id", customerIds) : Promise.resolve({ data: [] }),
    authorIds.length ? supabase.from("profiles").select("user_id, display_name").in("user_id", authorIds) : Promise.resolve({ data: [] }),
  ]);
  const customerMap = new Map((customers ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
  const authorMap = new Map((authors ?? []).map((a: { user_id: string; display_name: string | null }) => [a.user_id, a.display_name ?? "Xubin"]));
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-7 sm:px-8"><Link href={`/dashboard?business=${membership.business_id}`} className="text-sm text-[#0F6B7A]">← Dashboard</Link><header className="mt-5"><p className="text-sm text-slate-500">{business?.name}</p><h1 className="text-2xl font-semibold text-[#122E40]">Cabbirrada</h1><p className="mt-2 text-sm text-slate-600">Cabbir kasta waxaa loo hayaa taariikh ahaan; snapshots-ka dalabyadii hore waa gooni.</p></header>
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">{error ? <p role="alert" className="text-sm text-red-700">Cabbirrada lama soo qaadi karin.</p> : !measurements?.length ? <div className="py-12 text-center"><p className="font-medium">Cabbir weli lama diiwaangelin</p><p className="mt-2 text-sm text-slate-500">Ka bilow faahfaahinta macmiilka ama dalab cusub.</p><Link href={`/customers?business=${membership.business_id}`} className="mt-4 inline-block text-sm text-[#0F6B7A]">Tag macaamiisha</Link></div> : <ul className="divide-y divide-slate-100">{measurements.map((m: { id: string; customer_id: string; garment: string; category_label: string | null; values_cm: Record<string, number>; created_at: string; created_by: string }) => <li key={m.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><Link href={`/customers/${m.customer_id}?business=${membership.business_id}`} className="font-medium text-[#0F6B7A]">{customerMap.get(m.customer_id) ?? "Macmiil"}</Link><span className="text-xs text-slate-500">{new Date(m.created_at).toLocaleString("so-SO")} · {authorMap.get(m.created_by) ?? "Xubin"}</span></div><p className="mt-1 text-sm font-medium">{garmentNames[m.garment]} · {m.category_label ?? "Label ma jiro"}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{Object.entries(m.values_cm ?? {}).map(([key, value]) => <span key={key} className="text-xs text-slate-600">{valueNames[key] ?? key}: <b>{value} cm</b></span>)}</div></li>)}</ul>}</section>
  </main>;
}
