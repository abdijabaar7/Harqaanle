import Link from "next/link";
import { redirect } from "next/navigation";
import { updateBusinessName } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export default async function BusinessSettingsPage({ searchParams }: { searchParams: Promise<{ business?: string; error?: string; saved?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: memberships } = await supabase.from("business_members").select("business_id, role").eq("user_id", claims.sub).eq("status", "active");
  const membership = memberships?.find((item: { business_id: string; role: string }) => item.business_id === query.business) ?? memberships?.[0];
  if (!membership || membership.role !== "business_admin") return <main className="mx-auto mt-16 max-w-xl rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Gelitaan lama oggola</h1><Link href="/dashboard" className="mt-4 inline-block text-[#0F6B7A]">Dashboard</Link></main>;
  const { data: business } = await supabase.from("businesses").select("name, status").eq("id", membership.business_id).maybeSingle();
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-7 sm:px-8"><Link href={`/dashboard?business=${membership.business_id}`} className="text-sm text-[#0F6B7A]">← Dashboard</Link><h1 className="mt-5 text-2xl font-semibold text-[#122E40]">Faahfaahinta ganacsiga</h1><section className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Xaaladda ganacsiga</p><p className="mt-1 font-medium">{business?.status}</p><form action={updateBusinessName} className="mt-5 border-t pt-5"><input type="hidden" name="business_id" value={membership.business_id} /><label className="block text-sm font-medium">Magaca ganacsiga<input name="name" defaultValue={business?.name ?? ""} required minLength={2} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" /></label>{query.saved && <p role="status" className="mt-3 text-sm text-teal-800">Magaca ganacsiga waa la cusboonaysiiyey.</p>}{query.error && <p role="alert" className="mt-3 text-sm text-red-700">Magaca lama kaydin; hubi in uu leeyahay ugu yaraan laba xaraf.</p>}<button className="mt-4 rounded-xl bg-[#0F6B7A] px-4 py-3 text-sm font-semibold text-white">Kaydi magaca</button></form><p className="mt-5 text-xs text-slate-500">Branding/logo ganacsi iyo faahfaahin dheeraad ah dib ayaa loo qeexayaa.</p></section></main>;
}
